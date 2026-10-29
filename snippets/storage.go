// Package edgekit provides a zero-dependency client for EdgeKit Storage.
// Copy this file directly into your Go project (e.g., `pkg/storage/edgekit.go`).
package edgekit

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	BaseURL    string
	APIKey     string
	HTTPClient *http.Client
}

type StorageFile struct {
	Key          string `json:"key"`
	URL          string `json:"url"`
	Size         int64  `json:"size"`
	MimeType     string `json:"mimeType"`
	OriginalName string `json:"originalName,omitempty"`
	IsPrivate    bool   `json:"isPrivate"`
	UploadedAt   string `json:"uploadedAt"`
}

type SignedUrlResult struct {
	URL              string `json:"url"`
	Key              string `json:"key"`
	ExpiresAt        int64  `json:"expiresAt"`
	ExpiresInSeconds int    `json:"expiresInSeconds"`
}

type ListResult struct {
	Objects   []StorageFile `json:"objects"`
	Truncated bool          `json:"truncated"`
	Cursor    *string       `json:"cursor"`
}

type apiResponse[T any] struct {
	Success bool  `json:"success"`
	Data    T     `json:"data"`
	Error   *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

type UploadOptions struct {
	Folder       string
	PreserveName bool
	CustomName   string
	Private      bool
}

func NewClient(baseURL, apiKey string) *Client {
	return &Client{
		BaseURL: strings.TrimRight(baseURL, "/"),
		APIKey:  strings.TrimSpace(apiKey),
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Upload sends a file stream to EdgeKit Storage.
func (c *Client) Upload(ctx context.Context, filename string, r io.Reader, opts *UploadOptions) (*StorageFile, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return nil, fmt.Errorf("failed creating form file: %w", err)
	}

	if _, err := io.Copy(part, r); err != nil {
		return nil, fmt.Errorf("failed copying file content: %w", err)
	}

	if opts != nil {
		if opts.Folder != "" {
			_ = writer.WriteField("folder", opts.Folder)
		}
		if opts.PreserveName {
			_ = writer.WriteField("preserveName", "true")
		}
		if opts.CustomName != "" {
			_ = writer.WriteField("customName", opts.CustomName)
		}
		if opts.Private {
			_ = writer.WriteField("private", "true")
		}
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("failed closing multipart writer: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/upload", body)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("X-API-Key", c.APIKey)

	res, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var apiRes apiResponse[StorageFile]
	if err := json.NewDecoder(res.Body).Decode(&apiRes); err != nil {
		return nil, fmt.Errorf("failed parsing response: %w", err)
	}

	if !apiRes.Success || res.StatusCode >= 400 {
		msg := fmt.Sprintf("upload failed (HTTP %d)", res.StatusCode)
		if apiRes.Error != nil && apiRes.Error.Message != "" {
			msg = apiRes.Error.Message
		}
		return nil, fmt.Errorf(msg)
	}

	return &apiRes.Data, nil
}

// GetSignedUrl generates a time-limited HMAC-signed URL for accessing a private file.
func (c *Client) GetSignedUrl(ctx context.Context, key string, expiresInSeconds int) (*SignedUrlResult, error) {
	payload, _ := json.Marshal(map[string]any{
		"key":              key,
		"expiresInSeconds": expiresInSeconds,
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/api/signed-url", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", c.APIKey)

	res, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var apiRes apiResponse[SignedUrlResult]
	if err := json.NewDecoder(res.Body).Decode(&apiRes); err != nil {
		return nil, fmt.Errorf("failed parsing response: %w", err)
	}

	if !apiRes.Success || res.StatusCode >= 400 {
		return nil, fmt.Errorf("failed generating signed url: %d", res.StatusCode)
	}

	return &apiRes.Data, nil
}

// Delete removes a file from the bucket.
func (c *Client) Delete(ctx context.Context, key string) error {
	cleanKey := strings.TrimLeft(key, "/")
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, c.BaseURL+"/api/files/"+url.PathEscape(cleanKey), nil)
	if err != nil {
		return err
	}
	req.Header.Set("X-API-Key", c.APIKey)

	res, err := c.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode >= 400 {
		return fmt.Errorf("delete failed with HTTP %d", res.StatusCode)
	}
	return nil
}

// DeleteMany removes multiple files from the bucket simultaneously.
func (c *Client) DeleteMany(ctx context.Context, keys []string) error {
	payload, _ := json.Marshal(map[string]any{"keys": keys})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/api/files/batch-delete", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", c.APIKey)

	res, err := c.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode >= 400 {
		return fmt.Errorf("batch delete failed with HTTP %d", res.StatusCode)
	}
	return nil
}
