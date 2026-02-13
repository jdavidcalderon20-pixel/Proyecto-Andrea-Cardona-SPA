package com.andrea.spa.modulowebspa.dto.cliente;

public record ClienteResponse(
        Integer id,
        String nombre,
        String apellido,
        String email
) {
}
