package controllers_test

import (
	"database/sql"
	"os"
	"testing"
	_ "github.com/lib/pq"
)

func getEnvOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func setupTestDB(t *testing.T) *sql.DB {
	pgConnStr := getEnvOrDefault("TEST_DB_URL", "postgres://pujaz_user:pujaz_password@127.0.0.1:5432/pujaz_transaccional?sslmode=disable")
	db, err := sql.Open("postgres", pgConnStr)
	if err != nil {
		t.Fatalf("Error al abrir config Postgres: %v", err)
	}
	if err = db.Ping(); err != nil {
		t.Fatalf("No se pudo conectar a Postgres: %v", err)
	}
	return db
}
