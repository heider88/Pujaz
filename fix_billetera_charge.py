with open('Pz_billetera_cl/src/services/wallet_service.go', 'r') as f:
    content = f.read()

content += """
func (s *WalletService) Charge(ctx context.Context, userID int, amount float64, auctionID int) (*models.WalletResponse, error) {
	return s.repo.Charge(ctx, userID, amount, auctionID)
}
"""
with open('Pz_billetera_cl/src/services/wallet_service.go', 'w') as f:
    f.write(content)

with open('Pz_billetera_cl/src/repositories/wallet_repository.go', 'r') as f:
    content = f.read()

content += """
func (r *WalletRepository) Charge(ctx context.Context, userID int, amount float64, auctionID int) (*models.WalletResponse, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var wID int
	var available, reserved float64
	err = tx.QueryRowContext(ctx, "SELECT id, balance_available, balance_reserved FROM wallets WHERE user_id = $1 FOR UPDATE", userID).Scan(&wID, &available, &reserved)
	if err != nil {
		return nil, err
	}

	newReserved := reserved - amount
	_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance_reserved = $2 WHERE id = $3", newAvailable, newReserved, wID) // wait available doesn't change
	
	_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance_reserved = $1 WHERE id = $2", newReserved, wID)
	if err != nil {
		return nil, err
	}

	_, err = tx.ExecContext(ctx, "INSERT INTO wallet_movements (wallet_id, amount, type, auction_id) VALUES ($1, $2, 'cobro', $3)", wID, amount, auctionID)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return r.GetWalletByUserID(ctx, userID)
}
"""

with open('Pz_billetera_cl/src/repositories/wallet_repository.go', 'w') as f:
    f.write(content)

with open('Pz_billetera_cl/main.go', 'r') as f:
    content = f.read()

content = content.replace("routes.SetupHealthRoutes(mux)", "routes.SetupHealthRoutes(mux)\n\tservices.InitRabbitMQ(walletSvc)")

with open('Pz_billetera_cl/main.go', 'w') as f:
    f.write(content)
