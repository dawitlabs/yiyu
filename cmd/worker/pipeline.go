package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/dawitlabs/yiyu/internal/pkg/storage"
	"github.com/jackc/pgx/v5/pgtype"
)

// transcode downloads a video's original file, extracts its duration,
// generates a thumbnail if one wasn't already provided, produces a single
// -rendition HLS stream, uploads everything, and marks the video ready.
//
// Only one HLS rendition (single quality) — real adaptive bitrate needs
// multiple encodes plus a master playlist. Add that when a slow connection
// or a 4K upload actually makes it worth the extra encode time.
func transcode(ctx context.Context, repo *repository.PostgresRepository, store *storage.Client, video repository.Video) error {
	workDir, err := os.MkdirTemp("", "yiyu-transcode-*")
	if err != nil {
		return fmt.Errorf("create temp dir: %w", err)
	}
	defer os.RemoveAll(workDir)

	originalPath := filepath.Join(workDir, "original")
	if err := downloadFile(ctx, video.OriginalUrl.String, originalPath); err != nil {
		return fmt.Errorf("download original: %w", err)
	}

	duration, err := probeDuration(ctx, originalPath)
	if err != nil {
		return fmt.Errorf("probe duration: %w", err)
	}

	var thumbnailURL string
	if !video.ThumbnailUrl.Valid || video.ThumbnailUrl.String == "" {
		thumbPath := filepath.Join(workDir, "thumbnail.jpg")
		if err := generateThumbnail(ctx, originalPath, thumbPath); err != nil {
			return fmt.Errorf("generate thumbnail: %w", err)
		}
		thumbFile, err := os.Open(thumbPath)
		if err != nil {
			return fmt.Errorf("open thumbnail: %w", err)
		}
		info, err := thumbFile.Stat()
		if err != nil {
			thumbFile.Close()
			return fmt.Errorf("stat thumbnail: %w", err)
		}
		thumbnailURL, err = store.Upload(ctx, fmt.Sprintf("videos/%s/thumbnail.jpg", video.ID), thumbFile, info.Size(), "image/jpeg")
		thumbFile.Close()
		if err != nil {
			return fmt.Errorf("upload thumbnail: %w", err)
		}
	}

	hlsDir := filepath.Join(workDir, "hls")
	if err := os.Mkdir(hlsDir, 0o755); err != nil {
		return fmt.Errorf("create hls dir: %w", err)
	}
	if err := generateHLS(ctx, originalPath, hlsDir); err != nil {
		return fmt.Errorf("generate hls: %w", err)
	}

	playlistURL, err := uploadDir(ctx, store, hlsDir, fmt.Sprintf("videos/%s/hls", video.ID))
	if err != nil {
		return fmt.Errorf("upload hls: %w", err)
	}

	_, err = repo.CompleteVideoProcessing(ctx, repository.CompleteVideoProcessingParams{
		ID:             video.ID,
		HlsPlaylistUrl: pgtype.Text{String: playlistURL, Valid: true},
		ThumbnailUrl:   pgtype.Text{String: thumbnailURL, Valid: thumbnailURL != ""},
		Duration:       pgtype.Int4{Int32: int32(duration), Valid: true},
	})
	if err != nil {
		return fmt.Errorf("complete video processing: %w", err)
	}

	return nil
}

func downloadFile(ctx context.Context, url, destPath string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	out, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	return err
}

func runFFmpeg(ctx context.Context, args ...string) error {
	cmd := exec.CommandContext(ctx, "ffmpeg", args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("%w: %s", err, stderr.String())
	}
	return nil
}

func probeDuration(ctx context.Context, path string) (int, error) {
	cmd := exec.CommandContext(ctx, "ffprobe",
		"-v", "error",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		path,
	)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return 0, fmt.Errorf("%w: %s", err, stderr.String())
	}

	seconds, err := strconv.ParseFloat(strings.TrimSpace(stdout.String()), 64)
	if err != nil {
		return 0, fmt.Errorf("parse duration %q: %w", stdout.String(), err)
	}
	return int(seconds), nil
}

func generateThumbnail(ctx context.Context, inputPath, outputPath string) error {
	return runFFmpeg(ctx,
		"-y",
		"-i", inputPath,
		"-ss", "00:00:01",
		"-vframes", "1",
		outputPath,
	)
}

func generateHLS(ctx context.Context, inputPath, outputDir string) error {
	return runFFmpeg(ctx,
		"-y",
		"-i", inputPath,
		"-c:v", "libx264", "-c:a", "aac",
		"-vf", "scale=-2:720",
		"-hls_time", "6",
		"-hls_playlist_type", "vod",
		"-hls_segment_filename", filepath.Join(outputDir, "segment%03d.ts"),
		filepath.Join(outputDir, "playlist.m3u8"),
	)
}

// uploadDir uploads every file in dir and returns the public URL of
// playlist.m3u8. Segments must be uploaded before the playlist so nothing
// can reference a file that doesn't exist yet.
func uploadDir(ctx context.Context, store *storage.Client, dir, keyPrefix string) (string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return "", err
	}

	var segmentNames, playlistName []string
	for _, e := range entries {
		if e.Name() == "playlist.m3u8" {
			playlistName = append(playlistName, e.Name())
			continue
		}
		segmentNames = append(segmentNames, e.Name())
	}
	names := append(segmentNames, playlistName...)

	var playlistURL string
	for _, name := range names {
		path := filepath.Join(dir, name)
		f, err := os.Open(path)
		if err != nil {
			return "", err
		}
		info, err := f.Stat()
		if err != nil {
			f.Close()
			return "", err
		}

		contentType := "video/mp2t"
		if strings.HasSuffix(name, ".m3u8") {
			contentType = "application/vnd.apple.mpegurl"
		}

		url, err := store.Upload(ctx, keyPrefix+"/"+name, f, info.Size(), contentType)
		f.Close()
		if err != nil {
			return "", err
		}
		if name == "playlist.m3u8" {
			playlistURL = url
		}
	}

	if playlistURL == "" {
		return "", fmt.Errorf("playlist.m3u8 not found in %s", dir)
	}
	return playlistURL, nil
}
