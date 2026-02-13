package com.andrea.spa.modulowebspa.controller;

import com.andrea.spa.modulowebspa.dto.cliente.ClienteOperacionResponse;
import com.andrea.spa.modulowebspa.dto.cliente.ClienteRequest;
import com.andrea.spa.modulowebspa.dto.cliente.ClienteResponse;
import com.andrea.spa.modulowebspa.service.ClienteService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    private final ClienteService clienteService;

    public ClienteController(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClienteResponse crearCliente(@Valid @RequestBody ClienteRequest request) {
        return clienteService.crear(request);
    }

    @PutMapping("/{id}")
    public ClienteResponse actualizarCliente(@PathVariable Integer id, @Valid @RequestBody ClienteRequest request) {
        return clienteService.actualizar(id, request);
    }

    @DeleteMapping("/{id}")
    public ClienteOperacionResponse eliminarCliente(@PathVariable Integer id) {
        return clienteService.eliminar(id);
    }
}
