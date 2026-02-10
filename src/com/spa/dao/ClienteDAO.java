package com.spa.dao;

import com.spa.conexion.Conexion;
import com.spa.modelo.Cliente;
import java.sql.*;

public class ClienteDAO {
    
    // 1. Método para INSERTAR (Create)
    public boolean insertar(Cliente cliente) {
        String sql = "INSERT INTO cliente (nombres, apellidos, email) VALUES (?, ?, ?)";
        try (Connection con = Conexion.conectar(); 
             PreparedStatement ps = con.prepareStatement(sql)) {
            
            ps.setString(1, cliente.getNombres());
            ps.setString(2, cliente.getApellidos());
            ps.setString(3, cliente.getEmail());
            ps.executeUpdate();
            return true;
        } catch (SQLException e) {
            System.out.println("❌ Error al insertar: " + e.getMessage());
            return false;
        }
    }

    // 2. Método para CONSULTAR (Read)
    public void listarClientes() {
        String sql = "SELECT * FROM cliente";
        try (Connection con = Conexion.conectar();
             Statement st = con.createStatement();
             ResultSet rs = st.executeQuery(sql)) {
            
            System.out.println("\n--- LISTA DE CLIENTES EN ANDREASPA ---");
            while (rs.next()) {
                System.out.println("ID: " + rs.getInt("id_cliente") + 
                                   " | " + rs.getString("nombres") + 
                                   " " + rs.getString("apellidos") +
                                   " | Email: " + rs.getString("email"));
            }
        } catch (SQLException e) {
            System.out.println("❌ Error al listar: " + e.getMessage());
        }
    }

    // 3. Método para ACTUALIZAR (Update)
    public boolean actualizar(Cliente cliente) {
        // Actualizamos el email y nombre basándonos en el ID
        String sql = "UPDATE cliente SET nombres = ?, apellidos = ?, email = ? WHERE id_cliente = ?";
        try (Connection con = Conexion.conectar(); 
             PreparedStatement ps = con.prepareStatement(sql)) {
            
            ps.setString(1, cliente.getNombres());
            ps.setString(2, cliente.getApellidos());
            ps.setString(3, cliente.getEmail());
            ps.setInt(4, cliente.getId()); // Usamos el ID para saber cuál editar
            
            int filasAfectadas = ps.executeUpdate();
            return filasAfectadas > 0;
        } catch (SQLException e) {
            System.out.println("❌ Error al actualizar: " + e.getMessage());
            return false;
        }
    }

    // 4. Método para ELIMINAR (Delete)
    public boolean eliminar(int id) {
        String sql = "DELETE FROM cliente WHERE id_cliente = ?";
        try (Connection con = Conexion.conectar(); 
             PreparedStatement ps = con.prepareStatement(sql)) {
            
            ps.setInt(1, id);
            int filasAfectadas = ps.executeUpdate();
            return filasAfectadas > 0;
        } catch (SQLException e) {
            System.out.println("❌ Error al eliminar: " + e.getMessage());
            return false;
        }
    }
}