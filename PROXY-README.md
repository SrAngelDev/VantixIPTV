# Servidor Proxy para IPTV

Servidor proxy simple para evitar problemas de CORS al acceder a servidores IPTV desde el navegador.

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
Copia el archivo de ejemplo y ajusta los valores:
```bash
copy .env.example .env
```

### 3. Iniciar el servidor
```bash
# Opción 1: Usando npm script
npm run proxy

# Opción 2: Directamente con node
node proxy-server.js
```

## ⚙️ Configuración

Edita el archivo `.env` para personalizar:

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor proxy | `8080` |
| `FETCH_TIMEOUT` | Timeout de peticiones (ms) | `15000` |
| `PROXY_BASE_URL` | URL base del proxy | `http://localhost:8080` |

### Cambiar el puerto

Si necesitas usar otro puerto, simplemente edita `.env`:
```env
PORT=5000
```

O usa una variable de entorno temporal:
```bash
# PowerShell
$env:PORT=5000; node proxy-server.js

# CMD
set PORT=5000 && node proxy-server.js
```

## 📝 Uso

Una vez iniciado el servidor, puedes usarlo para hacer peticiones:

```
http://localhost:8080/proxy?url=URL_DEL_SERVIDOR_IPTV
```

### Ejemplo con lista M3U
```
http://localhost:8080/proxy?url=http://example.com/playlist.m3u8
```

### Health Check
Verifica que el servidor está funcionando:
```
http://localhost:8080/health
```

## 🔧 Características

- ✅ Evita problemas de CORS
- ✅ Soporte para HLS (m3u8)
- ✅ Reescritura automática de URLs en playlists
- ✅ Headers personalizados
- ✅ Timeout configurable
- ✅ Manejo de errores robusto

## ⚠️ Notas Importantes

### Permisos de Puerto
- En Windows, los puertos < 1024 pueden requerir permisos de administrador
- Se recomienda usar puertos > 1024 (como el 8080 por defecto)
- Si el puerto 8080 está ocupado, usa otro (ej: 5000, 3001, 8888)

### Solo para Desarrollo
Este proxy es solo para desarrollo/pruebas. Para producción, usa soluciones más robustas como:
- NGINX como reverse proxy
- Configuración de CORS en el servidor IPTV
- API Gateway (AWS API Gateway, Azure API Management, etc.)

## 🛑 Detener el Servidor

Presiona `Ctrl+C` en la terminal donde está corriendo el servidor.

## 🐛 Solución de Problemas

### El servidor se detiene inmediatamente
- Verifica que todas las dependencias estén instaladas: `npm install`
- Revisa que el puerto no esté bloqueado por el firewall
- Prueba con otro puerto en el archivo `.env`

### Error EACCES: permission denied
- Usa un puerto > 1024
- Cambia el puerto en `.env` a 8080, 5000 o similar

### Error EADDRINUSE: port already in use
- El puerto ya está siendo usado por otro proceso
- Cambia el puerto en `.env` o detén el otro proceso
