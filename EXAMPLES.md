# 💡 Ejemplos de Uso - VantixIPTV

## 🔗 Ejemplos de URLs M3U de Prueba

⚠️ **Nota**: Estos son ejemplos ficticios. Debes usar tus propias listas M3U o credenciales Xtream.

### Formato M3U Básico

```
#EXTM3U

#EXTINF:-1 tvg-id="canal1" tvg-name="Canal Uno" tvg-logo="http://ejemplo.com/logo1.png" group-title="Deportes",Canal Uno
http://ejemplo.com/stream/canal1.m3u8

#EXTINF:-1 tvg-id="canal2" tvg-name="Canal Dos" tvg-logo="http://ejemplo.com/logo2.png" group-title="Películas",Canal Dos
http://ejemplo.com/stream/canal2.m3u8

#EXTINF:-1 tvg-id="canal3" tvg-name="Canal Tres" tvg-logo="http://ejemplo.com/logo3.png" group-title="Noticias",Canal Tres
http://ejemplo.com/stream/canal3.m3u8
```

## 🎮 Ejemplos de Credenciales Xtream Codes

```typescript
// Ejemplo de configuración Xtream Codes
const credentials = {
  type: 'xtream',
  xtreamHost: 'http://servidor.ejemplo.com:8080',
  xtreamUsername: 'tu_usuario',
  xtreamPassword: 'tu_contraseña'
};
```

## 🧪 Probando el Parser M3U

### Código de Ejemplo para Probar M3U Parser

```typescript
import { M3uParserService } from './services/m3u-parser.service';

const parser = new M3uParserService();

const m3uContent = `
#EXTM3U

#EXTINF:-1 tvg-id="espn" tvg-name="ESPN" tvg-logo="http://logo.com/espn.png" group-title="Deportes",ESPN HD
http://stream.com/espn.m3u8

#EXTINF:-1 tvg-id="fox" tvg-name="FOX" tvg-logo="http://logo.com/fox.png" group-title="Entretenimiento",FOX HD
http://stream.com/fox.m3u8
`;

const result = parser.parseM3U(m3uContent);

console.log('Total canales:', result.totalChannels);
console.log('Categorías:', result.categories);
console.log('Canales:', result.channels);
```

**Salida Esperada:**
```json
{
  "channels": [
    {
      "name": "ESPN HD",
      "url": "http://stream.com/espn.m3u8",
      "tvgId": "espn",
      "tvgName": "ESPN",
      "tvgLogo": "http://logo.com/espn.png",
      "groupTitle": "Deportes"
    },
    {
      "name": "FOX HD",
      "url": "http://stream.com/fox.m3u8",
      "tvgId": "fox",
      "tvgName": "FOX",
      "tvgLogo": "http://logo.com/fox.png",
      "groupTitle": "Entretenimiento"
    }
  ],
  "categories": ["Deportes", "Entretenimiento"],
  "totalChannels": 2
}
```

## 🔌 Uso del Proxy Server

### Ejemplo 1: Cargar M3U a través del Proxy

```javascript
// Sin proxy (puede dar CORS error)
const directUrl = 'http://servidor-iptv.com/lista.m3u8';

// Con proxy
const proxiedUrl = 'http://localhost:3000/proxy?url=' + encodeURIComponent(directUrl);

// Usar en tu servicio
this.http.get(proxiedUrl, { responseType: 'text' })
  .subscribe(content => {
    console.log('M3U cargado:', content);
  });
```

### Ejemplo 2: Stream de Video a través del Proxy

```javascript
// Stream directo (puede fallar por CORS)
const streamUrl = 'http://servidor-iptv.com/stream/123.m3u8';

// A través del proxy
const proxiedStream = 'http://localhost:3000/proxy?url=' + encodeURIComponent(streamUrl);

// Usar en Video.js
player.src({
  src: proxiedStream,
  type: 'application/x-mpegURL'
});
```

## 🎯 Flujo Completo de Autenticación M3U

```typescript
// 1. Usuario ingresa URL
const m3uUrl = 'http://mi-servidor.com/playlist.m3u8';

// 2. Crear credenciales
const credentials: UserCredentials = {
  type: 'm3u',
  m3uUrl: m3uUrl
};

// 3. Autenticar
this.iptvService.authenticate(credentials).subscribe({
  next: (success) => {
    if (success) {
      console.log('✅ Autenticación exitosa');
      console.log('Canales cargados:', this.iptvService.getChannels());
      this.router.navigate(['/dashboard']);
    }
  },
  error: (error) => {
    console.error('❌ Error:', error.message);
  }
});
```

## 🎯 Flujo Completo de Autenticación Xtream

```typescript
// 1. Usuario ingresa credenciales
const credentials: UserCredentials = {
  type: 'xtream',
  xtreamHost: 'http://servidor.com:8080',
  xtreamUsername: 'mi_usuario',
  xtreamPassword: 'mi_password'
};

// 2. Autenticar
this.iptvService.authenticate(credentials).subscribe({
  next: (success) => {
    console.log('✅ Autenticación Xtream exitosa');
    
    // Obtener categorías
    const host = credentials.xtreamHost!;
    const user = credentials.xtreamUsername!;
    const pass = credentials.xtreamPassword!;
    
    this.iptvService.getXtreamLiveCategories(host, user, pass)
      .subscribe(categories => {
        console.log('Categorías:', categories);
      });
    
    this.iptvService.getXtreamLiveStreams(host, user, pass)
      .subscribe(channels => {
        console.log('Canales:', channels);
      });
  },
  error: (error) => {
    console.error('❌ Error Xtream:', error.message);
  }
});
```

## 🎬 Reproducir un Canal

```typescript
// 1. Seleccionar canal
const channel: Channel = {
  id: '123',
  name: 'ESPN HD',
  streamUrl: 'http://servidor.com/stream/espn.m3u8',
  logo: 'http://logos.com/espn.png',
  categoryName: 'Deportes',
  streamType: 'live'
};

// 2. Pasar al reproductor
this.iptvService.selectChannel(channel);

// 3. El componente VideoPlayer detecta el cambio automáticamente
// mediante el effect() y carga el stream
```

## 🔍 Búsqueda y Filtrado

```typescript
// Búsqueda por nombre
const searchTerm = 'ESPN';
const results = this.iptvService.filterChannelsByName(searchTerm);
console.log('Resultados:', results);

// Filtrar por categoría
const categoryId = 'deportes';
const filtered = this.iptvService.filterChannelsByCategory(categoryId);
console.log('Canales de deportes:', filtered);

// Usando computed signal en el componente
const filteredChannels = computed(() => {
  let channels = this.channels();
  
  // Por categoría
  if (this.selectedCategoryId()) {
    channels = channels.filter(ch => 
      ch.categoryId === this.selectedCategoryId()
    );
  }
  
  // Por búsqueda
  const term = this.searchTerm().toLowerCase();
  if (term) {
    channels = channels.filter(ch => 
      ch.name.toLowerCase().includes(term)
    );
  }
  
  return channels;
});
```

## ⭐ Sistema de Favoritos

```typescript
// Agregar a favoritos
const channelId = '123';
this.storageService.addFavorite(channelId);

// Remover de favoritos
this.storageService.removeFavorite(channelId);

// Verificar si es favorito
const isFav = this.storageService.isFavorite(channelId);

// Obtener todos los favoritos
const favorites = this.storageService.favorites();

// Filtrar solo favoritos
const favoriteChannels = computed(() => {
  if (this.showFavoritesOnly()) {
    return this.channels().filter(ch => 
      this.storageService.isFavorite(ch.id)
    );
  }
  return this.channels();
});
```

## 🎥 Control del Reproductor Video.js

```typescript
// Dentro del componente VideoPlayer

// Reproducir
player.play();

// Pausar
player.pause();

// Cambiar volumen (0.0 - 1.0)
player.volume(0.5);

// Silenciar/desilenciar
player.muted(true);

// Pantalla completa
if (player.isFullscreen()) {
  player.exitFullscreen();
} else {
  player.requestFullscreen();
}

// Obtener tiempo actual
const currentTime = player.currentTime();

// Ir a un tiempo específico (en segundos)
player.currentTime(120); // Ir al minuto 2

// Obtener duración
const duration = player.duration();

// Verificar si está reproduciendo
const isPlaying = !player.paused();
```

## 🔄 Manejo de Estados

```typescript
// En el servicio IPTV

// Estado de carga
this.iptvService.loading$.subscribe(state => {
  if (state.isLoading) {
    console.log('Cargando:', state.message);
  }
  if (state.error) {
    console.error('Error:', state.error);
  }
});

// Canales actualizados
this.iptvService.channels$.subscribe(channels => {
  console.log('Canales actualizados:', channels.length);
});

// Categorías actualizadas
this.iptvService.categories$.subscribe(categories => {
  console.log('Categorías:', categories);
});

// Canal seleccionado
effect(() => {
  const channel = this.iptvService.selectedChannel();
  if (channel) {
    console.log('Canal seleccionado:', channel.name);
  }
});
```

## 🧪 Testing de Componentes

### Ejemplo: Test del LoginComponent

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { IptvService } from '../../services/iptv.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let iptvService: jasmine.SpyObj<IptvService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const iptvSpy = jasmine.createSpyObj('IptvService', ['authenticate']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: IptvService, useValue: iptvSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    iptvService = TestBed.inject(IptvService) as jasmine.SpyObj<IptvService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('debe autenticar con M3U URL', () => {
    iptvService.authenticate.and.returnValue(of(true));
    
    component.selectSourceType('m3u');
    component.m3uUrl.set('http://test.com/playlist.m3u8');
    component.onSubmit();

    expect(iptvService.authenticate).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('debe mostrar error si la autenticación falla', () => {
    iptvService.authenticate.and.returnValue(
      throwError(() => new Error('Error de conexión'))
    );
    
    component.selectSourceType('m3u');
    component.m3uUrl.set('http://test.com/playlist.m3u8');
    component.onSubmit();

    expect(component.errorMessage()).toBeTruthy();
  });
});
```

## 🌐 Ejemplo de URLs Reales (Públicas)

Estas son algunas fuentes públicas de IPTV que puedes usar para probar:

```bash
# IPTV-ORG (Github - Listas públicas)
https://iptv-org.github.io/iptv/index.m3u

# Canales de prueba
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

# Big Buck Bunny (Video de prueba)
http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
```

⚠️ **Nota**: Estas URLs pueden cambiar o dejar de funcionar. Son solo para pruebas.

## 📝 Notas Finales

- Todos estos ejemplos están diseñados para funcionar con la aplicación VantixIPTV
- Recuerda iniciar el proxy si tienes problemas de CORS
- Para producción, siempre usa credenciales seguras
- No expongas credenciales reales en el código

**¡Happy Coding! 🚀**
