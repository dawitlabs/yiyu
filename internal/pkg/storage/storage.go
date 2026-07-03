package storage

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Client struct {
	minio      *minio.Client
	bucket     string
	publicBase string
}

type Config struct {
	Endpoint   string
	AccessKey  string
	SecretKey  string
	Bucket     string
	PublicBase string
	UseSSL     bool
}

func New(cfg Config) (*Client, error) {
	mc, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, err
	}

	return &Client{minio: mc, bucket: cfg.Bucket, publicBase: cfg.PublicBase}, nil
}

// PresignUpload returns a URL the caller can PUT the file's bytes to
// directly — the file never passes through this server. publicURL is where
// the object will be reachable afterward, for storing on the video row.
func (c *Client) PresignUpload(ctx context.Context, key string, expires time.Duration) (uploadURL string, publicURL string, err error) {
	u, err := c.minio.PresignedPutObject(ctx, c.bucket, key, expires)
	if err != nil {
		return "", "", err
	}
	return u.String(), fmt.Sprintf("%s/%s", c.publicBase, key), nil
}

// Upload writes bytes to storage directly — used server-side (the worker),
// as opposed to PresignUpload which hands the browser a URL to PUT to
// itself.
func (c *Client) Upload(ctx context.Context, key string, r io.Reader, size int64, contentType string) (publicURL string, err error) {
	_, err = c.minio.PutObject(ctx, c.bucket, key, r, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s/%s", c.publicBase, key), nil
}
