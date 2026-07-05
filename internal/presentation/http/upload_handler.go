package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"path/filepath"
	"regexp"
	"time"

	"github.com/dawitlabs/yiyu/internal/pkg/storage"
	"github.com/google/uuid"
)

const presignExpiry = 15 * time.Minute

// safeExt keeps only alphanumeric characters after the dot, dropping
// anything else — the extension comes from a client-supplied filename, and
// nothing about it should ever reach a filesystem/URL path unescaped.
var safeExt = regexp.MustCompile(`[^a-zA-Z0-9]`)

type UploadHandler struct {
	storage     *storage.Client
	userLimiter *ipRateLimiter
}

func NewUploadHandler(storage *storage.Client) *UploadHandler {
	// ponytail: reusing ipRateLimiter keyed by user ID — 10 uploads/hour, burst 5
	return &UploadHandler{storage: storage, userLimiter: newIPRateLimiter(10, 5)}
}

var allowedFolders = map[string]bool{
	"videos":     true,
	"avatars":    true,
	"banners":    true,
	"thumbnails": true,
	"images":     true,
}

const maxUploadBytes = 2 << 30 // 2 GB

var folderSizeLimit = map[string]int64{
	"videos":     maxUploadBytes,
	"avatars":    10 << 20, // 10 MB
	"banners":    10 << 20,
	"thumbnails": 10 << 20,
	"images":     10 << 20,
}

type presignUploadRequest struct {
	Filename string `json:"filename"`
	Folder   string `json:"folder"`
	Size     int64  `json:"size"`
}

type presignUploadResponse struct {
	UploadURL string `json:"upload_url"`
	PublicURL string `json:"public_url"`
}

func (h *UploadHandler) PresignUpload(w http.ResponseWriter, r *http.Request) {
	user, _ := UserFromContext(r.Context())
	if !h.userLimiter.allow(user.ID.String()) {
		http.Error(w, "upload limit exceeded", http.StatusTooManyRequests)
		return
	}

	var req presignUploadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	folder := req.Folder
	if folder == "" {
		folder = "videos"
	}
	if !allowedFolders[folder] {
		http.Error(w, "invalid folder", http.StatusBadRequest)
		return
	}

	if req.Size > 0 {
		if limit, ok := folderSizeLimit[folder]; ok && req.Size > limit {
			http.Error(w, "file too large", http.StatusRequestEntityTooLarge)
			return
		}
	}

	ext := safeExt.ReplaceAllString(filepath.Ext(req.Filename), "")
	if ext != "" {
		ext = "." + ext
	}
	key := folder + "/" + user.ID.String() + "/" + uuid.NewString() + ext

	uploadURL, publicURL, err := h.storage.PresignUpload(r.Context(), key, presignExpiry)
	if err != nil {
		slog.Error("presign upload", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, presignUploadResponse{
		UploadURL: uploadURL,
		PublicURL: publicURL,
	})
}
