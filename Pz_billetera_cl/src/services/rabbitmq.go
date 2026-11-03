package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"

	amqp "github.com/rabbitmq/amqp091-go"
)

var RabbitConn *amqp.Connection

func InitRabbitMQ(walletSvc *WalletService) {
	url := os.Getenv("RABBITMQ_URL")
	if url == "" {
		url = "amqp://guest:guest@localhost:5672/"
	}

	conn, err := amqp.Dial(url)
	if err != nil {
		log.Printf("RabbitMQ connection failed: %v", err)
		return
	}
	RabbitConn = conn

	ch, err := conn.Channel()
	if err != nil {
		log.Printf("RabbitMQ channel failed: %v", err)
		return
	}

	err = ch.ExchangeDeclare("eventos", "fanout", true, false, false, false, nil)
	if err != nil {
		log.Printf("RabbitMQ exchange failed: %v", err)
		return
	}

	q, err := ch.QueueDeclare("billetera_eventos", true, false, false, false, nil)
	if err != nil {
		log.Printf("RabbitMQ queue failed: %v", err)
		return
	}

	err = ch.QueueBind(q.Name, "", "eventos", false, nil)
	if err != nil {
		log.Printf("RabbitMQ bind failed: %v", err)
		return
	}

	msgs, err := ch.Consume(q.Name, "", false, false, false, false, nil)
	if err != nil {
		log.Printf("RabbitMQ consume failed: %v", err)
		return
	}

	go func() {
		for d := range msgs {
			var event map[string]interface{}
			if err := json.Unmarshal(d.Body, &event); err != nil {
				d.Ack(false)
				continue
			}

			eventType := d.RoutingKey
			
			if eventType == "UsuarioRegistrado" {
				userIDStr := fmt.Sprint(event["userId"])
				userID, _ := strconv.Atoi(userIDStr)
				if userID > 0 {
					_, _ = walletSvc.CreateWallet(context.Background(), userID)
				}
			} else if eventType == "PujaSuperada" {
				userIDStr := fmt.Sprint(event["userId"])
				userID, _ := strconv.Atoi(userIDStr)
				
				amountStr := fmt.Sprint(event["amount"])
				amount, _ := strconv.ParseFloat(amountStr, 64)
				
				auctionIDStr := fmt.Sprint(event["auctionId"])
				auctionID, _ := strconv.Atoi(auctionIDStr)
				
				if userID > 0 {
					_, _ = walletSvc.Refund(context.Background(), userID, amount, auctionID)
				}
			} else if eventType == "SubastaCerrada" {
				if event["winnerId"] != nil {
					winnerIDStr := fmt.Sprint(event["winnerId"])
					winnerID, _ := strconv.Atoi(winnerIDStr)
					
					amountStr := fmt.Sprint(event["amount"])
					amount, _ := strconv.ParseFloat(amountStr, 64)
					
					auctionIDStr := fmt.Sprint(event["auctionId"])
					auctionID, _ := strconv.Atoi(auctionIDStr)
					
					if winnerID > 0 {
						_, _ = walletSvc.Charge(context.Background(), winnerID, amount, auctionID)
					}
				}
			}
			d.Ack(false)
		}
	}()
}
