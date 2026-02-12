package com.andrea.spa.modulowebspa.controller;

import com.andrea.spa.modulo_web_spa.ModuloWebSpaApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = ModuloWebSpaApplication.class)
@AutoConfigureMockMvc
class AuthControllerTest {

    private static final String USUARIO_VALIDO_JSON = "{\"usuario\":\"aprendiz\",\"contrasena\":\"12345\"}";
    private static final String USUARIO_INVALIDO_JSON = "{\"usuario\":\"noExiste\",\"contrasena\":\"incorrecta\"}";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void debeRegistrarYAutenticarUsuario() throws Exception {
        mockMvc.perform(post("/api/auth/registro")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(USUARIO_VALIDO_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mensaje").value("Usuario registrado correctamente"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(USUARIO_VALIDO_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensaje").value("Autenticación satisfactoria"));
    }

    @Test
    void debeFallarAutenticacionConCredencialesInvalidas() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(USUARIO_INVALIDO_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Error en la autenticación"));
    }
}
