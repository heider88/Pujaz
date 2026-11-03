package com.pujaz.usuarios.services;

import com.pujaz.usuarios.config.ApiException;
import com.pujaz.usuarios.dto.*;
import com.pujaz.usuarios.models.User;
import com.pujaz.usuarios.repositories.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserEventPublisher eventPublisher;

    // Regla: mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula y 1 número
    private static final Pattern PASSWORD_PATTERN = 
        Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$");

    public UserServiceImpl(UserRepository userRepository, 
                           PasswordEncoder passwordEncoder,
                           UserEventPublisher eventPublisher) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.eventPublisher = eventPublisher;
    }

    @Override
    public long countUsers() {
        return userRepository.count();
    }

    @Override
    public UserResponse register(RegisterRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_USER_INPUT", "El nombre es obligatorio");
        }
        if (request.getEmail() == null || !request.getEmail().contains("@")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_USER_INPUT", "Correo electrónico inválido");
        }
        if (request.getPassword() == null || !PASSWORD_PATTERN.matcher(request.getPassword()).matches()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_USER_INPUT", 
                "La contraseña debe tener mínimo 8 caracteres, incluir al menos una mayúscula, una minúscula y un número");
        }

        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "El correo ya está registrado");
        }

        String role = (request.getRole() != null && !request.getRole().trim().isEmpty()) 
            ? request.getRole().trim().toLowerCase() : "comprador";

        String encodedPassword = passwordEncoder.encode(request.getPassword());

        User user = new User(
            request.getName().trim(),
            normalizedEmail,
            encodedPassword,
            role
        );

        User saved = userRepository.save(user);

        try {
            UsuarioRegistradoEvent event = new UsuarioRegistradoEvent(
                saved.getId(),
                saved.getName(),
                saved.getEmail(),
                saved.getRole()
            );
            eventPublisher.publishUserRegistered(event);
        } catch (Exception e) {
            System.err.println("Error publicando evento en RabbitMQ: " + e.getMessage());
        }

        return new UserResponse(saved);
    }

    @Override
    public UserResponse login(LoginRequest request) {
        if (request.getEmail() == null || request.getPassword() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_USER_INPUT", "Correo y contraseña requeridos");
        }

        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Credenciales inválidas"));

        if (!"activa".equalsIgnoreCase(user.getStatus())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Credenciales inválidas");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Credenciales inválidas");
        }

        return new UserResponse(user);
    }

    @Override
    public UserResponse getProfile(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Usuario no encontrado"));
        return new UserResponse(user);
    }

    @Override
    public UserResponse updateProfile(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Usuario no encontrado"));

        if (request.getName() != null) {
            String trimmedName = request.getName().trim();
            if (trimmedName.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_USER_INPUT", "El nombre no puede estar vacío");
            }
            user.setName(trimmedName);
        }

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.contains("@")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_USER_INPUT", "Correo electrónico inválido");
            }
            if (!newEmail.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(newEmail)) {
                throw new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "El correo ya está registrado");
            }
            user.setEmail(newEmail);
        }

        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            if (!PASSWORD_PATTERN.matcher(request.getPassword()).matches()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_USER_INPUT", 
                    "La contraseña debe tener mínimo 8 caracteres, incluir al menos una mayúscula, una minúscula y un número");
            }
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        User updated = userRepository.save(user);
        return new UserResponse(updated);
    }

    @Override
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Usuario no encontrado"));
        
        user.setStatus("inactiva");
        userRepository.save(user);
    }

    @Override
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
            .map(UserResponse::new)
            .collect(Collectors.toList());
    }
}
