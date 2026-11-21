package main

import (
	"database/sql"
	"os"
	"testing"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
)

func getEnvOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

var (
	pgConnStr = getEnvOrDefault("TEST_DB_URL", "postgres://pujaz_user:pujaz_password@127.0.0.1:5432/pujaz_transaccional?sslmode=disable")
)

func getPgDB(t *testing.T) *sql.DB {
	db, err := sql.Open("postgres", pgConnStr)
	if err != nil {
		t.Fatalf("Error al abrir config Postgres: %v", err)
	}
	if err = db.Ping(); err != nil {
		t.Fatalf("No se pudo conectar a Postgres: %v", err)
	}
	return db
}

func TestMigrationsUpAndDown(t *testing.T) {
	db := getPgDB(t)
	defer db.Close()

	db.Exec("DROP TABLE IF EXISTS schema_migrations CASCADE; DROP TABLE IF EXISTS wallet_movements CASCADE; DROP TABLE IF EXISTS wallets CASCADE; DROP TABLE IF EXISTS users CASCADE; DROP TABLE IF EXISTS reservations CASCADE;")
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		t.Fatalf("Fallo al crear driver Postgres: %v", err)
	}

	m, err := migrate.NewWithDatabaseInstance("file://migrations", "postgres", driver)
	if err != nil {
		t.Fatalf("Fallo al instanciar golang-migrate: %v", err)
	}

	err = m.Down(); m.Up()
	if err != nil && err != migrate.ErrNoChange {
		t.Fatalf("Error al ejecutar migraciones UP: %v", err)
	}

}
