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
	storage *storage.Client
}

func NewUploadHandler(storage *storage.Client) *UploadHandler {
	return &UploadHandler{storage: storage}
}

type presignUploadRequest struct {
	Filename string `json:"filename"`
}

type presignUploadResponse struct {
	UploadURL string `json:"upload_url"`
	PublicURL string `json:"public_url"`
}

func (h *UploadHandler) PresignUpload(w http.ResponseWriter, r *http.Request) {
	var req presignUploadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	user, _ := UserFromContext(r.Context())

	ext := safeExt.ReplaceAllString(filepath.Ext(req.Filename), "")
	if ext != "" {
		ext = "." + ext
	}
	key := "videos/" + user.ID.String() + "/" + uuid.NewString() + ext

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
