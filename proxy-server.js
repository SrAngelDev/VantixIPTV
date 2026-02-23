/**
 * Servidor Proxy Simple para Evitar CORS
 * 
 * Este servidor permite hacer peticiones a servidores IPTV desde el navegador
 * sin problemas de CORS. Es solo para desarrollo.
 * 
 * USO:
 * 1. Instalar dependencias: npm install
 * 2. Configurar archivo .env (ver .env.example)
 * 3. Ejecutar: node proxy-server.js
 * 4. El servidor estará disponible en http://localhost:8080 (por defecto)
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { URL } = require('url');

const app = express();

// Configuración desde variables de entorno
const PORT = process.env.PORT || 8080;
const FETCH_TIMEOUT = parseInt(process.env.FETCH_TIMEOUT) || 15000;
const PROXY_BASE_URL = process.env.PROXY_BASE_URL || `http://localhost:${PORT}`;

// Habilitar CORS para todas las peticiones
app.use(cors());
app.use(express.json());

// Endpoint de proxy
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    console.log(`[PROXY] Petición entrante para: ${targetUrl}`);
    
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': '*/*'
      },
      timeout: FETCH_TIMEOUT
    });

    if (!response.ok) {
        console.warn(`[PROXY] Error del servidor destino: ${response.status} ${response.statusText}`);
        // Incluso si falla, a veces queremos pasar el error tal cual
    }

    const contentType = response.headers.get('content-type');
    const responseUrl = response.url; // URL final después de redirects
    console.log(`[PROXY] Respuesta recibida. Status: ${response.status}, Content-Type: ${contentType}`);
    
    // Copiar headers relevantes
    res.status(response.status);
    res.set('Content-Type', contentType || 'application/octet-stream');
    res.set('Access-Control-Allow-Origin', '*');
    
    // CASO ESPECIAL: HLS (m3u8) - Necesitamos reescribir las URLs de los segmentos
    // para que también pasen por el proxy
    if (contentType && (contentType.toLowerCase().includes('mpegurl') || contentType.toLowerCase().includes('application/x-mpegurl') || targetUrl.toLowerCase().includes('.m3u8'))) {
      try {
        const text = await response.text();
        
        // Usar regex para encontrar líneas que NO son comentarios (#) ni vacías
        // Estas son las URLs de los segmentos o variantes
        const modifiedText = text.replace(/^(?!#)(\S+)/gm, (match) => {
           // Ignorar si ya es localhost (prevención de bucle)
           if (match.includes('localhost')) return match;

           try {
             // Resolver URL absoluta (maneja relativas basándose en la URL del m3u8)
             const absoluteUrl = new URL(match, responseUrl).href;
             // Envolver con nuestro proxy
             return `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(absoluteUrl)}`;
           } catch (e) {
             return match;
           }
        });

        res.send(modifiedText);
      } catch (e) {
        console.error('[PROXY] Error procesando m3u8:', e);
        // Fallback a pipe si falla el procesamiento de texto
        response.body.pipe(res); 
      }
    }
    // Otros tipos de texto (JSON, XML simple)
    else if (contentType && (contentType.includes('text') || contentType.includes('json') || contentType.includes('xml'))) {
      const text = await response.text();
      res.send(text);
    } else {
      // Para streams de video binarios (.ts, .mp4, etc), hacer pipe directo
      response.body.pipe(res);
    }
  } catch (error) {
    console.error('[PROXY] Error fatal:', error.message);
    res.status(500).json({ 
      error: 'Proxy Error',
      details: error.message,
      code: error.code
    });
  }
});

// Endpoint para probar que el servidor está funcionando
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: `Proxy server is running on port ${PORT}` });
});

// Solo exportar si se está usando como módulo (en tests, por ejemplo)
// Si se ejecuta directamente, iniciar el servidor
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Proxy corriendo en puerto ${PORT}`);
    console.log(`Health check disponible en: http://localhost:${PORT}/health`);
    console.log(`Uso: http://localhost:${PORT}/proxy?url=TU_URL_AQUI`);
    console.log(`Presiona Ctrl+C para detener el servidor`);
  });

  // Manejar errores del servidor
  server.on('error', (error) => {
    console.error('[PROXY] Error del servidor:', error);
    process.exit(1);
  });

  // Manejar cierre graceful
  process.on('SIGINT', () => {
    console.log('\n[PROXY] Cerrando servidor...');
    server.close(() => {
      console.log('[PROXY] Servidor cerrado');
      process.exit(0);
    });
  });
} else {
  module.exports = app;
}
