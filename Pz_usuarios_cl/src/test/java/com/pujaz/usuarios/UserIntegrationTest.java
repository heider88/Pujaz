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

import static org.hamcrest.Matchers.*;
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
        User heider = new User("Heider", "heider@correo.com", passwordEncoder.encode("12345678"), "vendedor");
        userRepository.save(heider);
    }

    @Test
    @DisplayName("1. Healthcheck debe responder ok y contar usuarios")
    void testHealthCheck() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("ok")))
                .andExpect(jsonPath("$.service", is("pz_usuarios_cl")))
                .andExpect(jsonPath("$.users_count", is(2)));
    }

    @Test
    @DisplayName("2. Registro exitoso devuelve id como texto String")
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
                .andExpect(jsonPath("$.id", isA(String.class)))
                .andExpect(jsonPath("$.name", is("Carlos")))
                .andExpect(jsonPath("$.email", is("carlos@correo.com")))
                .andExpect(jsonPath("$.role", is("comprador")));
    }

    @Test
    @DisplayName("3. Rechazo de contraseña débil devuelve {code: BAD_USER_INPUT, message}")
    void testRegisterWeakPassword() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setName("Debil");
        request.setEmail("debil@correo.com");
        request.setPassword("SoloLetrasMayus");

        mockMvc.perform(post("/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("BAD_USER_INPUT")))
                .andExpect(jsonPath("$.message", not(emptyOrNullString())));
    }

    @Test
    @DisplayName("4. Rechazo de correo duplicado devuelve 409 EMAIL_TAKEN")
    void testRegisterDuplicateEmail() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setName("Clon");
        request.setEmail("ana@correo.com");
        request.setPassword("Valida123");

        mockMvc.perform(post("/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("EMAIL_TAKEN")))
                .andExpect(jsonPath("$.message", not(emptyOrNullString())));
    }

    @Test
    @DisplayName("5. Login exitoso en POST /users/verify-credentials con id como texto")
    void testVerifyCredentialsSuccess() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("ana@correo.com");
        request.setPassword("12345678");

        mockMvc.perform(post("/users/verify-credentials")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", isA(String.class)))
                .andExpect(jsonPath("$.email", is("ana@correo.com")))
                .andExpect(jsonPath("$.name", is("Ana")));
    }

    @Test
    @DisplayName("6. Login fallido devuelve 401 INVALID_CREDENTIALS")
    void testLoginInvalidPassword() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("ana@correo.com");
        request.setPassword("incorrecta123");

        mockMvc.perform(post("/users/verify-credentials")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("INVALID_CREDENTIALS")))
                .andExpect(jsonPath("$.message", not(emptyOrNullString())));
    }

    @Test
    @DisplayName("7. Consultar perfil existente devuelve id como String")
    void testGetProfileSuccess() throws Exception {
        User ana = userRepository.findByEmail("ana@correo.com").orElseThrow();

        mockMvc.perform(get("/users/" + ana.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(String.valueOf(ana.getId()))))
                .andExpect(jsonPath("$.name", is("Ana")));
    }

    @Test
    @DisplayName("8. Consultar perfil inexistente devuelve 404 NOT_FOUND")
    void testGetProfileNotFound() throws Exception {
        mockMvc.perform(get("/users/9999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code", is("NOT_FOUND")))
                .andExpect(jsonPath("$.message", not(emptyOrNullString())));
    }

    @Test
    @DisplayName("9. Actualizar perfil (nombre, email y password) sin permitir cambiar role")
    void testUpdateProfileEmailAndPassword() throws Exception {
        User ana = userRepository.findByEmail("ana@correo.com").orElseThrow();

        String jsonPayload = "{\"name\":\"Ana Maria\",\"email\":\"anamaria@correo.com\",\"password\":\"NuevaClave123\",\"role\":\"vendedor\"}";

        mockMvc.perform(patch("/users/" + ana.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Ana Maria")))
                .andExpect(jsonPath("$.email", is("anamaria@correo.com")))
                .andExpect(jsonPath("$.role", is("comprador"))); // role NO debe cambiar

        // Verificar que pueda iniciar sesión con el nuevo correo y la nueva contraseña
        LoginRequest loginReq = new LoginRequest();
        loginReq.setEmail("anamaria@correo.com");
        loginReq.setPassword("NuevaClave123");

        mockMvc.perform(post("/users/verify-credentials")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("10. Actualizar perfil con email de otro usuario devuelve 409 EMAIL_TAKEN")
    void testUpdateProfileDuplicateEmail() throws Exception {
        User ana = userRepository.findByEmail("ana@correo.com").orElseThrow();
        UpdateUserRequest update = new UpdateUserRequest();
        update.setEmail("heider@correo.com");

        mockMvc.perform(patch("/users/" + ana.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("EMAIL_TAKEN")));
    }

    @Test
    @DisplayName("11. Eliminar cuenta y verificar bloqueo con 401 INVALID_CREDENTIALS")
    void testDeleteAndBlockLogin() throws Exception {
        User ana = userRepository.findByEmail("ana@correo.com").orElseThrow();

        mockMvc.perform(delete("/users/" + ana.getId()))
                .andExpect(status().isNoContent());

        LoginRequest request = new LoginRequest();
        request.setEmail("ana@correo.com");
        request.setPassword("12345678");

        mockMvc.perform(post("/users/verify-credentials")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("INVALID_CREDENTIALS")));
    }
}
