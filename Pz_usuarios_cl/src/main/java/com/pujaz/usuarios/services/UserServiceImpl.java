package com.pujaz.usuarios.services;

import com.pujaz.usuarios.dto.*;
import com.pujaz.usuarios.models.User;
import com.pujaz.usuarios.repositories.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserEventPublisher eventPublisher;

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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "BAD_USER_INPUT: El nombre es obligatorio");
        }
        if (request.getEmail() == null || !request.getEmail().contains("@")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "BAD_USER_INPUT: Correo electrónico inválido");
        }
        if (request.getPassword() == null || !PASSWORD_PATTERN.matcher(request.getPassword()).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, 
                "BAD_USER_INPUT: La contraseña debe tener mínimo 8 caracteres, incluir al menos una mayúscula, una minúscula y un número");
        }

        if (userRepository.existsByEmail(request.getEmail().trim().toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "USER_ALREADY_EXISTS: El correo ya está registrado");
        }

        String role = (request.getRole() != null && !request.getRole().trim().isEmpty()) 
            ? request.getRole().trim().toLowerCase() : "comprador";

        String encodedPassword = passwordEncoder.encode(request.getPassword());

        User user = new User(
            request.getName().trim(),
            request.getEmail().trim().toLowerCase(),
            encodedPassword,
            role
        );

        User saved = userRepository.save(user);

        // Publicar evento de dominio UsuarioRegistrado a RabbitMQ
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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "BAD_USER_INPUT: Correo y contraseña requeridos");
        }

        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS: Credenciales inválidas"));

        if (!"activa".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ACCOUNT_INACTIVE: La cuenta está inactiva");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS: Credenciales inválidas");
        }

        return new UserResponse(user);
    }

    @Override
    public UserResponse getProfile(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND: Usuario no encontrado"));
        return new UserResponse(user);
    }

    @Override
    public UserResponse updateProfile(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND: Usuario no encontrado"));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            user.setName(request.getName().trim());
        }
        if (request.getRole() != null && !request.getRole().trim().isEmpty()) {
            user.setRole(request.getRole().trim().toLowerCase());
        }

        User updated = userRepository.save(user);
        return new UserResponse(updated);
    }

    @Override
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND: Usuario no encontrado"));
        
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
