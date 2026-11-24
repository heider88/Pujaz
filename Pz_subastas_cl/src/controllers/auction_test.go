package controllers_test

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"Pz_subastas_cl/src/controllers"
	"Pz_subastas_cl/src/models"
	"Pz_subastas_cl/src/repositories"
	"Pz_subastas_cl/src/routes"
	"Pz_subastas_cl/src/services"

	_ "github.com/lib/pq"
)

const pgConnStr = "postgres://pujaz_user:pujaz_password@127.0.0.1:5432/pujaz_transaccional?sslmode=disable"

func setupTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("postgres", pgConnStr)
	if err != nil {
		t.Fatalf("Failed to open DB: %v", err)
	}

	driver, _ := postgres.WithInstance(db, &postgres.Config{})
	m, _ := migrate.NewWithDatabaseInstance("file://../../migrations", "postgres", driver)
	_ = m.Up()

	_, _ = db.Exec("TRUNCATE TABLE bids, auctions RESTART IDENTITY CASCADE")

	// 3. Auctions
	// Auction 1: Open, BasePrice 100000
	_, _ = db.Exec("INSERT INTO auctions (id, item_id, current_price, ends_at) VALUES (1, 'item1', 100000.00, $1)", time.Now().Add(24*time.Hour).UTC())
	// Auction 2: Closed
	_, _ = db.Exec("INSERT INTO auctions (id, item_id, current_price, ends_at) VALUES (2, 'item2', 100000.00, $1)", time.Now().Add(-24*time.Hour).UTC())
	_, _ = db.Exec("SELECT setval('auctions_id_seq', (SELECT MAX(id) FROM auctions))")
	
	return db
}

func TestAuctionEndpoints(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := repositories.NewAuctionRepository(db)
	svc := services.NewAuctionService(repo)
	ctrl := controllers.NewAuctionController(svc)
	mux := http.NewServeMux()
	routes.SetupAuctionRoutes(mux, ctrl)

	server := httptest.NewServer(mux)
	defer server.Close()

	t.Run("GetAuction_NoBids", func(t *testing.T) {
		res, err := http.Get(server.URL + "/auctions/1")
		if err != nil {
			t.Fatal(err)
		}
		if res.StatusCode != 200 {
			t.Errorf("Expected 200, got %d", res.StatusCode)
		}
		var a models.Auction
		json.NewDecoder(res.Body).Decode(&a)
		if a.WinningBid != nil {
			t.Errorf("Expected no winning bid")
		}
	})

	tests := []struct {
		name       string
		auctionID  string
		reqBody    models.PlaceBidRequest
		wantStatus int
		wantCode   string
	}{
		{
			name:       "Puja Válida",
			auctionID:  "1",
			reqBody:    models.PlaceBidRequest{UserID: "1", Amount: 120000.0, ReservationID: "res1"},
			wantStatus: http.StatusCreated,
			wantCode:   "",
		},
		{
			name:       "Puja Igual o Menor",
			auctionID:  "1",
			reqBody:    models.PlaceBidRequest{UserID: "2", Amount: 120000.0, ReservationID: "res2"},
			wantStatus: http.StatusConflict,
			wantCode:   "BID_TOO_LOW",
		},
		{
			name:       "Subasta Cerrada",
			auctionID:  "2",
			reqBody:    models.PlaceBidRequest{UserID: "2", Amount: 150000.0, ReservationID: "res3"},
			wantStatus: http.StatusConflict,
			wantCode:   "AUCTION_CLOSED",
		},
		{
			name:       "Subasta Inexistente",
			auctionID:  "999",
			reqBody:    models.PlaceBidRequest{UserID: "1", Amount: 100000.0, ReservationID: "res4"},
			wantStatus: http.StatusNotFound,
			wantCode:   "NOT_FOUND",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			b, _ := json.Marshal(tc.reqBody)
			res, err := http.Post(server.URL+"/auctions/"+tc.auctionID+"/bids", "application/json", bytes.NewReader(b))
			if err != nil {
				t.Fatal(err)
			}
			if res.StatusCode != tc.wantStatus {
				t.Errorf("Expected status %d, got %d", tc.wantStatus, res.StatusCode)
			}
			if tc.wantCode != "" {
				var apiErr models.ApiError
				json.NewDecoder(res.Body).Decode(&apiErr)
				if apiErr.Code != tc.wantCode {
					t.Errorf("Expected error code %s, got %s", tc.wantCode, apiErr.Code)
				}
			}
		})
	}

	t.Run("GetAuction_WithBids", func(t *testing.T) {
		res, err := http.Get(server.URL + "/auctions/1")
		if err != nil {
			t.Fatal(err)
		}
		var a models.Auction
		json.NewDecoder(res.Body).Decode(&a)
		if a.WinningBid == nil || a.WinningBid.Amount != 120000.0 {
			t.Errorf("Expected winning bid of 120000, got %v", a.WinningBid)
		}
		if len(a.Participants) != 1 {
			t.Errorf("Expected 1 participant, got %d", len(a.Participants))
		}
	})
}

func TestAuctionEndpoints_Create(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := repositories.NewAuctionRepository(db)
	service := services.NewAuctionService(repo)
	controller := controllers.NewAuctionController(service)

	mux := http.NewServeMux()
	routes.SetupAuctionRoutes(mux, controller)
	server := httptest.NewServer(mux)
	defer server.Close()

	t.Run("Create_Valid", func(t *testing.T) {
		reqBody, _ := json.Marshal(map[string]interface{}{
			"itemId":    "new_item_123",
			"basePrice": 50000.0,
			"endsAt":    time.Now().Add(24 * time.Hour).UTC().Format(time.RFC3339),
		})
		req, _ := http.NewRequest(http.MethodPost, server.URL+"/auctions", bytes.NewBuffer(reqBody))
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated {
			var respBody map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&respBody)
			t.Errorf("Expected status 201, got %d, body: %v", resp.StatusCode, respBody)
		}
	})

	t.Run("Create_Duplicate_Item", func(t *testing.T) {
		reqBody, _ := json.Marshal(map[string]interface{}{
			"itemId":    "item1", // item1 ya existe en setupTestDB
			"basePrice": 50000.0,
			"endsAt":    time.Now().Add(24 * time.Hour).UTC().Format(time.RFC3339),
		})
		req, _ := http.NewRequest(http.MethodPost, server.URL+"/auctions", bytes.NewBuffer(reqBody))
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("Expected status 400 for duplicate, got %d", resp.StatusCode)
		}
	})

	t.Run("Create_Past_Date", func(t *testing.T) {
		reqBody, _ := json.Marshal(map[string]interface{}{
			"itemId":    "new_item_456",
			"basePrice": 50000.0,
			"endsAt":    time.Now().Add(-24 * time.Hour).UTC().Format(time.RFC3339),
		})
		req, _ := http.NewRequest(http.MethodPost, server.URL+"/auctions", bytes.NewBuffer(reqBody))
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("Expected status 400 for past date, got %d", resp.StatusCode)
		}
	})
}
