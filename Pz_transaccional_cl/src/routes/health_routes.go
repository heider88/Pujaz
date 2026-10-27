package routes

import (
	"net/http"
	"pz_transaccional_cl/src/controllers"
)

func SetupHealthRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/health", controllers.HealthCheck)
}
