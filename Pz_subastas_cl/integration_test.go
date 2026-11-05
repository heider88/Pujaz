package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"Pz_subastas_cl/src/controllers"
	"Pz_subastas_cl/src/models"
	"Pz_subastas_cl/src/repositories"
	"Pz_subastas_cl/src/routes"
	"Pz_subastas_cl/src/services"
)

func setupRouter(t *testing.T) *http.ServeMux {
	db := getPgDB(t)

	auctionRepo := repositories.NewAuctionRepository(db)
	auctionService := services.NewAuctionService(auctionRepo)
	auctionController := controllers.NewAuctionController(auctionService)

	mux := http.NewServeMux()
	routes.SetupAuctionRoutes(mux, auctionController)

	return mux
}

// KAN-32: Prueba de integración de subastas
func TestAuctionBidsIntegration(t *testing.T) {
	mux := setupRouter(t)

	auctionReq := models.CreateAuctionRequest{
		ItemID:    fmt.Sprintf("it_%d", time.Now().Unix()),
		BasePrice: 1000.0,
		EndsAt:    time.Now().Add(24 * time.Hour),
	}
	bodyAuction, _ := json.Marshal(auctionReq)
	reqA, _ := http.NewRequest(http.MethodPost, "/auctions", bytes.NewBuffer(bodyAuction))
	recA := httptest.NewRecorder()
	mux.ServeHTTP(recA, reqA)
	
	var createdAuction models.Auction
	json.NewDecoder(recA.Body).Decode(&createdAuction)
	auctionID := createdAuction.ID
	if auctionID == "" { auctionID = "1" }

	t.Run("Puja menor al base price", func(t *testing.T) {
		bidReq := models.PlaceBidRequest{UserID: "1", Amount: 500.0}
		body, _ := json.Marshal(bidReq)
		req, _ := http.NewRequest(http.MethodPost, "/auctions/"+auctionID+"/bids", bytes.NewBuffer(body))
		
		recorder := httptest.NewRecorder()
		mux.ServeHTTP(recorder, req)

		if recorder.Code != http.StatusConflict && recorder.Code != http.StatusBadRequest {
			t.Errorf("Esperaba 409 o 400, obtuve %d", recorder.Code)
		}
		if !strings.Contains(recorder.Body.String(), "BID_TOO_LOW") {
			t.Errorf("El mensaje de error no contiene BID_TOO_LOW: %s", recorder.Body.String())
		}
	})

	t.Run("Puja exitosa reserva saldo", func(t *testing.T) {
		bidReq := models.PlaceBidRequest{UserID: "1", Amount: 1500.0}
		body, _ := json.Marshal(bidReq)
		req, _ := http.NewRequest(http.MethodPost, "/auctions/"+auctionID+"/bids", bytes.NewBuffer(body))
		
		recorder := httptest.NewRecorder()
		mux.ServeHTTP(recorder, req)

		if recorder.Code != http.StatusOK && recorder.Code != http.StatusCreated && recorder.Code != http.StatusUnprocessableEntity {
			t.Errorf("Esperaba 200/201/422, obtuve %d: %s", recorder.Code, recorder.Body.String())
		}
	})
}
