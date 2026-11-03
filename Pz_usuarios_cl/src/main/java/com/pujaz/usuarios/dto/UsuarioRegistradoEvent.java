package com.pujaz.usuarios.dto;

import java.time.LocalDateTime;

public class UsuarioRegistradoEvent {
    private Long userId;
    private String name;
    private String email;
    private String role;
    private String timestamp;

    public UsuarioRegistradoEvent() {}

    public UsuarioRegistradoEvent(Long userId, String name, String email, String role) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.role = role;
        this.timestamp = LocalDateTime.now().toString();
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
}
