# Módulo Web SPA - Evidencia GA7-220501096-AA5-EV01

Servicio web construido con Spring Boot para registro e inicio de sesión.

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

### Respuestas esperadas
- Éxito de login:
```json
{
  "mensaje": "Autenticación satisfactoria"
}
```
- Error de autenticación:
```json
{
  "mensaje": "Error en la autenticación"
}
```

> Nota: por simplicidad académica, este ejemplo usa almacenamiento en memoria.
