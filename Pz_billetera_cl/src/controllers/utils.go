package controllers

import (
	"encoding/json"
	"net/http"
	"Pz_billetera_cl/src/models"
)

func writeError(w http.ResponseWriter, statusCode int, code string, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(models.ApiError{Code: code, Message: message})
}
