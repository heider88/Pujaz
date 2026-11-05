package com.pujaz.usuarios.dto;

import com.pujaz.usuarios.models.User;
import java.time.LocalDateTime;

public class UserResponse {
    private String id;
    private String name;
    private String email;
    private String role;
    private String status;
    private LocalDateTime createdAt;

    public UserResponse() {}

    public UserResponse(User user) {
        this.id = user.getId() != null ? String.valueOf(user.getId()) : null;
        this.name = user.getName();
        this.email = user.getEmail();
        this.role = user.getRole();
        this.status = user.getStatus();
        this.createdAt = user.getCreatedAt();
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
