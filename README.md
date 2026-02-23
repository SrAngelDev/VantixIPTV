# 📺 VantixIPTV - Reproductor IPTV Profesional

Una aplicación web moderna para reproducir canales IPTV con soporte para listas M3U y Xtream Codes API.

![Angular](https://img.shields.io/badge/Angular-21-red)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-blue)
![Video.js](https://img.shields.io/badge/Video.js-Latest-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)

## ✨ Características

### 🔐 Autenticación Dual
- **Listas M3U/M3U8**: Ingresa una URL directa a tu playlist
- **Xtream Codes API**: Conexión mediante Host, Usuario y Contraseña
- **Persistencia de sesión**: Credenciales guardadas en localStorage

### 🎬 Interfaz de Usuario
- **Dark Mode nativo** con gradientes modernos
- **Sidebar categorizado** con contador de canales por categoría
- **Búsqueda en tiempo real** con filtrado instantáneo
- **Sistema de favoritos** para marcar canales preferidos
- **Diseño responsive** - funciona en desktop, tablet y móvil

### 📹 Reproductor Avanzado
- **Video.js** con soporte para HLS (m3u8)
- **Detección automática** de formatos (m3u8, ts, mp4, webm)
- **Controles personalizados** con diseño moderno
- **Información de canal** superpuesta
- **Manejo robusto de errores** con mensajes descriptivos

## 🚀 Instalación y Uso

### 1️⃣ Instalar Dependencias

```bash
npm install
```

### 2️⃣ Iniciar la Aplicación

```bash
npm start
```

La aplicación estará disponible en `http://localhost:4200`

### 3️⃣ (Opcional) Iniciar Proxy para CORS

Si tienes problemas de CORS:

```bash
# Instalar dependencias del proxy
npm install express cors node-fetch

# Ejecutar el proxy en otra terminal
node proxy-server.js
```

## 🐛 Solución de Problemas

### Error de CORS
- Usa el proxy incluido (ver sección 3️⃣)
- O instala una extensión de navegador para desarrollo

### Stream no reproduce
- Verifica que la URL del stream sea válida
- Asegúrate de que el formato sea M3U8, TS o MP4

**¡Disfruta de tu IPTV Player! 📺✨**


```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
