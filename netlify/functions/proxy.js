/**
 * Netlify Serverless Function - CORS Proxy para IPTV
 * 
 * Reemplaza al proxy-server.js de Express para producción.
 * Maneja peticiones M3U/M3U8, reescribiendo URLs de segmentos HLS
 * para que también pasen por el proxy.
 */

const FETCH_TIMEOUT = 20000;

exports.handler = async function (event) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  // Health check
  if (!event.queryStringParameters || !event.queryStringParameters.url) {
    // Si no hay parámetro url, devolver health check
    if (event.path.endsWith('/health') || !event.queryStringParameters?.url === undefined) {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ok', message: 'Proxy function is running' }),
      };
    }
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'URL parameter is required. Usage: ?url=YOUR_URL' }),
    };
  }

  const targetUrl = event.queryStringParameters.url;

  try {
    // Construir la URL base del proxy para reescritura de HLS
    const protocol = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers.host;
    const proxyBaseUrl = `${protocol}://${host}/.netlify/functions/proxy`;

    console.log(`[PROXY] Request for: ${targetUrl}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    // Extraer origin del servidor destino para headers
    let targetOrigin;
    try {
      targetOrigin = new URL(targetUrl).origin;
    } catch {
      targetOrigin = '';
    }

    // Estrategias de headers - de más a menos compatible con Xtream
    const headerStrategies = [
      {
        'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20',
        Accept: '*/*',
      },
      {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: '*/*',
      },
      {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: '*/*',
        Referer: targetOrigin + '/',
        Origin: targetOrigin,
      },
    ];

    let response;
    for (const headers of headerStrategies) {
      response = await fetch(targetUrl, {
        headers,
        signal: controller.signal,
      });
      if (response.status !== 403) break;
    }

    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') || '';
    const responseUrl = response.url; // URL final después de redirects

    console.log(`[PROXY] Response: ${response.status}, Content-Type: ${contentType}`);

    const responseHeaders = {
      ...corsHeaders,
      'Content-Type': contentType || 'application/octet-stream',
    };

    // CASO HLS: m3u8 manifests - reescribir URLs de segmentos
    const isHLS =
      contentType.toLowerCase().includes('mpegurl') ||
      contentType.toLowerCase().includes('x-mpegurl') ||
      targetUrl.toLowerCase().includes('.m3u8');

    if (isHLS) {
      const text = await response.text();

      const modifiedText = text.replace(/^(?!#)(\S+)/gm, (match) => {
        // Prevenir bucles
        if (match.includes('.netlify/functions/proxy')) return match;

        try {
          const absoluteUrl = new URL(match, responseUrl).href;
          return `${proxyBaseUrl}?url=${encodeURIComponent(absoluteUrl)}`;
        } catch (e) {
          return match;
        }
      });

      return {
        statusCode: response.status,
        headers: { ...responseHeaders, 'Content-Type': 'application/vnd.apple.mpegurl' },
        body: modifiedText,
      };
    }

    // CASO TEXTO: JSON, XML, texto plano, listas M3U
    const isText =
      contentType.includes('text') ||
      contentType.includes('json') ||
      contentType.includes('xml') ||
      contentType.includes('mpegurl') ||
      targetUrl.toLowerCase().endsWith('.m3u');

    if (isText) {
      const text = await response.text();

      // Si es una lista M3U (no m3u8), buscar URLs dentro y proxearlas
      if (targetUrl.toLowerCase().endsWith('.m3u') || contentType.includes('mpegurl')) {
        const modifiedText = text.replace(
          /^(https?:\/\/\S+)/gm,
          (match) => `${proxyBaseUrl}?url=${encodeURIComponent(match)}`
        );
        return {
          statusCode: response.status,
          headers: responseHeaders,
          body: modifiedText,
        };
      }

      return {
        statusCode: response.status,
        headers: responseHeaders,
        body: text,
      };
    }

    // CASO BINARIO: segmentos .ts, .mp4, etc.
    const buffer = await response.arrayBuffer();
    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: Buffer.from(buffer).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('[PROXY] Error:', error.message);

    if (error.name === 'AbortError') {
      return {
        statusCode: 504,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Timeout', details: 'La petición tardó demasiado' }),
      };
    }

    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Proxy Error',
        details: error.message,
      }),
    };
  }
};
