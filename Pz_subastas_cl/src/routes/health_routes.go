package routes

import (
	"net/http"
	"Pz_subastas_cl/src/controllers"
)

func SetupHealthRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/health", controllers.HealthCheck)
}
