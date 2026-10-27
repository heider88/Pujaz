package routes

import (
	"net/http"
	"pz_transaccional_cl/src/controllers"
)

func SetupWalletRoutes(mux *http.ServeMux, controller *controllers.WalletController) {
	mux.HandleFunc("/users/", controller.HandleUsers)
}
