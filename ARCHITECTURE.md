# 🏗️ Arquitectura Técnica - VantixIPTV

## 📐 Visión General

VantixIPTV está construido con Angular 21+ usando Standalone Components y la arquitectura moderna de Angular con Signals para gestión de estado reactivo.

## 🎯 Principios de Diseño

1. **Separación de Responsabilidades**: Servicios, componentes y modelos están claramente separados
2. **Type Safety**: Todo tipado con TypeScript e interfaces estrictas
3. **Reactividad**: RxJS + Angular Signals para estado reactivo
4. **Reutilización**: Componentes standalone modulares
5. **Performance**: Lazy loading, signals computed y detección de cambios optimizada

## 📦 Estructura de Módulos

```
src/app/
├── components/          # Componentes de UI
├── services/           # Lógica de negocio
├── models/            # Interfaces y tipos
├── app.config.ts      # Configuración global
└── app.routes.ts      # Definición de rutas
```

## 🔧 Servicios Principales

### 1. IptvService (`iptv.service.ts`)

**Responsabilidad**: Gestión centralizada de canales IPTV y autenticación.

**Características**:
- Autenticación dual (M3U + Xtream Codes)
- Gestión de canales con BehaviorSubject
- Filtrado y búsqueda de canales
- Manejo de errores HTTP
- Cache de información del servidor

**API Principal**:
```typescript
// Autenticación
authenticate(credentials: UserCredentials): Observable<boolean>

// Xtream Codes API
getXtreamLiveStreams(host, username, password, categoryId?): Observable<Channel[]>
getXtreamLiveCategories(host, username, password): Observable<Category[]>
getXtreamVodStreams(...): Observable<Channel[]>

// M3U
loadM3UPlaylist(url: string): Observable<void>

// Gestión de estado
selectChannel(channel: Channel): void
filterChannelsByName(searchTerm: string): Channel[]
filterChannelsByCategory(categoryId: string): Channel[]
logout(): void
```

**Observables**:
- `channels$`: Stream de canales actuales
- `categories$`: Stream de categorías
- `loading$`: Estado de carga

**Signals**:
- `selectedChannel`: Canal actual seleccionado
- `isAuthenticated`: Estado de autenticación

### 2. M3uParserService (`m3u-parser.service.ts`)

**Responsabilidad**: Parseo de archivos M3U/M3U8.

**Características**:
- Parseo completo del formato M3U
- Extracción de atributos (tvg-id, tvg-name, tvg-logo, group-title)
- Validación de formato
- Manejo de errores de parseo

**API Principal**:
```typescript
parseM3U(content: string): M3UParseResult
isValidM3UUrl(url: string): boolean
extractCategories(channels: M3UChannel[]): string[]
```

### 3. StorageService (`storage.service.ts`)

**Responsabilidad**: Persistencia de datos en localStorage.

**Características**:
- Guardado de credenciales
- Sistema de favoritos
- Último canal reproducido
- Signals reactivos para estado

**API Principal**:
```typescript
saveCredentials(credentials: UserCredentials): void
getCredentials(): UserCredentials | null
clearCredentials(): void

addFavorite(channelId: string): void
removeFavorite(channelId: string): void
isFavorite(channelId: string): boolean

saveLastChannel(channelId: string): void
getLastChannel(): string | null

clearAll(): void
```

**Signals**:
- `credentials`: Credenciales actuales
- `favorites`: Lista de favoritos

## 🧩 Componentes

### 1. LoginComponent

**Responsabilidad**: Autenticación de usuario.

**Features**:
- Formulario dual (M3U/Xtream)
- Validación de campos
- Estados de carga
- Manejo de errores
- Toggle de visibilidad de contraseña

**Signals**:
- `sourceType`: Tipo de fuente seleccionado
- `m3uUrl`, `xtreamHost`, `xtreamUsername`, `xtreamPassword`: Datos del formulario
- `isLoading`: Estado de carga
- `errorMessage`: Mensaje de error
- `showPassword`: Visibilidad de contraseña

### 2. DashboardComponent

**Responsabilidad**: Vista principal con lista de canales y reproductor.

**Features**:
- Sidebar con categorías
- Barra de búsqueda
- Grid de canales
- Sistema de favoritos
- Filtrado en tiempo real
- Menú de usuario

**Signals**:
- `channels`: Lista de canales
- `categories`: Lista de categorías
- `selectedChannel`: Canal seleccionado
- `searchTerm`: Término de búsqueda
- `selectedCategoryId`: Categoría seleccionada
- `showFavoritesOnly`: Filtro de favoritos
- `isSidebarOpen`: Estado del sidebar
- `showUserMenu`: Estado del menú

**Computed Signals**:
- `filteredChannels`: Canales filtrados por búsqueda, categoría y favoritos

### 3. VideoPlayerComponent

**Responsabilidad**: Reproductor de video con Video.js.

**Features**:
- Integración con Video.js
- Soporte HLS (m3u8)
- Auto-detección de formato
- Controles personalizados
- Overlay de información
- Estados visuales (loading, error, sin canal)
- Event listeners para estado del reproductor

**Signals**:
- `isPlaying`: Estado de reproducción
- `isLoading`: Estado de carga
- `isMuted`: Estado de silencio
- `volume`: Volumen actual
- `currentTime`: Tiempo actual
- `duration`: Duración total
- `error`: Mensaje de error

**Lifecycle**:
```typescript
ngOnInit(): void // Inicializa Video.js
ngOnDestroy(): void // Limpia el reproductor
effect(): void // Reacciona a cambios de canal
```

## 📊 Modelos de Datos

### Channel (Interfaz Unificada)
```typescript
interface Channel {
  id: string;
  name: string;
  streamUrl: string;
  logo?: string;
  categoryId?: string;
  categoryName?: string;
  epgChannelId?: string;
  tvArchive?: number;
  tvArchiveDuration?: number;
  streamType?: 'live' | 'movie' | 'series';
  added?: string;
  containerExtension?: string;
}
```

### UserCredentials
```typescript
interface UserCredentials {
  type: 'm3u' | 'xtream';
  m3uUrl?: string;
  xtreamHost?: string;
  xtreamUsername?: string;
  xtreamPassword?: string;
  lastUsed?: string;
}
```

### Category
```typescript
interface Category {
  id: string;
  name: string;
  parentId?: string;
  type?: 'live' | 'movie' | 'series';
}
```

## 🔄 Flujo de Datos

### 1. Flujo de Autenticación M3U

```
Usuario ingresa URL M3U
    ↓
LoginComponent.onSubmit()
    ↓
IptvService.authenticate()
    ↓
IptvService.loadM3UPlaylist()
    ↓
HttpClient.get() → Descarga M3U
    ↓
M3uParserService.parseM3U()
    ↓
Convierte a Channel[] uniforme
    ↓
BehaviorSubject.next(channels)
    ↓
StorageService.saveCredentials()
    ↓
Router.navigate('/dashboard')
```

### 2. Flujo de Autenticación Xtream

```
Usuario ingresa credenciales
    ↓
LoginComponent.onSubmit()
    ↓
IptvService.authenticate()
    ↓
IptvService.authenticateXtream()
    ↓
HttpClient.get(player_api.php)
    ↓
Valida user_info.auth === 1
    ↓
Guarda server_info en cache
    ↓
IptvService.getXtreamLiveCategories()
    ↓
IptvService.getXtreamLiveStreams()
    ↓
Mapea XtreamStream → Channel
    ↓
BehaviorSubject.next(channels)
    ↓
Router.navigate('/dashboard')
```

### 3. Flujo de Reproducción

```
Usuario selecciona canal
    ↓
DashboardComponent.selectChannel()
    ↓
IptvService.selectChannel()
    ↓
selectedChannel.set(channel)
    ↓
VideoPlayerComponent effect() detecta cambio
    ↓
VideoPlayerComponent.loadChannel()
    ↓
VideoPlayerComponent.getSourceType()
    ↓
player.src({ src, type })
    ↓
Video.js carga y reproduce stream
```

## 🎨 Estrategia de Estilos

### Tailwind CSS 4
- **Dark Mode por defecto**
- **Utility-first approach**
- **Clases personalizadas en componentes**
- **Gradientes y efectos backdrop-blur**

### Paleta de Colores Principal
```css
Primary: purple-600 (#7c3aed)
Secondary: blue-600 (#2563eb)
Background: gray-900, gray-800
Text: white, gray-400
Accents: yellow-400 (favoritos), red-400 (errores)
```

## 🔐 Manejo de Seguridad

### Almacenamiento
- Credenciales en `localStorage` (no encriptadas)
- **⚠️ Para producción**: Implementar encriptación

### CORS
- **Problema**: Servidores IPTV no permiten peticiones desde navegador
- **Solución Desarrollo**: 
  1. Proxy Node.js incluido (`proxy-server.js`)
  2. Extensiones de navegador
- **Solución Producción**: 
  1. Backend propio como proxy
  2. Configurar CORS en servidor IPTV (si es posible)

### HTTP Errors
```typescript
handleError(error: HttpErrorResponse): Observable<never> {
  // Error 0: CORS o conexión
  // Error 401/403: Autenticación
  // Error 404: Recurso no encontrado
  // ErrorEvent: Error del cliente
  return throwError(() => new Error(message));
}
```

## 📈 Optimizaciones

### Performance
1. **Standalone Components**: Carga bajo demanda
2. **Signals Computed**: Recalculo automático solo cuando dependencias cambian
3. **RxJS Operators**: `tap`, `map`, `catchError` para flujo eficiente
4. **Video.js**: Reproductor optimizado para streaming

### Bundle Size
- Importaciones selectivas de librerías
- Tree-shaking automático de Angular
- Lazy loading de rutas (expandible)

### Detección de Cambios
- Signals para estado reactivo
- OnPush change detection (implementable en futuro)

## 🧪 Testing (Expandible)

### Unit Tests
```typescript
// IptvService
describe('IptvService', () => {
  it('should parse M3U correctly');
  it('should handle Xtream authentication');
  it('should filter channels by category');
});

// M3uParserService
describe('M3uParserService', () => {
  it('should extract EXTINF attributes');
  it('should handle malformed M3U');
});
```

### E2E Tests
```typescript
// Login flow
it('should authenticate with M3U URL');
it('should authenticate with Xtream credentials');

// Dashboard
it('should display channels list');
it('should filter channels on search');
```

## 🚀 Mejoras Futuras

### Features
1. **EPG (Electronic Program Guide)**: Información de programación
2. **Catchup TV**: Ver programas pasados
3. **Multi-idioma**: i18n con Angular
4. **Temas personalizables**: Light/Dark mode
5. **Player Picture-in-Picture**: Ver mientras navegas
6. **Historial de reproducción**: Últimos canales vistos
7. **Control parental**: PIN para categorías

### Arquitectura
1. **NgRx**: Para estado más complejo
2. **PWA**: Funcionalidad offline
3. **Service Worker**: Cache de listas
4. **IndexedDB**: Almacenamiento avanzado
5. **WebSockets**: Actualizaciones en tiempo real

### Seguridad
1. **Encriptación localStorage**: Proteger credenciales
2. **Auth Guard**: Proteger rutas
3. **JWT Backend**: Autenticación robusta
4. **Rate limiting**: Prevenir abuso

## 📝 Notas del Desarrollador

### Consideraciones IPTV
- La mayoría de servidores IPTV **no permiten CORS** desde navegador
- Los streams **pueden requerir autenticación** en headers
- Algunos formatos como **.ts requieren Video.js** con plugin HLS
- Las listas M3U pueden ser **muy grandes** (miles de canales)

### Best Practices
1. **Siempre validar** credenciales antes de guardar
2. **Manejar errores** de red de forma explícita
3. **Timeout requests** para evitar bloqueos
4. **Parsear M3U incrementalmente** para listas grandes
5. **Cachear categorías** en memoria

---

**Última actualización**: 2 de febrero de 2026
