package com.spa.main;

import com.spa.dao.ClienteDAO;
import com.spa.modelo.Cliente;

/**
 * Clase principal del proyecto Andrea Cardona SPA.
 * Esta clase se encarga de ejecutar las pruebas de persistencia de datos 
 * utilizando el patrón DAO y la conexión JDBC.
 * * @author Juan David Cardona
 */
public class Main {
    public static void main(String[] args) {
        ClienteDAO dao = new ClienteDAO();

        // 1. Crear un cliente de prueba para la evidencia
        Cliente nuevoCliente = new Cliente(0, "Juan David", "Cardona", "juan@sena.edu.co");

        // 2. Intentar insertar
        System.out.println("Enviando datos a la base de datos...");
        if (dao.insertar(nuevoCliente)) {
            System.out.println("✅ ¡Éxito! Cliente guardado en Andrea Cardona SPA.");
        }

        // 3. Mostrar la lista actualizada
        dao.listarClientes();
    }
}