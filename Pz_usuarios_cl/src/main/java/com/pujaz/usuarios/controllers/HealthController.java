package com.pujaz.usuarios.controllers;

import com.pujaz.usuarios.services.UserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class HealthController {

    private final UserService userService;

    public HealthController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
            "status", "ok",
            "service", "pz_usuarios_cl",
            "database", "connected",
            "users_count", userService.countUsers()
        );
    }
}
