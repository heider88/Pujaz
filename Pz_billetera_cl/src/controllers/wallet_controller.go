package controllers

import (
	"encoding/json"
	"net/http"
	"Pz_billetera_cl/src/models"

	"Pz_billetera_cl/src/services"
	"strconv"
	"strings"
)

type WalletController struct {
	service *services.WalletService
}

func NewWalletController(service *services.WalletService) *WalletController {
	return &WalletController{service: service}
}

func (c *WalletController) HandleUsers(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	parts := strings.Split(path, "/")

	// GET /users/{id}/wallet
	if len(parts) == 4 && parts[3] == "wallet" && r.Method == http.MethodGet {
		c.GetWallet(w, r, parts[2])
		return
	}
	// POST /users/{id}/wallet/deposits
	if len(parts) == 5 && parts[3] == "wallet" && parts[4] == "deposits" && r.Method == http.MethodPost {
		c.Deposit(w, r, parts[2])
		return
	}
	// POST /users/{id}/wallet/reservations
	if len(parts) == 5 && parts[3] == "wallet" && parts[4] == "reservations" && r.Method == http.MethodPost {
		c.Reserve(w, r, parts[2])
		return
	}
	// POST /users/{id}/wallet/reservations/{reservationId}/release
	if len(parts) == 7 && parts[3] == "wallet" && parts[4] == "reservations" && parts[6] == "release" && r.Method == http.MethodPost {
		c.ReleaseReservation(w, r, parts[2], parts[5])
		return
	}

	http.NotFound(w, r)
}

func (c *WalletController) GetWallet(w http.ResponseWriter, r *http.Request, userIDStr string) {
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "BAD_USER_INPUT", "Invalid User ID")
		return
	}

	wallet, err := c.service.GetWallet(r.Context(), userID)
	if err != nil {
		if err == services.ErrNotFound {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "Wallet not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(wallet)
}

func (c *WalletController) Deposit(w http.ResponseWriter, r *http.Request, userIDStr string) {
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "BAD_USER_INPUT", "Invalid User ID")
		return
	}

	var req models.DepositRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_USER_INPUT", "Invalid JSON")
		return
	}

	if req.Amount <= 0 {
		writeError(w, http.StatusBadRequest, "BAD_USER_INPUT", "Amount must be positive")
		return
	}
	if req.PromoCode != "PROMO2026" {
		writeError(w, http.StatusBadRequest, "BAD_USER_INPUT", "Invalid promo code")
		return
	}

	wallet, err := c.service.Deposit(r.Context(), userID, req.Amount)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(wallet)
}

func (c *WalletController) Reserve(w http.ResponseWriter, r *http.Request, userIDStr string) {
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "BAD_USER_INPUT", "Invalid User ID")
		return
	}

	var req struct {
		Amount    float64 `json:"amount"`
		AuctionID string  `json:"auctionId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_USER_INPUT", "Invalid JSON")
		return
	}

	auctionID, err := strconv.Atoi(req.AuctionID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "BAD_USER_INPUT", "Invalid Auction ID")
		return
	}

	res, err := c.service.Reserve(r.Context(), userID, req.Amount, auctionID)
	if err != nil {
		if err.Error() == "INSUFFICIENT_FUNDS" {
			writeError(w, http.StatusUnprocessableEntity, "INSUFFICIENT_FUNDS", "Insufficient funds")
			return
		}
		if err == services.ErrNotFound {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "Wallet not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

func (c *WalletController) ReleaseReservation(w http.ResponseWriter, r *http.Request, userIDStr string, reservationID string) {
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "BAD_USER_INPUT", "Invalid User ID")
		return
	}

	res, err := c.service.ReleaseReservation(r.Context(), userID, reservationID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}
