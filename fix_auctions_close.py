with open('Pz_subastas_cl/src/routes/auction_routes.go', 'r') as f:
    content = f.read()

content = content.replace('http.NotFound(w, r)', 'if r.Method == http.MethodPost && r.URL.Path == "/auctions/close-expired" {\n\t\t\tcontroller.CloseExpired(w, r)\n\t\t\treturn\n\t\t}\n\t\thttp.NotFound(w, r)')

with open('Pz_subastas_cl/src/routes/auction_routes.go', 'w') as f:
    f.write(content)

with open('Pz_subastas_cl/src/controllers/auction_controller.go', 'r') as f:
    content = f.read()

content += """
func (c *AuctionController) CloseExpired(w http.ResponseWriter, r *http.Request) {
	count, err := c.service.CloseExpiredAuctions(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", err.Error())
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"closed": count})
}
"""

with open('Pz_subastas_cl/src/controllers/auction_controller.go', 'w') as f:
    f.write(content)
