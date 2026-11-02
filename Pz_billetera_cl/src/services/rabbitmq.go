package services

import (
	"context"
	"encoding/json"
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

			// We need to route based on routing key (but we used fanout, so we need event type in payload or just parse it)
			// Wait, the publisher uses "eventos" exchange and routingKey as the event type!
			// If it's a fanout, the routing key is ignored.
			// The KAN-65 says we can use direct exchange or topic.
			// Let's check routing key.
			eventType := d.RoutingKey
			
			if eventType == "PujaSuperada" {
				userID := int(event["userId"].(float64))
				amount := event["amount"].(float64)
				auctionID := int(event["auctionId"].(float64))
				_, _ = walletSvc.Refund(context.Background(), userID, amount, auctionID)
			} else if eventType == "SubastaCerrada" {
				if event["winnerId"] != nil {
					// Wait, winnerId might be float64 if sent as int from publisher?
					// Ah, in publisher: "winnerId": a.WinnerID (which is *int), but it will be serialized as number.
					// Let's parse safely
					var winnerID int
					switch v := event["winnerId"].(type) {
					case float64:
						winnerID = int(v)
					case string:
						winnerID, _ = strconv.Atoi(v)
					}
					
					amount := event["amount"].(float64)
					// Wait, we need auctionId as well to pass to Charge (cobrar)
					auctionIDStr := event["auctionId"].(string)
					auctionID, _ := strconv.Atoi(auctionIDStr)
					
					_, _ = walletSvc.Charge(context.Background(), winnerID, amount, auctionID)
				}
			}
			d.Ack(false)
		}
	}()
}
