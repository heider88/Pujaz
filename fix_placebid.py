with open('Pz_subastas_cl/src/services/auction_service.go', 'r') as f:
    content = f.read()

replacement = """	if prevWinnerID != 0 && prevWinnerID != userID {
		PublishEvent("eventos", "PujaSuperada", map[string]interface{}{
			"auctionId": auctionID,
			"userId":    prevWinnerID,
			"amount":    auction.WinningBid.Amount,
		})
	}

	PublishEvent("eventos", "PrecioActualizado", map[string]interface{}{
		"auctionId": auctionID,
		"price":     amount,
	})"""

content = content.replace("""	if prevWinnerID != 0 && prevWinnerID != userID {
		_ = RefundFunds(prevWinnerID, auction.WinningBid.Amount, auctionID)
	}""", replacement)

with open('Pz_subastas_cl/src/services/auction_service.go', 'w') as f:
    f.write(content)
