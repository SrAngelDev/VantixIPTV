import { Injectable } from '@angular/core';
import { M3UChannel, M3UParseResult, ExtinfAttributes } from '../models/m3u-parser.interface';
import { environment } from '../../environments/environment';

/**
 * Servicio para parsear archivos M3U y M3U8
 */
@Injectable({
  providedIn: 'root'
})
export class M3uParserService {

  /**
   * Parsea el contenido de un archivo M3U
   */
  parseM3U(content: string): M3UParseResult {
    const channels: M3UChannel[] = [];
    const categoriesSet = new Set<string>();
    const parseErrors: string[] = [];

    try {
      const lines = content.split('\n').map(line => line.trim());
      
      if (!lines[0]?.startsWith('#EXTM3U')) {
        parseErrors.push('Formato M3U inválido: debe comenzar con #EXTM3U');
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Buscar líneas EXTINF
        if (line.startsWith('#EXTINF:')) {
          try {
            const attributes = this.parseExtinf(line);
            const nextLine = lines[i + 1]?.trim();

            if (nextLine && !nextLine.startsWith('#')) {
              // Transformar URL si es de Xtream sin extensión HLS
              const transformedUrl = this.transformXtreamUrl(nextLine);
              
              const channel: M3UChannel = {
                name: attributes.title,
                url: transformedUrl,
                duration: attributes.duration,
                tvgId: attributes.tvgId,
                tvgName: attributes.tvgName,
                tvgLogo: attributes.tvgLogo,
                groupTitle: attributes.groupTitle
              };

              channels.push(channel);

              if (attributes.groupTitle) {
                categoriesSet.add(attributes.groupTitle);
              }

              i++; // Saltar la línea de URL
            }
          } catch (error) {
            parseErrors.push(`Error parseando línea ${i + 1}: ${error}`);
          }
        }
      }

    } catch (error) {
      parseErrors.push(`Error general parseando M3U: ${error}`);
    }

    // Log resumen en vez de uno por URL
    if (this.transformedCount > 0 && !environment.production) {
      console.log(`[M3U-PARSER] Transformed ${this.transformedCount} Xtream URLs to HLS format`);
      this.transformedCount = 0;
    }

    return {
      channels,
      categories: Array.from(categoriesSet).sort(),
      totalChannels: channels.length,
      parseErrors: parseErrors.length > 0 ? parseErrors : undefined
    };
  }

  /**
   * Parsea una línea EXTINF y extrae sus atributos
   * Formato: #EXTINF:duration tvg-id="id" tvg-name="name" tvg-logo="logo" group-title="category",Channel Name
   */
  private parseExtinf(line: string): ExtinfAttributes {
    const result: ExtinfAttributes = {
      duration: -1,
      title: ''
    };

    // Extraer duración
    const durationMatch = line.match(/#EXTINF:(-?\d+)/);
    if (durationMatch) {
      result.duration = parseInt(durationMatch[1], 10);
    }

    // Extraer atributos tvg-*
    const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
    if (tvgIdMatch) {
      result.tvgId = tvgIdMatch[1];
    }

    const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
    if (tvgNameMatch) {
      result.tvgName = tvgNameMatch[1];
    }

    const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
    if (tvgLogoMatch) {
      result.tvgLogo = tvgLogoMatch[1];
    }

    const groupTitleMatch = line.match(/group-title="([^"]*)"/);
    if (groupTitleMatch) {
      result.groupTitle = groupTitleMatch[1];
    }

    // Extraer nombre del canal (después de la última coma)
    const commaIndex = line.lastIndexOf(',');
    if (commaIndex !== -1) {
      result.title = line.substring(commaIndex + 1).trim();
    }

    return result;
  }

  /** Contador interno para log de resumen */
  private transformedCount = 0;

  /**
   * Transforma URLs de Xtream Codes sin extensión a formato HLS (.m3u8)
   * Patrón: http://host:port/username/password/streamId -> http://host:port/live/username/password/streamId.m3u8
   * Evita re-transformar URLs que ya tienen /live/ o extensión de archivo.
   */
  private transformXtreamUrl(url: string): string {
    try {
      // No transformar si ya tiene /live/ o ya tiene extensión de archivo
      if (/\/live\//.test(url) || /\.[a-zA-Z0-9]{2,4}(\?.*)?$/.test(url)) {
        return url;
      }

      // Detectar URLs de Xtream: http://host:port/username/password/streamId
      const xtreamPattern = /^(https?:\/\/[^\/]+)\/([^\/]+)\/([^\/]+)\/(\d+)$/;
      const match = url.match(xtreamPattern);
      
      if (match) {
        const [, baseUrl, username, password, streamId] = match;
        const hlsUrl = `${baseUrl}/live/${username}/${password}/${streamId}.m3u8`;
        this.transformedCount++;
        return hlsUrl;
      }
    } catch (error) {
      if (!environment.production) {
        console.warn('[M3U-PARSER] Error transforming URL:', error);
      }
    }
    
    return url;
  }

  /**
   * Valida si una URL es un archivo M3U válido
   */
  isValidM3UUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.toLowerCase();
      return path.endsWith('.m3u') || path.endsWith('.m3u8') || urlObj.search.includes('m3u');
    } catch {
      return false;
    }
  }

  /**
   * Extrae categorías únicas de una lista de canales
   */
  extractCategories(channels: M3UChannel[]): string[] {
    const categories = new Set<string>();
    channels.forEach(channel => {
      if (channel.groupTitle) {
        categories.add(channel.groupTitle);
      }
    });
    return Array.from(categories).sort();
  }
}
