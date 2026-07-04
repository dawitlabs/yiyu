package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/dawitlabs/yiyu/internal/adapters/repository"
	"github.com/jackc/pgx/v5/pgtype"
)

type mediaMTXPathsResponse struct {
	Items []struct {
		Name  string `json:"name"`
		Ready bool   `json:"ready"`
	} `json:"items"`
}

// pollLiveStreams asks MediaMTX which paths are actively publishing and
// reconciles that against live_streams.status. MediaMTX's official Docker
// image has no shell (scratch-based), so its runOnReady/runOnNotReady hooks
// — which only run shell commands — can't call back into our API. Polling
// its own status API instead needs no image changes and no webhook auth.
func pollLiveStreams(ctx context.Context, repo *repository.PostgresRepository, apiURL string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL+"/v3/paths/list", nil)
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var parsed mediaMTXPathsResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return err
	}

	readyPaths := make(map[string]bool, len(parsed.Items))
	for _, item := range parsed.Items {
		if item.Ready {
			readyPaths[item.Name] = true
		}
	}

	streams, err := repo.ListLiveStreams(ctx)
	if err != nil {
		return err
	}

	for _, stream := range streams {
		isReady := readyPaths[stream.StreamKey]
		var updateErr error
		switch {
		case isReady && stream.Status != "live":
			updateErr = repo.SetLiveStreamStatus(ctx, repository.SetLiveStreamStatusParams{
				ID:        stream.ID,
				Status:    "live",
				StartedAt: pgtype.Timestamptz{Time: time.Now(), Valid: true},
			})
		case !isReady && stream.Status == "live":
			updateErr = repo.SetLiveStreamStatus(ctx, repository.SetLiveStreamStatusParams{
				ID:     stream.ID,
				Status: "offline",
			})
		default:
			continue
		}
		if updateErr != nil {
			slog.Error("update live stream status", "stream_id", stream.ID, "error", updateErr)
		}
	}
	return nil
}
