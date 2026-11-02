package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"time"

	"Pz_subastas_cl/src/controllers"
	"Pz_subastas_cl/src/repositories"
	"Pz_subastas_cl/src/routes"
	"Pz_subastas_cl/src/services"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
)

func main() {
	dbConn := os.Getenv("DATABASE_URL")
	if dbConn == "" {
		dbConn = "postgres://pujaz_user:pujaz_password@localhost:5432/pujaz_subastas?sslmode=disable"
	}
	
	db, err := sql.Open("postgres", dbConn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		log.Fatalf("Could not create postgres driver: %v", err)
	}
	m, err := migrate.NewWithDatabaseInstance("file://migrations", "postgres", driver)
	if err != nil {
		log.Fatalf("Could not create migrate instance: %v", err)
	}
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Printf("Migration Up failed or already applied: %v", err)
	} else {
		log.Println("Database migrations applied successfully")
	}

	repo := repositories.NewAuctionRepository(db)
	svc := services.NewAuctionService(repo)
	ctrl := controllers.NewAuctionController(svc)

	services.InitRabbitMQ()

	go func() {
		for {
			time.Sleep(10 * time.Second)
			svc.CloseExpiredAuctions(context.Background())
		}
	}()

	mux := http.NewServeMux()
	routes.SetupAuctionRoutes(mux, ctrl)
	routes.SetupHealthRoutes(mux)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("Starting MS Subastas on port %s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
