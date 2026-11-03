with open('Pz_subastas_cl/src/services/auction_service.go', 'r') as f:
    content = f.read()

content += """
func (s *AuctionService) CloseExpiredAuctions(ctx context.Context) (int, error) {
	auctions, err := s.repo.GetExpiredOpenAuctions(ctx)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, a := range auctions {
		err := s.repo.MarkAsClosed(ctx, a.IDInt)
		if err == nil {
			count++
			PublishEvent("eventos", "SubastaCerrada", map[string]interface{}{
				"auctionId": strconv.Itoa(a.IDInt),
				"itemId":    a.ItemID,
				"winnerId":  a.WinnerID,
				"amount":    a.CurrentPrice,
			})
		}
	}
	return count, nil
}
"""

with open('Pz_subastas_cl/src/services/auction_service.go', 'w') as f:
    f.write(content)

with open('Pz_subastas_cl/src/repositories/auction_repository.go', 'r') as f:
    content = f.read()

content += """
type ExpiredAuction struct {
	IDInt        int
	ItemID       string
	CurrentPrice float64
	WinnerID     *int
}

func (r *AuctionRepository) GetExpiredOpenAuctions(ctx context.Context) ([]ExpiredAuction, error) {
	query := `
		SELECT a.id, a.item_id, a.current_price, 
		       (SELECT user_id FROM bids b WHERE b.auction_id = a.id ORDER BY amount DESC LIMIT 1) as winner_id
		FROM auctions a
		WHERE a.status = 'abierta' AND a.ends_at < NOW()
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []ExpiredAuction
	for rows.Next() {
		var ea ExpiredAuction
		var winnerID sql.NullInt64
		if err := rows.Scan(&ea.IDInt, &ea.ItemID, &ea.CurrentPrice, &winnerID); err == nil {
			if winnerID.Valid {
				wid := int(winnerID.Int64)
				ea.WinnerID = &wid
			}
			result = append(result, ea)
		}
	}
	return result, nil
}

func (r *AuctionRepository) MarkAsClosed(ctx context.Context, id int) error {
	_, err := r.db.ExecContext(ctx, "UPDATE auctions SET status = 'CERRADA' WHERE id = $1", id)
	return err
}
"""

with open('Pz_subastas_cl/src/repositories/auction_repository.go', 'w') as f:
    f.write(content)
