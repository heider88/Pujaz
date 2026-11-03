package services

import (
	"context"
	"errors"
	"Pz_billetera_cl/src/models"
	"Pz_billetera_cl/src/repositories"
)

var (
	ErrInsufficientFunds = errors.New("INSUFFICIENT_FUNDS")
)

type WalletService struct {
	repo *repositories.WalletRepository
}

func NewWalletService(repo *repositories.WalletRepository) *WalletService {
	return &WalletService{repo: repo}
}

func (s *WalletService) GetWallet(ctx context.Context, userID int) (*models.WalletResponse, error) {
	return s.repo.GetWalletByUserID(ctx, userID)
}

func (s *WalletService) Deposit(ctx context.Context, userID int, amount float64) (*models.WalletResponse, error) {
	return s.repo.Deposit(ctx, userID, amount)
}

func (s *WalletService) Reserve(ctx context.Context, userID int, amount float64, auctionID int) (*models.WalletResponse, error) {
	return s.repo.Reserve(ctx, userID, amount, auctionID)
}

func (s *WalletService) Refund(ctx context.Context, userID int, amount float64, auctionID int) (*models.WalletResponse, error) {
	return s.repo.Refund(ctx, userID, amount, auctionID)
}

func (s *WalletService) Charge(ctx context.Context, userID int, amount float64, auctionID int) (*models.WalletResponse, error) {
	return s.repo.Charge(ctx, userID, amount, auctionID)
}
