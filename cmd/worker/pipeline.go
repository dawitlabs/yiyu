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
// generates a thumbnail if one wasn't already provided, produces an
// adaptive-bitrate HLS ladder (one rendition per size, capped by the
// source's own resolution so nothing gets upscaled), uploads everything,
// and marks the video ready.
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

	sourceWidth, sourceHeight, err := probeDimensions(ctx, originalPath)
	if err != nil {
		return fmt.Errorf("probe resolution: %w", err)
	}

	hlsDir := filepath.Join(workDir, "hls")
	if err := os.Mkdir(hlsDir, 0o755); err != nil {
		return fmt.Errorf("create hls dir: %w", err)
	}
	if err := generateHLSLadder(ctx, originalPath, hlsDir, sourceWidth, sourceHeight); err != nil {
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

// probeDimensions returns the source video's width and height, used to pick
// which renditions to encode and to report each one's real aspect ratio in
// the master playlist (source isn't always 16:9).
func probeDimensions(ctx context.Context, path string) (width, height int, err error) {
	cmd := exec.CommandContext(ctx, "ffprobe",
		"-v", "error",
		"-select_streams", "v:0",
		"-show_entries", "stream=width,height",
		"-of", "csv=s=x:p=0",
		path,
	)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return 0, 0, fmt.Errorf("%w: %s", err, stderr.String())
	}

	parts := strings.SplitN(strings.TrimSpace(stdout.String()), "x", 2)
	if len(parts) != 2 {
		return 0, 0, fmt.Errorf("parse dimensions %q", stdout.String())
	}
	width, err = strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0, fmt.Errorf("parse width %q: %w", parts[0], err)
	}
	height, err = strconv.Atoi(parts[1])
	if err != nil {
		return 0, 0, fmt.Errorf("parse height %q: %w", parts[1], err)
	}
	return width, height, nil
}

type rendition struct {
	name      string // subdirectory name, also used as the resolution label
	height    int
	bandwidth int // bits/sec, for the master playlist's BANDWIDTH attribute
}

// renditionLadder is the full set of sizes worth encoding, largest first.
// Anything taller than the source is dropped — no upscaling.
var renditionLadder = []rendition{
	{name: "1080p", height: 1080, bandwidth: 5_000_000},
	{name: "720p", height: 720, bandwidth: 2_800_000},
	{name: "480p", height: 480, bandwidth: 1_400_000},
}

// renditionsFor picks every rung at or below the source height, plus the
// smallest rung as a floor for tiny source videos (e.g. a 360p upload still
// gets one playable rendition rather than zero).
func renditionsFor(sourceHeight int) []rendition {
	var picked []rendition
	for _, r := range renditionLadder {
		if r.height <= sourceHeight {
			picked = append(picked, r)
		}
	}
	if len(picked) == 0 {
		picked = append(picked, renditionLadder[len(renditionLadder)-1])
	}
	return picked
}

// generateHLSLadder encodes one HLS rendition per applicable size into its
// own subdirectory of outputDir, then writes a master.m3u8 in outputDir that
// references all of them so players can switch between them (ABR).
func generateHLSLadder(ctx context.Context, inputPath, outputDir string, sourceWidth, sourceHeight int) error {
	renditions := renditionsFor(sourceHeight)

	var master strings.Builder
	master.WriteString("#EXTM3U\n#EXT-X-VERSION:3\n")

	for _, r := range renditions {
		renditionDir := filepath.Join(outputDir, r.name)
		if err := os.Mkdir(renditionDir, 0o755); err != nil {
			return fmt.Errorf("create %s dir: %w", r.name, err)
		}

		if err := runFFmpeg(ctx,
			"-y",
			"-i", inputPath,
			"-c:v", "libx264", "-c:a", "aac",
			"-vf", fmt.Sprintf("scale=-2:%d", r.height),
			"-b:v", strconv.Itoa(r.bandwidth),
			"-hls_time", "6",
			"-hls_playlist_type", "vod",
			"-hls_segment_filename", filepath.Join(renditionDir, "segment%03d.ts"),
			filepath.Join(renditionDir, "playlist.m3u8"),
		); err != nil {
			return fmt.Errorf("encode %s: %w", r.name, err)
		}

		// even width matching ffmpeg's own scale=-2:height rounding
		width := int(float64(sourceWidth)*float64(r.height)/float64(sourceHeight)) / 2 * 2
		fmt.Fprintf(&master, "#EXT-X-STREAM-INF:BANDWIDTH=%d,RESOLUTION=%dx%d\n%s/playlist.m3u8\n",
			r.bandwidth, width, r.height, r.name)
	}

	return os.WriteFile(filepath.Join(outputDir, "master.m3u8"), []byte(master.String()), 0o644)
}

// uploadDir uploads dir's rendition subdirectories (segments then each
// variant playlist), then master.m3u8 last, and returns master.m3u8's
// public URL. Nothing may be uploaded before the files it references exist.
func uploadDir(ctx context.Context, store *storage.Client, dir, keyPrefix string) (string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return "", err
	}

	var masterPath string
	for _, e := range entries {
		if !e.IsDir() {
			if e.Name() == "master.m3u8" {
				masterPath = filepath.Join(dir, e.Name())
			}
			continue
		}
		if err := uploadRendition(ctx, store, filepath.Join(dir, e.Name()), keyPrefix+"/"+e.Name()); err != nil {
			return "", err
		}
	}

	if masterPath == "" {
		return "", fmt.Errorf("master.m3u8 not found in %s", dir)
	}
	return uploadFile(ctx, store, masterPath, keyPrefix+"/master.m3u8")
}

// uploadRendition uploads every segment in a rendition subdirectory, then
// its playlist.m3u8 last.
func uploadRendition(ctx context.Context, store *storage.Client, dir, keyPrefix string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}

	var playlistPath string
	for _, e := range entries {
		if e.Name() == "playlist.m3u8" {
			playlistPath = filepath.Join(dir, e.Name())
			continue
		}
		if _, err := uploadFile(ctx, store, filepath.Join(dir, e.Name()), keyPrefix+"/"+e.Name()); err != nil {
			return err
		}
	}

	if playlistPath == "" {
		return fmt.Errorf("playlist.m3u8 not found in %s", dir)
	}
	_, err = uploadFile(ctx, store, playlistPath, keyPrefix+"/playlist.m3u8")
	return err
}

func uploadFile(ctx context.Context, store *storage.Client, path, key string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	info, err := f.Stat()
	if err != nil {
		return "", err
	}

	contentType := "video/mp2t"
	if strings.HasSuffix(key, ".m3u8") {
		contentType = "application/vnd.apple.mpegurl"
	}

	return store.Upload(ctx, key, f, info.Size(), contentType)
}
