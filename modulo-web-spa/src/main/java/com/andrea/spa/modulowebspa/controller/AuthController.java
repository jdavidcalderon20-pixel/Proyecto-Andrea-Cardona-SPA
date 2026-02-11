package com.andrea.spa.modulowebspa.controller;

import com.andrea.spa.modulowebspa.dto.AuthResponse;
import com.andrea.spa.modulowebspa.dto.LoginRequest;
import com.andrea.spa.modulowebspa.dto.RegistroRequest;
import com.andrea.spa.modulowebspa.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // Endpoint para registrar nuevos usuarios.
    @PostMapping("/registro")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse registrar(@Valid @RequestBody RegistroRequest request) {
        return authService.registrar(request);
    }

    // Endpoint para validar usuario y contraseña en el inicio de sesión.
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.iniciarSesion(request);
    }
}
