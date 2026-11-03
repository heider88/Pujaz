package services

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
)

func getBilleteraURL() string {
	url := os.Getenv("MS_BILLETERA_URL")
	if url == "" {
		return "http://pz-billetera-cl:8082"
	}
	return url
}

func ReserveFunds(userID int, amount float64, auctionID int) error {
	url := fmt.Sprintf("%s/users/%d/reserve", getBilleteraURL(), userID)
	reqBody, _ := json.Marshal(map[string]interface{}{
		"amount":    amount,
		"auctionId": auctionID,
	})

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnprocessableEntity {
		return ErrInsufficientFunds
	}
	if resp.StatusCode != http.StatusOK {
		return errors.New("failed to reserve funds")
	}
	return nil
}

func RefundFunds(userID int, amount float64, auctionID int) error {
	url := fmt.Sprintf("%s/users/%d/refund", getBilleteraURL(), userID)
	reqBody, _ := json.Marshal(map[string]interface{}{
		"amount":    amount,
		"auctionId": auctionID,
	})

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return errors.New("failed to refund funds")
	}
	return nil
}
