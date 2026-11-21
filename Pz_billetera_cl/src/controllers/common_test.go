package controllers_test

import (
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
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
	db.Exec("DROP TABLE IF EXISTS schema_migrations CASCADE; DROP TABLE IF EXISTS wallet_movements CASCADE; DROP TABLE IF EXISTS wallets CASCADE; DROP TABLE IF EXISTS users CASCADE; DROP TABLE IF EXISTS reservations CASCADE;")
	driver, _ := postgres.WithInstance(db, &postgres.Config{})
	m, _ := migrate.NewWithDatabaseInstance("file://../../migrations", "postgres", driver)
	m.Down(); if err := m.Up(); err != nil && err.Error() != "no change" { panic(err) }
	return db
}
