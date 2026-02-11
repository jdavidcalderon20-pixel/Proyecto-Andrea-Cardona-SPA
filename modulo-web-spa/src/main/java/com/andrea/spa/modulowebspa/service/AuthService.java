package com.andrea.spa.modulowebspa.service;

import com.andrea.spa.modulowebspa.dto.AuthResponse;
import com.andrea.spa.modulowebspa.dto.LoginRequest;
import com.andrea.spa.modulowebspa.dto.RegistroRequest;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    // Mapa en memoria para almacenar temporalmente usuarios y contraseñas.
    // Para un proyecto productivo se recomienda usar base de datos y hash seguro.
    private final Map<String, String> usuarios = new ConcurrentHashMap<>();

    public AuthResponse registrar(RegistroRequest request) {
        // Evita que se sobrescriba un usuario ya registrado.
        if (usuarios.containsKey(request.usuario())) {
            throw new IllegalArgumentException("El usuario ya existe");
        }

        usuarios.put(request.usuario(), request.contrasena());
        return new AuthResponse("Usuario registrado correctamente");
    }

    public AuthResponse iniciarSesion(LoginRequest request) {
        String contrasenaGuardada = usuarios.get(request.usuario());

        // Valida que el usuario exista y que la contraseña coincida.
        if (contrasenaGuardada == null || !contrasenaGuardada.equals(request.contrasena())) {
            throw new IllegalArgumentException("Error en la autenticación");
        }

        return new AuthResponse("Autenticación satisfactoria");
    }
}
