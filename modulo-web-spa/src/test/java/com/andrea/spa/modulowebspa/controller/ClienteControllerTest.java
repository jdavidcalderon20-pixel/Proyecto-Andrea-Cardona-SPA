package com.andrea.spa.modulowebspa.controller;

import com.andrea.spa.modulo_web_spa.ModuloWebSpaApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = ModuloWebSpaApplication.class)
@AutoConfigureMockMvc
class ClienteControllerTest {

    private static final String CLIENTE_INICIAL = "{\"nombre\":\"Andrea\",\"apellido\":\"Cardona\",\"email\":\"andrea@correo.com\"}";
    private static final String CLIENTE_ACTUALIZADO = "{\"nombre\":\"Andrea\",\"apellido\":\"Calderon\",\"email\":\"andrea.calderon@correo.com\"}";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void debeCrearActualizarYEliminarCliente() throws Exception {
        mockMvc.perform(post("/api/clientes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CLIENTE_INICIAL))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.nombre").value("Andrea"));

        mockMvc.perform(put("/api/clientes/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CLIENTE_ACTUALIZADO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.apellido").value("Calderon"));

        mockMvc.perform(delete("/api/clientes/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensaje").value("Cliente eliminado correctamente"));
    }

    @Test
    void debeRetornarNotFoundAlActualizarClienteInexistente() throws Exception {
        mockMvc.perform(put("/api/clientes/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CLIENTE_ACTUALIZADO))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensaje").value("Cliente no encontrado"));
    }
}
