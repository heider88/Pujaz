package com.pujaz.usuarios;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pujaz.usuarios.dto.LoginRequest;
import com.pujaz.usuarios.dto.RegisterRequest;
import com.pujaz.usuarios.dto.UpdateUserRequest;
import com.pujaz.usuarios.models.User;
import com.pujaz.usuarios.repositories.UserRepository;
import com.pujaz.usuarios.services.UserEventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class UserIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserEventPublisher eventPublisher;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        User ana = new User("Ana", "ana@correo.com", passwordEncoder.encode("12345678"), "comprador");
        userRepository.save(ana);
    }

    @Test
    @DisplayName("1. Healthcheck debe responder ok y contar usuarios")
    void testHealthCheck() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("ok")))
                .andExpect(jsonPath("$.service", is("pz_usuarios_cl")))
                .andExpect(jsonPath("$.users_count", is(1)));
    }

    @Test
    @DisplayName("2. Registro exitoso con contraseña fuerte")
    void testRegisterSuccess() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setName("Carlos");
        request.setEmail("carlos@correo.com");
        request.setPassword("Segura123");
        request.setRole("comprador");

        mockMvc.perform(post("/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name", is("Carlos")))
                .andExpect(jsonPath("$.email", is("carlos@correo.com")))
                .andExpect(jsonPath("$.role", is("comprador")));
    }

    @Test
    @DisplayName("3. Rechazo de registro con contraseña débil (sin número)")
    void testRegisterWeakPassword() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setName("Debil");
        request.setEmail("debil@correo.com");
        request.setPassword("SoloLetrasMayus");

        mockMvc.perform(post("/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("4. Rechazo de registro con correo duplicado")
    void testRegisterDuplicateEmail() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setName("Clon");
        request.setEmail("ana@correo.com");
        request.setPassword("Valida123");

        mockMvc.perform(post("/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("5. Login exitoso con BCrypt")
    void testLoginSuccess() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("ana@correo.com");
        request.setPassword("12345678");

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("ana@correo.com")))
                .andExpect(jsonPath("$.name", is("Ana")));
    }

    @Test
    @DisplayName("6. Login fallido con contraseña incorrecta")
    void testLoginInvalidPassword() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("ana@correo.com");
        request.setPassword("incorrecta123");

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("7. Consultar perfil por ID existente")
    void testGetProfileSuccess() throws Exception {
        User ana = userRepository.findByEmail("ana@correo.com").orElseThrow();

        mockMvc.perform(get("/users/" + ana.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Ana")));
    }

    @Test
    @DisplayName("8. Consultar perfil de ID inexistente debe dar 404")
    void testGetProfileNotFound() throws Exception {
        mockMvc.perform(get("/users/9999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("9. Actualizar perfil con PATCH")
    void testUpdateProfile() throws Exception {
        User ana = userRepository.findByEmail("ana@correo.com").orElseThrow();
        UpdateUserRequest update = new UpdateUserRequest();
        update.setName("Ana Maria");
        update.setRole("vendedor");

        mockMvc.perform(patch("/users/" + ana.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Ana Maria")))
                .andExpect(jsonPath("$.role", is("vendedor")));
    }

    @Test
    @DisplayName("10. Eliminar cuenta y verificar que bloquea el login")
    void testDeleteAndBlockLogin() throws Exception {
        User ana = userRepository.findByEmail("ana@correo.com").orElseThrow();

        mockMvc.perform(delete("/users/" + ana.getId()))
                .andExpect(status().isNoContent());

        LoginRequest request = new LoginRequest();
        request.setEmail("ana@correo.com");
        request.setPassword("12345678");

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }
}
