package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

func endpoint(base string) (string, error) {
	u, err := url.Parse(base)
	if err != nil {
		return "", fmt.Errorf("SUBASTAS_SERVICE_URL inválida")
	}
	if (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return "", fmt.Errorf("SUBASTAS_SERVICE_URL debe ser una URL HTTP(S) sin credenciales, query ni fragmento")
	}
	u.Path = strings.TrimRight(u.Path, "/") + "/auctions/close-expired"
	u.RawPath = ""
	return u.String(), nil
}

func closeExpired(ctx context.Context, client *http.Client, target string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, target, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("petición de cierre: %w", err)
	}
	defer resp.Body.Close()
	_, err = io.Copy(io.Discard, io.LimitReader(resp.Body, 64*1024))
	if err != nil {
		return fmt.Errorf("lectura de respuesta: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("cierre rechazado: HTTP %d", resp.StatusCode)
	}
	return nil
}

func run(ctx context.Context, ticks <-chan time.Time, client *http.Client, target string) {
	for {
		select {
		case <-ctx.Done():
			return
		case _, ok := <-ticks:
			if !ok || ctx.Err() != nil {
				return
			}
			if err := closeExpired(ctx, client, target); err != nil {
				if ctx.Err() == nil {
					log.Printf("ERROR: %v", err)
				}
			} else {
				log.Print("Ciclo de cierre completado correctamente")
			}
		}
	}
}

func main() {
	base := os.Getenv("SUBASTAS_SERVICE_URL")
	if base == "" {
		base = "http://pz-subastas-cl:8080"
	}
	target, err := endpoint(base)
	if err != nil {
		log.Fatal(err)
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()
	client := &http.Client{Timeout: 15 * time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }}
	log.Print("Worker de cierre iniciado; intervalo=60s, timeout=15s")
	run(ctx, ticker.C, client, target)
	log.Print("Worker detenido")
}
