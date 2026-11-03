package services

import (
	"context"
	"errors"
	"fmt"
	"Pz_subastas_cl/src/models"
	"Pz_subastas_cl/src/repositories"
	"strconv"
	"strings"
	"time"
)

var (
	ErrAuctionClosed     = errors.New("AUCTION_CLOSED")
	ErrBidTooLow         = errors.New("BID_TOO_LOW")
	ErrInsufficientFunds = errors.New("INSUFFICIENT_FUNDS")
	ErrInvalidInput      = errors.New("BAD_USER_INPUT")
	ErrNotFound          = repositories.ErrNotFound
)

type AuctionService struct {
	repo *repositories.AuctionRepository
}

func NewAuctionService(repo *repositories.AuctionRepository) *AuctionService {
	return &AuctionService{repo: repo}
}

func (s *AuctionService) updateStatus(a *models.Auction) {
	if time.Now().UTC().After(a.EndsAt) {
		a.Status = "CLOSED"
	} else {
		a.Status = "OPEN"
	}
}

func (s *AuctionService) CreateAuction(ctx context.Context, itemID string, basePrice float64, endsAt time.Time) (*models.Auction, error) {
	if basePrice <= 0 {
		return nil, ErrInvalidInput
	}
	if time.Now().UTC().After(endsAt) {
		return nil, ErrInvalidInput
	}
	
	auction, err := s.repo.CreateAuction(ctx, itemID, basePrice, endsAt)
	if err != nil {
		fmt.Println("Repo error:", err)
		if strings.Contains(strings.ToLower(err.Error()), "unique") || strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return nil, ErrInvalidInput
		}
		return nil, err
	}
	s.updateStatus(auction)
	return auction, nil
}

func (s *AuctionService) GetAuction(ctx context.Context, idStr string) (*models.Auction, error) {
	var auction *models.Auction
	var err error

	if idInt, errParse := strconv.Atoi(idStr); errParse == nil {
		auction, err = s.repo.GetAuctionByID(ctx, idInt)
	} else {
		auction, err = s.repo.GetAuctionByItemID(ctx, idStr)
	}

	if err != nil {
		return nil, err
	}
	s.updateStatus(auction)
	return auction, nil
}

func (s *AuctionService) PlaceBid(ctx context.Context, auctionIDStr string, userIDStr string, amount float64) (*models.PlaceBidResponse, error) {
	auctionID, err := strconv.Atoi(auctionIDStr)
	if err != nil {
		return nil, ErrNotFound
	}
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		return nil, errors.New("BAD_USER_INPUT")
	}

	db := s.repo.DB()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	auction, err := s.repo.GetAuctionForUpdate(ctx, tx, auctionID)
	if err != nil {
		return nil, err
	}
	s.updateStatus(auction)

	if auction.Status == "CLOSED" {
		return nil, ErrAuctionClosed
	}

	if amount < auction.CurrentPrice+100 {
		return nil, ErrBidTooLow
	}

	var prevReservedForThisUser float64 = 0
	var prevWinnerID int = 0
	if auction.WinningBid != nil {
		wUID, _ := strconv.Atoi(auction.WinningBid.Bidder.ID)
		if wUID == userID {
			prevReservedForThisUser = auction.WinningBid.Amount
		}
		prevWinnerID = wUID
	}

	// Calculate net amount to reserve
	netReservation := amount - prevReservedForThisUser

	err = ReserveFunds(userID, netReservation, auctionID)
	if err != nil {
		return nil, err
	}

	if prevWinnerID != 0 && prevWinnerID != userID {
		PublishEvent("eventos", "PujaSuperada", map[string]interface{}{
			"auctionId": auctionID,
			"userId":    prevWinnerID,
			"amount":    auction.WinningBid.Amount,
		})
	}

	PublishEvent("eventos", "PrecioActualizado", map[string]interface{}{
		"auctionId": auctionID,
		"price":     amount,
	})

	bid, err := s.repo.CreateBid(ctx, tx, auctionID, userID, amount)
	if err != nil {
		// Compensating action
		_ = RefundFunds(userID, netReservation, auctionID)
		return nil, err
	}
	err = s.repo.UpdateAuctionPrice(ctx, tx, auctionID, amount)
	if err != nil {
		_ = RefundFunds(userID, netReservation, auctionID)
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		_ = RefundFunds(userID, netReservation, auctionID)
		return nil, err
	}

	updatedAuction, err := s.repo.GetAuctionByID(ctx, auctionID)
	if err != nil {
		return nil, err
	}
	s.updateStatus(updatedAuction)

	return &models.PlaceBidResponse{
		Bid:     *bid,
		Auction: *updatedAuction,
	}, nil
}

func (s *AuctionService) GetAuctionsByItemIDs(ctx context.Context, itemIDs []string) ([]models.Auction, error) {
	auctions, err := s.repo.GetAuctionsByItemIDs(ctx, itemIDs)
	if err != nil {
		return nil, err
	}
	for i := range auctions {
		s.updateStatus(&auctions[i])
	}
	return auctions, nil
}

func (s *AuctionService) GetAuctionsByIDs(ctx context.Context, idsStr []string) ([]models.Auction, error) {
	var ids []int
	for _, idStr := range idsStr {
		if id, err := strconv.Atoi(idStr); err == nil {
			ids = append(ids, id)
		}
	}
	auctions, err := s.repo.GetAuctionsByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range auctions {
		s.updateStatus(&auctions[i])
	}
	return auctions, nil
}

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
