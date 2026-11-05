package com.pujaz.usuarios.services;

import com.pujaz.usuarios.dto.LoginRequest;
import com.pujaz.usuarios.dto.RegisterRequest;
import com.pujaz.usuarios.dto.UpdateUserRequest;
import com.pujaz.usuarios.dto.UserResponse;
import java.util.List;

public interface UserService {
    long countUsers();
    UserResponse register(RegisterRequest request);
    UserResponse login(LoginRequest request);
    UserResponse getProfile(Long id);
    UserResponse updateProfile(Long id, UpdateUserRequest request);
    void deleteUser(Long id);
    List<UserResponse> getAllUsers();
}
