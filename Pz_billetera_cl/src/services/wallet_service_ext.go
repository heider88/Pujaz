package services

import (
	"context"
	"Pz_billetera_cl/src/models"
)

func (s *WalletService) CreateWallet(ctx context.Context, userID int) (*models.WalletResponse, error) {
	return s.repo.CreateWallet(ctx, userID)
}
