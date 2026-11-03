package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	"Pz_billetera_cl/src/controllers"
	"Pz_billetera_cl/src/repositories"
	"Pz_billetera_cl/src/routes"
	"Pz_billetera_cl/src/services"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
)

func main() {
	dbConn := os.Getenv("DATABASE_URL")
	if dbConn == "" {
		dbConn = "postgres://pujaz_user:pujaz_password@localhost:5432/pujaz_billetera?sslmode=disable"
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

	walletRepo := repositories.NewWalletRepository(db)
	walletSvc := services.NewWalletService(walletRepo)
	walletCtrl := controllers.NewWalletController(walletSvc)

	userRepo := repositories.NewUserRepository(db)
	userSvc := services.NewUserService(userRepo)
	userCtrl := controllers.NewUserController(userSvc)

services.InitRabbitMQ(walletSvc)
	mux := http.NewServeMux()
	routes.SetupUserRoutes(mux, userCtrl, walletCtrl)
	routes.SetupHealthRoutes(mux)
	services.InitRabbitMQ(walletSvc)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	log.Printf("Starting MS Billetera on port %s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
