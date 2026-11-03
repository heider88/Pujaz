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
        try {
            amqpTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME,
                RabbitMQConfig.ROUTING_KEY,
                event
            );
            System.out.println(" [x] Evento publicado en exchange 'eventos': UsuarioRegistrado ID=" + event.getUserId());
        } catch (Exception e) {
            System.err.println("Error publicando en exchange 'eventos': " + e.getMessage());
        }
    }
}
