package services

import (
	"encoding/json"
	"log"
	"os"

	amqp "github.com/rabbitmq/amqp091-go"
)

var RabbitConn *amqp.Connection
var RabbitChannel *amqp.Channel

func InitRabbitMQ() {
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
	RabbitChannel = ch
}

func PublishEvent(exchange, routingKey string, payload interface{}) {
	if RabbitChannel == nil {
		return
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return
	}

	// We declare the exchange as fanout or direct here if needed, or rely on setup script
	err = RabbitChannel.ExchangeDeclare(
		exchange, // name
		"fanout", // type
		true,     // durable
		false,    // auto-deleted
		false,    // internal
		false,    // no-wait
		nil,      // arguments
	)
	if err != nil {
		log.Printf("Failed to declare exchange: %v", err)
	}

	err = RabbitChannel.Publish(
		exchange,   // exchange
		routingKey, // routing key
		false,      // mandatory
		false,      // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		})
	if err != nil {
		log.Printf("Failed to publish message: %v", err)
	}
}
