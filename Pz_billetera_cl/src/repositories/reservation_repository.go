package repositories

import (
	"context"
	"database/sql"
	"Pz_billetera_cl/src/models"
	"strconv"
)

func (r *WalletRepository) ReleaseReservation(ctx context.Context, userID int, reservationIDStr string) (*models.Reservation, error) {
	reservationID, err := strconv.Atoi(reservationIDStr)
	if err != nil {
		return nil, err
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var res models.Reservation
	err = tx.QueryRowContext(ctx, "SELECT id, user_id, auction_id, amount, status, created_at FROM reservations WHERE id = $1 AND user_id = $2 FOR UPDATE", reservationID, userID).Scan(&res.ID, &res.UserID, &res.AuctionID, &res.Amount, &res.Status, &res.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if res.Status != "ACTIVE" {
		return &res, nil // Already released or charged (idempotent)
	}

	res.Status = "RELEASED"
	_, err = tx.ExecContext(ctx, "UPDATE reservations SET status = 'RELEASED' WHERE id = $1", reservationID)
	if err != nil {
		return nil, err
	}

	var wID int
	var available, reserved float64
	err = tx.QueryRowContext(ctx, "SELECT id, balance_available, balance_reserved FROM wallets WHERE user_id = $1 FOR UPDATE", userID).Scan(&wID, &available, &reserved)
	if err != nil {
		return nil, err
	}

	newAvailable := available + res.Amount
	newReserved := reserved - res.Amount
	_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance_available = $1, balance_reserved = $2 WHERE id = $3", newAvailable, newReserved, wID)
	if err != nil {
		return nil, err
	}

	auctionID, _ := strconv.Atoi(res.AuctionID)
	_, err = tx.ExecContext(ctx, "INSERT INTO wallet_movements (wallet_id, amount, type, auction_id) VALUES ($1, $2, 'reintegro', $3)", wID, res.Amount, auctionID)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return &res, nil
}

func (r *WalletRepository) ChargeReservation(ctx context.Context, reservationIDStr string) error {
	reservationID, err := strconv.Atoi(reservationIDStr)
	if err != nil {
		return err
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var res models.Reservation
	err = tx.QueryRowContext(ctx, "SELECT id, user_id, auction_id, amount, status FROM reservations WHERE id = $1 FOR UPDATE", reservationID).Scan(&res.ID, &res.UserID, &res.AuctionID, &res.Amount, &res.Status)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return err
	}

	if res.Status != "ACTIVE" {
		return nil // Idempotent
	}

	res.Status = "CHARGED"
	_, err = tx.ExecContext(ctx, "UPDATE reservations SET status = 'CHARGED' WHERE id = $1", reservationID)
	if err != nil {
		return err
	}

	var wID int
	var reserved float64
	err = tx.QueryRowContext(ctx, "SELECT id, balance_reserved FROM wallets WHERE user_id = $1 FOR UPDATE", res.UserID).Scan(&wID, &reserved)
	if err != nil {
		return err
	}

	newReserved := reserved - res.Amount
	_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance_reserved = $1 WHERE id = $2", newReserved, wID)
	if err != nil {
		return err
	}

	auctionID, _ := strconv.Atoi(res.AuctionID)
	_, err = tx.ExecContext(ctx, "INSERT INTO wallet_movements (wallet_id, amount, type, auction_id) VALUES ($1, $2, 'cobro', $3)", wID, res.Amount, auctionID)
	if err != nil {
		return err
	}

	return tx.Commit()
}
