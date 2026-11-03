package com.pujaz.usuarios.services;

import com.pujaz.usuarios.models.User;
import java.util.Optional;

public interface UserService {
    long countUsers();
    Optional<User> findById(Long id);
    Optional<User> findByEmail(String email);
}
