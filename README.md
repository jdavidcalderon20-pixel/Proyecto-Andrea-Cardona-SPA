# Proyecto-Andrea-Cardona-SPA

Repositorio de versiones proyecto Andrea Cardona SPA.

## Proyecto anterior (SPA)
Para ejecutar el proyecto SPA original, importa el archivo `.sql` en phpMyAdmin (XAMPP) y abre `interfaz_spa.html` en el navegador a través de `http://localhost:8080/AndreaCardonaSPA/interfaz_spa.html`.

- phpMyAdmin: `http://localhost:8080/phpmyadmin`
- Credenciales de ejemplo: `admin@spa.com / 1234`
- Puerto MySQL esperado: `3308`

## Evidencia GA7-220501096-AA5-EV01 (servicio web)
Dentro de la carpeta `modulo-web-spa` se implementó el servicio web de:
- Registro de usuario.
- Inicio de sesión (autenticación correcta o error de autenticación).

### Ejecución rápida
```bash
cd modulo-web-spa
./mvnw spring-boot:run
```

### Endpoints
- `POST /api/auth/registro`
- `POST /api/auth/login`

### Entrega sugerida (ZIP)
1. Incluir los archivos del proyecto.
2. Incluir el archivo `ENLACE_REPOSITORIO.txt` con la URL del repositorio.
3. Comprimir con el formato solicitado: `NOMBRE_APELLIDO_AA5_EV01.zip`.
