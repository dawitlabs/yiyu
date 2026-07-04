// Package livechat fans out chat messages to everyone watching the same
// live stream. In-memory only — live_streams has no cleanup lifecycle to
// hook persistence into (rows are permanent, only status toggles), so
// there's no existing hook to also expire stored chat history against.
// Messages are lost on server restart or once every viewer disconnects;
// add a table + backfill-on-connect later if replay/moderation is needed.
package livechat

import (
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Message struct {
	Username string `json:"username"`
	Content  string `json:"content"`
	SentAt   string `json:"sent_at"`
}

// Hub tracks connected clients per live stream.
// ponytail: one global mutex across all streams — fine at this scale, move
// to per-stream locks if concurrent chat volume ever becomes a bottleneck.
type Hub struct {
	mu      sync.Mutex
	clients map[uuid.UUID]map[*websocket.Conn]bool
}

func NewHub() *Hub {
	return &Hub{clients: make(map[uuid.UUID]map[*websocket.Conn]bool)}
}

func (h *Hub) Join(streamID uuid.UUID, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.clients[streamID] == nil {
		h.clients[streamID] = make(map[*websocket.Conn]bool)
	}
	h.clients[streamID][conn] = true
}

func (h *Hub) Leave(streamID uuid.UUID, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients[streamID], conn)
	if len(h.clients[streamID]) == 0 {
		delete(h.clients, streamID)
	}
}

// Broadcast writes to every connection outside the lock — WriteJSON can
// block on a slow client, and holding the mutex through that would stall
// Join/Leave for every other stream too.
func (h *Hub) Broadcast(streamID uuid.UUID, msg Message) {
	h.mu.Lock()
	conns := make([]*websocket.Conn, 0, len(h.clients[streamID]))
	for c := range h.clients[streamID] {
		conns = append(conns, c)
	}
	h.mu.Unlock()

	for _, c := range conns {
		// Best-effort fan-out: a write failure just means this connection
		// is going away — its own read loop will notice and call Leave.
		_ = c.WriteJSON(msg)
	}
}
