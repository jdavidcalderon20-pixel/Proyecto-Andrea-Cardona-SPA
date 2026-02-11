package com.spa.modelo;

/**
 * Clase Modelo para la entidad Cliente.
 * Representa la estructura de la tabla en la base de datos.
 */
public class Cliente {
    private int id;
    private String nombre;
    private String apellido;
    private String email;

    // Constructor vacío
    public Cliente() {}

    // Constructor con parámetros
    public Cliente(int id, String nombre, String apellido, String email) {
        this.id = id;
        this.nombre = nombre;
        this.apellido = apellido;
        this.email = email;
    }

    // Getters y Setters (Necesarios para que el código funcione)
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getNombres() { return nombre; }
    public void setNombres(String nombre) { this.nombre = nombre; }
    public String getApellidos() { return apellido; }
    public void setApellidos(String apellido) { this.apellido = apellido; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}