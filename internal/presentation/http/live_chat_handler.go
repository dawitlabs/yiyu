package httpapi

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/dawitlabs/yiyu/internal/application/livechat"
	"github.com/dawitlabs/yiyu/internal/ports"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgtype"
)

type liveChatRepository interface {
	ports.ChannelRepository
	ports.LiveStreamRepository
}

// LiveChatHandler upgrades a viewer's connection to a WebSocket and joins
// them to the chat hub for that channel's current live stream. No history
// on connect and no persistence — see internal/application/livechat.
type LiveChatHandler struct {
	repo     liveChatRepository
	hub      *livechat.Hub
	upgrader websocket.Upgrader
}

func NewLiveChatHandler(repo liveChatRepository, hub *livechat.Hub) *LiveChatHandler {
	return &LiveChatHandler{
		repo: repo,
		hub:  hub,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			// The frontend connects directly to this API's origin (not
			// through Next.js's rewrite proxy — that doesn't reliably
			// forward WebSocket upgrades), so Origin legitimately differs
			// from this server's own host in dev. Tighten this to an
			// allowlist of known frontend origins before this is public.
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

type incomingChatMessage struct {
	Content string `json:"content"`
}

// Join is registered behind RequireAuth — only signed-in viewers can open
// the socket at all. No anonymous read-only chat viewing yet.
func (h *LiveChatHandler) Join(w http.ResponseWriter, r *http.Request) {
	channel, err := h.repo.GetChannelByHandle(r.Context(), r.PathValue("handle"))
	if err != nil {
		http.Error(w, "channel not found", http.StatusNotFound)
		return
	}

	stream, err := h.repo.GetLiveStreamByChannelID(r.Context(), pgtype.UUID{Bytes: channel.ID, Valid: true})
	if err != nil || stream.Status != "live" {
		http.Error(w, "channel is not live", http.StatusNotFound)
		return
	}

	user, _ := UserFromContext(r.Context())

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("upgrade live chat connection", "error", err)
		return
	}
	defer conn.Close()

	h.hub.Join(stream.ID, conn)
	defer h.hub.Leave(stream.ID, conn)

	for {
		var incoming incomingChatMessage
		if err := conn.ReadJSON(&incoming); err != nil {
			return // client disconnected or sent garbage — either way, stop
		}
		if incoming.Content == "" || len(incoming.Content) > 500 {
			continue
		}
		h.hub.Broadcast(stream.ID, livechat.Message{
			Username: user.Username,
			Content:  incoming.Content,
			SentAt:   time.Now().UTC().Format(time.RFC3339),
		})
	}
}
