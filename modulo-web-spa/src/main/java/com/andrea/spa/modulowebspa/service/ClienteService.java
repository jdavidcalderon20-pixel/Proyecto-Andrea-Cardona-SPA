package com.andrea.spa.modulowebspa.service;

import com.andrea.spa.modulowebspa.dto.cliente.ClienteOperacionResponse;
import com.andrea.spa.modulowebspa.dto.cliente.ClienteRequest;
import com.andrea.spa.modulowebspa.dto.cliente.ClienteResponse;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class ClienteService {

    private final Map<Integer, ClienteResponse> clientes = new ConcurrentHashMap<>();
    private final AtomicInteger secuenciaId = new AtomicInteger(1);

    public ClienteResponse crear(ClienteRequest request) {
        int id = secuenciaId.getAndIncrement();
        ClienteResponse cliente = new ClienteResponse(id, request.nombre(), request.apellido(), request.email());
        clientes.put(id, cliente);
        return cliente;
    }

    public ClienteResponse actualizar(Integer id, ClienteRequest request) {
        validarExistencia(id);

        ClienteResponse actualizado = new ClienteResponse(id, request.nombre(), request.apellido(), request.email());
        clientes.put(id, actualizado);
        return actualizado;
    }

    public ClienteOperacionResponse eliminar(Integer id) {
        validarExistencia(id);
        clientes.remove(id);
        return new ClienteOperacionResponse("Cliente eliminado correctamente");
    }

    private void validarExistencia(Integer id) {
        if (!clientes.containsKey(id)) {
            throw new NoSuchElementException("Cliente no encontrado");
        }
    }
}
