/**
 * Netlify Edge Function - CORS Proxy para IPTV (Streaming)
 *
 * A diferencia de las Netlify Functions normales, las Edge Functions:
 * - Pueden hacer streaming de respuestas (sin límite de 6MB)
 * - No tienen timeout de 10s para I/O
 * - Corren en Deno en el edge
 *
 * Esto resuelve el error 502 al proxear segmentos .ts binarios grandes.
 */

export default async function handler(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Range',
    'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
  };

  // Preflight CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  // Health check / sin parámetro URL
  if (!targetUrl) {
    return new Response(
      JSON.stringify({ status: 'ok', message: 'CORS Proxy Edge Function running' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const proxyBaseUrl = `${url.origin}/api/proxy`;

    // Extraer el origin del servidor IPTV para headers Referer/Origin
    let targetOrigin;
    try {
      targetOrigin = new URL(targetUrl).origin;
    } catch {
      targetOrigin = '';
    }

    // Headers que simulan una petición real de navegador
    // Muchos servidores IPTV/Xtream verifican Referer y User-Agent
    const fetchHeaders = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      'Accept-Encoding': 'gzip, deflate',
      Connection: 'keep-alive',
      Referer: targetOrigin + '/',
      Origin: targetOrigin,
    };

    // Reenviar header Range si existe (para seeks)
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    let response = await fetch(targetUrl, {
      headers: fetchHeaders,
      redirect: 'follow',
    });

    // Si el servidor devuelve 403, reintentar sin Referer/Origin
    // (algunos servidores rechazan Referer de distinto dominio)
    if (response.status === 403) {
      const retryHeaders = { ...fetchHeaders };
      delete retryHeaders['Referer'];
      delete retryHeaders['Origin'];
      response = await fetch(targetUrl, {
        headers: retryHeaders,
        redirect: 'follow',
      });
    }

    // Si sigue siendo 403, intentar con headers mínimos
    if (response.status === 403) {
      response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20',
          Accept: '*/*',
        },
        redirect: 'follow',
      });
    }

    const contentType = response.headers.get('content-type') || '';
    const finalUrl = response.url; // URL final después de redirects

    // ── CASO HLS: manifests m3u8 ──────────────────────────────
    const isHLS =
      contentType.toLowerCase().includes('mpegurl') ||
      contentType.toLowerCase().includes('x-mpegurl') ||
      targetUrl.toLowerCase().includes('.m3u8');

    if (isHLS) {
      const text = await response.text();

      // Reescribir URLs de segmentos/playlists para que pasen por el proxy
      const modified = text.replace(/^(?!#)(\S+)/gm, (match) => {
        if (match.includes('/api/proxy') || match.includes('.netlify/functions/proxy')) {
          return match;
        }
        try {
          const absoluteUrl = new URL(match, finalUrl).href;
          return `${proxyBaseUrl}?url=${encodeURIComponent(absoluteUrl)}`;
        } catch {
          return match;
        }
      });

      return new Response(modified, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // ── CASO M3U: listas de canales ───────────────────────────
    const isM3U =
      targetUrl.toLowerCase().endsWith('.m3u') || contentType.includes('audio/x-mpegurl');

    if (isM3U) {
      const text = await response.text();
      const modified = text.replace(
        /^(https?:\/\/\S+)/gm,
        (match) => `${proxyBaseUrl}?url=${encodeURIComponent(match)}`
      );
      return new Response(modified, {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': contentType || 'audio/x-mpegurl' },
      });
    }

    // ── CASO TEXTO: JSON, XML, etc. ──────────────────────────
    const isText =
      contentType.includes('text') || contentType.includes('json') || contentType.includes('xml');

    if (isText) {
      const text = await response.text();
      return new Response(text, {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': contentType },
      });
    }

    // ── CASO BINARIO: segmentos .ts, .mp4, etc. ──────────────
    // STREAMING directo sin buffering - sin límite de tamaño
    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set('Content-Type', contentType || 'application/octet-stream');

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    const contentRange = response.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    // Pasar el body como stream - esto evita cargar todo en memoria
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[PROXY] Error:', error.message, '| URL:', targetUrl);
    return new Response(JSON.stringify({ error: 'Proxy Error', details: error.message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export const config = {
  path: '/api/proxy',
};
