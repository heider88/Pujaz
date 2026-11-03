package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestEndpoint(t *testing.T) {
	got, err := endpoint("http://pz-subastas-cl:8081/")
	if err != nil || got != "http://pz-subastas-cl:8081/auctions/close-expired" {
		t.Fatalf("%s %v", got, err)
	}
	for _, bad := range []string{"", "ftp://host", "http://", "http://user:pass@host", "http://host?q=x"} {
		if _, err := endpoint(bad); err == nil {
			t.Errorf("accepted %q", bad)
		}
	}
}

func TestCloseExpired(t *testing.T) {
	for _, status := range []int{200, 204, 302, 500} {
		t.Run(http.StatusText(status), func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Method != http.MethodPost || r.URL.Path != "/auctions/close-expired" {
					t.Errorf("request: %s %s", r.Method, r.URL.Path)
				}
				w.WriteHeader(status)
			}))
			defer srv.Close()
			err := closeExpired(context.Background(), srv.Client(), srv.URL+"/auctions/close-expired")
			if (err == nil) != (status >= 200 && status < 300) {
				t.Fatalf("status=%d err=%v", status, err)
			}
		})
	}
}

func TestTimeout(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { <-r.Context().Done() }))
	defer srv.Close()
	client := srv.Client()
	client.Timeout = 20 * time.Millisecond
	if err := closeExpired(context.Background(), client, srv.URL); err == nil {
		t.Fatal("expected timeout")
	}
}

func TestRunContinuesAfterFailure(t *testing.T) {
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if calls == 1 {
			w.WriteHeader(500)
		}
	}))
	defer srv.Close()
	ticks := make(chan time.Time, 2)
	ticks <- time.Now()
	ticks <- time.Now()
	close(ticks)
	run(context.Background(), ticks, srv.Client(), srv.URL)
	if calls != 2 {
		t.Fatalf("calls=%d", calls)
	}
}

func TestCancelledRun(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	done := make(chan struct{})
	go func() { run(ctx, make(chan time.Time), http.DefaultClient, "http://unused"); close(done) }()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("worker did not stop")
	}
}
