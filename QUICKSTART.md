# 🎯 Guía de Inicio Rápido - VantixIPTV

## ✅ ¿Qué se ha implementado?

### 📦 Estructura Completa del Proyecto

```
VantixIPTV/
├── src/app/
│   ├── components/
│   │   ├── login/                    ✅ Componente de autenticación
│   │   ├── dashboard/                ✅ Dashboard principal con sidebar
│   │   └── video-player/             ✅ Reproductor Video.js con HLS
│   ├── services/
│   │   ├── iptv.service.ts          ✅ Servicio principal IPTV
│   │   ├── m3u-parser.service.ts    ✅ Parser de listas M3U
│   │   └── storage.service.ts       ✅ Gestión de localStorage
│   └── models/
│       ├── channel.interface.ts      ✅ Interfaces principales
│       └── m3u-parser.interface.ts   ✅ Interfaces para M3U
├── proxy-server.js                   ✅ Servidor proxy para CORS
├── README.md                         ✅ Documentación completa
└── ARCHITECTURE.md                   ✅ Documentación técnica
```

## 🚀 Cómo Ejecutar

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Iniciar la Aplicación
```bash
npm start
```

Abre tu navegador en `http://localhost:4200`

### 3. (Opcional) Iniciar Proxy para CORS
En otra terminal:
```bash
npm install express cors node-fetch
node proxy-server.js
```

## 🎮 Cómo Usar la Aplicación

### Paso 1: Login

Tienes dos opciones:

**Opción A - Lista M3U:**
1. Selecciona "M3U URL"
2. Ingresa la URL de tu lista M3U/M3U8
3. Ejemplo: `http://ejemplo.com/playlist.m3u8`
4. Click "Conectar"

**Opción B - Xtream Codes:**
1. Selecciona "Xtream Codes"
2. Completa los campos:
   - Host: `http://servidor.com:8080`
   - Usuario: tu usuario
   - Contraseña: tu contraseña
3. Click "Conectar"

### Paso 2: Dashboard

Una vez autenticado:
- **Sidebar izquierdo**: Navega por categorías
- **Barra superior**: Busca canales por nombre
- **Grid central**: Lista de canales
- **Click en un canal**: Comienza a reproducir
- **Icono ⭐**: Marca/desmarca favoritos

### Paso 3: Reproducir

- El reproductor se carga automáticamente al seleccionar un canal
- Usa los controles de Video.js (play, volumen, pantalla completa)
- Cambia de canal en cualquier momento

## 🔑 Características Principales Implementadas

### ✅ Autenticación Dual
- ✅ Soporte M3U/M3U8 por URL
- ✅ Soporte Xtream Codes API
- ✅ Persistencia de credenciales en localStorage
- ✅ Validación de formularios

### ✅ Interfaz de Usuario
- ✅ Dark Mode con gradientes modernos
- ✅ Sidebar con categorías y contadores
- ✅ Búsqueda en tiempo real
- ✅ Sistema de favoritos persistente
- ✅ Diseño responsive (mobile/tablet/desktop)
- ✅ Animaciones suaves

### ✅ Reproductor de Video
- ✅ Integración con Video.js
- ✅ Soporte HLS (m3u8)
- ✅ Auto-detección de formatos (m3u8, ts, mp4, webm)
- ✅ Controles personalizados
- ✅ Estados visuales (loading, error, sin canal)
- ✅ Overlay con información del canal

### ✅ Gestión de Datos
- ✅ Parser M3U completo con atributos
- ✅ Mapeo de Xtream Codes a formato común
- ✅ Filtrado por categoría
- ✅ Búsqueda por nombre
- ✅ Favoritos con persistencia
- ✅ Último canal reproducido

### ✅ Arquitectura
- ✅ Servicios modulares y reutilizables
- ✅ Interfaces TypeScript completas
- ✅ RxJS para manejo reactivo
- ✅ Angular Signals para estado
- ✅ Standalone Components
- ✅ Manejo robusto de errores

## 🐛 Solución de Problemas

### Problema: Error de CORS
**Solución**: Usa el proxy incluido (`node proxy-server.js`) o instala una extensión de navegador

### Problema: Stream no reproduce
**Verificar**:
- La URL del stream es válida
- El formato es soportado (m3u8, ts, mp4)
- No hay problemas de CORS
- El servidor IPTV está activo

### Problema: Lista M3U no carga
**Verificar**:
- La URL es accesible desde el navegador
- El archivo comienza con `#EXTM3U`
- No hay errores en la consola del navegador (F12)

## 📚 API de Xtream Codes Soportada

La aplicación implementa los siguientes endpoints:

```
✅ Autenticación
GET player_api.php?username=XXX&password=XXX

✅ Categorías Live
GET player_api.php?username=XXX&password=XXX&action=get_live_categories

✅ Streams Live
GET player_api.php?username=XXX&password=XXX&action=get_live_streams

✅ Categorías VOD
GET player_api.php?username=XXX&password=XXX&action=get_vod_categories

✅ Streams VOD
GET player_api.php?username=XXX&password=XXX&action=get_vod_streams

✅ URL de Stream
http://servidor.com/live/usuario/password/stream_id.m3u8
```

## 📝 Endpoints del Servicio IPTV

### IptvService

```typescript
// Autenticación
authenticate(credentials: UserCredentials): Observable<boolean>

// Xtream Codes
getXtreamLiveCategories(host, username, password): Observable<Category[]>
getXtreamLiveStreams(host, username, password, categoryId?): Observable<Channel[]>
getXtreamVodCategories(host, username, password): Observable<Category[]>
getXtreamVodStreams(host, username, password, categoryId?): Observable<Channel[]>

// Gestión
selectChannel(channel: Channel): void
filterChannelsByName(searchTerm: string): Channel[]
filterChannelsByCategory(categoryId: string): Channel[]
logout(): void
```

## 🎨 Personalización

### Cambiar Colores
Edita [src/styles.css](src/styles.css) y busca las clases de Tailwind con `purple-600`, `blue-600`, etc.

### Configurar Video.js
Edita [src/app/components/video-player/video-player.component.ts](src/app/components/video-player/video-player.component.ts) línea 70:

```typescript
const options: any = {
  autoplay: false,  // Cambiar a true para autoplay
  volume: 1.0,      // Volumen inicial (0.0 - 1.0)
  // ...
};
```

## 📦 Build para Producción

```bash
npm run build
```

Los archivos estarán en `dist/VantixIPTV/`

## ⚠️ Notas Importantes

### Seguridad
- Las credenciales se guardan en `localStorage` sin encriptación
- Para producción, considera implementar encriptación
- No hardcodees credenciales en el código

### CORS
- La mayoría de servidores IPTV NO permiten peticiones desde navegador
- **Desarrollo**: Usa el proxy incluido o extensión de navegador
- **Producción**: Implementa tu propio backend como proxy

### Video.js
- Los warnings de módulos CommonJS son normales
- No afectan la funcionalidad
- Video.js no tiene versión ESM completa aún

## 🎯 Próximos Pasos (Opcional)

Si quieres expandir la aplicación:

1. **EPG (Guía de Programación)**: Implementar información de programación
2. **Catchup TV**: Ver programas pasados
3. **Auth Guard**: Proteger rutas con guard de Angular
4. **Multi-idioma**: Implementar i18n
5. **PWA**: Convertir en Progressive Web App
6. **Backend propio**: Crear API proxy en Node.js/NestJS

## 📞 Recursos

- **README.md**: Documentación completa de usuario
- **ARCHITECTURE.md**: Documentación técnica detallada
- **proxy-server.js**: Servidor proxy para desarrollo
- **Consola del navegador (F12)**: Para debugging

## ✅ Checklist de Verificación

Antes de usar la aplicación, verifica:

- [ ] Dependencias instaladas (`npm install`)
- [ ] Aplicación corriendo (`npm start`)
- [ ] Tienes credenciales IPTV válidas
- [ ] Proxy iniciado si hay problemas de CORS
- [ ] Puerto 4200 no está en uso

## 🎉 ¡Listo para Usar!

Tu aplicación IPTV Player está completamente funcional. Solo necesitas:

1. Ejecutar `npm start`
2. Abrir `http://localhost:4200`
3. Ingresar tus credenciales IPTV
4. ¡Disfrutar de tus canales!

**¡Desarrollado con ❤️ usando Angular 21 y TypeScript!**
