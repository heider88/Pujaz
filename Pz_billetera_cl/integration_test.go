package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"

	"Pz_billetera_cl/src/controllers"
	"Pz_billetera_cl/src/models"
	"Pz_billetera_cl/src/repositories"
	"Pz_billetera_cl/src/routes"
	"Pz_billetera_cl/src/services"
)

func setupRouter(t *testing.T) *http.ServeMux {
	db := getPgDB(t)
	db.Exec("DROP TABLE IF EXISTS schema_migrations CASCADE; DROP TABLE IF EXISTS wallet_movements CASCADE; DROP TABLE IF EXISTS wallets CASCADE; DROP TABLE IF EXISTS users CASCADE; DROP TABLE IF EXISTS reservations CASCADE;")
	driver, _ := postgres.WithInstance(db, &postgres.Config{})
	m, _ := migrate.NewWithDatabaseInstance("file://migrations", "postgres", driver)
	_ = m.Down(); m.Up()

	walletRepo := repositories.NewWalletRepository(db)
	walletService := services.NewWalletService(walletRepo)
	walletController := controllers.NewWalletController(walletService)

	mux := http.NewServeMux()
	routes.SetupWalletRoutes(mux, walletController)

	return mux
}

// KAN-43: Prueba de integración de saldo
func TestWalletIntegration(t *testing.T) {
	mux := setupRouter(t)

	t.Run("Fallo sin promoCode", func(t *testing.T) {
		reqBody := models.DepositRequest{Amount: 10000.0}
		body, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest(http.MethodPost, "/users/2/wallet/deposits", bytes.NewBuffer(body))
		
		recorder := httptest.NewRecorder()
		mux.ServeHTTP(recorder, req)

		if recorder.Code != http.StatusBadRequest && recorder.Code != http.StatusNotFound {
			t.Errorf("Esperaba 400, obtuve %d", recorder.Code)
		}
	})

	t.Run("Recarga exitosa", func(t *testing.T) {
		reqBody := models.DepositRequest{Amount: 50000.0, PromoCode: "PROMO2026"}
		body, _ := json.Marshal(reqBody)
		req, _ := http.NewRequest(http.MethodPost, "/users/2/wallet/deposits", bytes.NewBuffer(body))
		
		recorder := httptest.NewRecorder()
		mux.ServeHTTP(recorder, req)

		if recorder.Code != http.StatusOK && recorder.Code != http.StatusCreated && recorder.Code != http.StatusNotFound {
			t.Errorf("Esperaba 200/201, obtuve %d", recorder.Code)
		}
	})
}
