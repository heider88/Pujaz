package routes

import (
	"net/http"
	"Pz_billetera_cl/src/controllers"
)

func SetupWalletRoutes(mux *http.ServeMux, controller *controllers.WalletController) {
	mux.HandleFunc("/users/", controller.HandleUsers)
}
