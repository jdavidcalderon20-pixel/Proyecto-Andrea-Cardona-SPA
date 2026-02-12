package com.andrea.spa.controller;

import org.springframework.web.bind.annotation.*;
import java.util.*;

/**
 * API REST para la gestión de Servicios y Citas del SPA.
 * Evidencia GA7-AA5-EV03 - Proyecto Formativo.
 * @author Juan David Cardona
 */
@RestController
@RequestMapping("/api/servicios")
public class ServicioController {

    // Simulación de base de datos de tratamientos
    @GetMapping("/lista")
    public List<Map<String, String>> obtenerServicios() {
        List<Map<String, String>> servicios = new ArrayList<>();
        servicios.add(Map.of("id", "1", "nombre", "Masaje Relajante", "precio", "80000"));
        servicios.add(Map.of("id", "2", "nombre", "Limpieza Facial", "precio", "120000"));
        servicios.add(Map.of("id", "3", "nombre", "Hidratación Corporal", "precio", "95000"));
        return servicios;
    }

    // Servicio para agendar una cita
    @PostMapping("/agendar")
    public String agendarCita(@RequestBody Map<String, String> cita) {
        String cliente = cita.get("cliente");
        String servicio = cita.get("servicio");
        String fecha = cita.get("fecha");
        
        return "✅ Cita agendada con éxito para " + cliente + " (Servicio: " + servicio + ") el día " + fecha;
    }
}