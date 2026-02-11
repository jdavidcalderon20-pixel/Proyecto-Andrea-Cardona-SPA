package com.spa.conexion;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

// Clase encargada de establecer la comunicación con el servidor MySQL en el puerto 3308.

public class Conexion {
    // Puerto 3308
    private static final String URL = "jdbc:mysql://localhost:3308/andrea_cardona_spa";
    private static final String USER = "root";
    private static final String PASS = "";

    public static Connection conectar() {
        Connection con = null;
        try {
            // Cargar el driver (importante en versiones antiguas de Java)
            Class.forName("com.mysql.cj.jdbc.Driver");
            con = DriverManager.getConnection(URL, USER, PASS);
        } catch (ClassNotFoundException | SQLException e) {
            System.out.println("❌ Error en la conexión: " + e.getMessage());
        }
        return con;
    }
}