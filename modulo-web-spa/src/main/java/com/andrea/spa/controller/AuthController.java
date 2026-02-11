package com.andrea.spa.controller;

import org.springframework.web.bind.annotation.*;
import java.util.Map;

/**
 * Servicio Web (API REST) para la Autenticación del SPA.
 * Requisito: Registro e Inicio de Sesión - Evidencia GA7-AA5-EV01.
 * @author Juan David Cardona
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    /**
     * Endpoint para validar el ingreso de usuarios.
     * @param credentials Datos en formato JSON (usuario y password).
     * @return Mensaje de éxito o error.
     */
    @PostMapping("/login")
    public String login(@RequestBody Map<String, String> credentials) {
        String usuario = credentials.get("usuario");
        String password = credentials.get("password");

        // Simulación de validación según el caso de estudio
        if ("admin".equals(usuario) && "12345".equals(password)) {
            return "✅ Autenticación satisfactoria. ¡Bienvenido al sistema!";
        } else {
            return "❌ Error en la autenticación. Credenciales incorrectas.";
        }
    }
}