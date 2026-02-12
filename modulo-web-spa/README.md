# Módulo Web SPA - Evidencia GA7-220501096-AA5-EV01

Servicio web construido con Spring Boot para:
- registro e inicio de sesión
- gestión básica de clientes (crear, actualizar, eliminar)

## Requisitos
- Java 17+
- Maven (o usar `./mvnw`)

## Ejecutar
```bash
./mvnw spring-boot:run
```

## API
### Registrar usuario
**POST** `/api/auth/registro`

```json
{
  "usuario": "aprendiz",
  "contrasena": "12345"
}
```

### Iniciar sesión
**POST** `/api/auth/login`

```json
{
  "usuario": "aprendiz",
  "contrasena": "12345"
}
```

### Crear cliente
**POST** `/api/clientes`

```json
{
  "nombre": "Andrea",
  "apellido": "Cardona",
  "email": "andrea@correo.com"
}
```

### Actualizar cliente
**PUT** `/api/clientes/{id}`

```json
{
  "nombre": "Andrea",
  "apellido": "Calderon",
  "email": "andrea.calderon@correo.com"
}
```

### Eliminar cliente
**DELETE** `/api/clientes/{id}`

### Respuestas esperadas
- Éxito de login:
```json
{
  "mensaje": "Autenticación satisfactoria"
}
```
- Cliente eliminado:
```json
{
  "mensaje": "Cliente eliminado correctamente"
}
```

> Nota: por simplicidad académica, este ejemplo usa almacenamiento en memoria.
