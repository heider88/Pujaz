package com.pujaz.usuarios.services;

import com.pujaz.usuarios.config.RabbitMQConfig;
import com.pujaz.usuarios.dto.UsuarioRegistradoEvent;
import org.springframework.amqp.core.AmqpTemplate;
import org.springframework.stereotype.Service;

@Service
public class UserEventPublisher {

    private final AmqpTemplate amqpTemplate;

    public UserEventPublisher(AmqpTemplate amqpTemplate) {
        this.amqpTemplate = amqpTemplate;
    }

    public void publishUserRegistered(UsuarioRegistradoEvent event) {
        // Publicar al exchange "eventos" de Heider (fanout -> billetera_eventos)
        try {
            amqpTemplate.convertAndSend("eventos", "UsuarioRegistrado", event);
        } catch (Exception e) {
            System.err.println("Aviso eventos: " + e.getMessage());
        }

        // Publicar a la cola directa de usuarios
        try {
            amqpTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_NAME, RabbitMQConfig.ROUTING_KEY, event);
        } catch (Exception e) {
            System.err.println("Aviso pujaz.exchange: " + e.getMessage());
        }

        System.out.println(" [x] Evento publicado en RabbitMQ para billetera: UsuarioRegistrado ID=" + event.getUserId());
    }
}
