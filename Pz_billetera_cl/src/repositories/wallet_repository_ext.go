package repositories

import (
	"context"
	"Pz_billetera_cl/src/models"
)

func (r *WalletRepository) CreateWallet(ctx context.Context, userID int) (*models.WalletResponse, error) {
	_, err := r.db.ExecContext(ctx, "INSERT INTO wallets (user_id, balance_available, balance_reserved) VALUES ($1, 0, 0)", userID)
	if err != nil {
		return nil, err
	}
	return r.GetWalletByUserID(ctx, userID)
}
