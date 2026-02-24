import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  Channel,
  Category,
  UserCredentials,
  XtreamAuthResponse,
  XtreamCategory,
  XtreamStream,
  XtreamSeries,
  XtreamSeriesInfo,
  XtreamEpisode,
  LoadingState,
  ContentType
} from '../models/channel.interface';
import { M3uParserService } from './m3u-parser.service';
import { StorageService } from './storage.service';
import { environment } from '../../environments/environment';

/**
 * Servicio principal para gestionar IPTV
 * Soporta M3U URLs y Xtream Codes API
 */
@Injectable({
  providedIn: 'root'
})
export class IptvService {
  // Estado de la aplicación
  private channelsSubject = new BehaviorSubject<Channel[]>([]);
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  private loadingSubject = new BehaviorSubject<LoadingState>({ isLoading: false });

  // Observables públicos
  readonly channels$ = this.channelsSubject.asObservable();
  readonly categories$ = this.categoriesSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();

  // Signals para estado reactivo
  readonly selectedChannel = signal<Channel | null>(null);
  readonly isAuthenticated = signal<boolean>(false);

  // Cache de datos Xtream
  private xtreamServerInfo: any = null;

  constructor(
    private http: HttpClient,
    private m3uParser: M3uParserService,
    private storage: StorageService
  ) {
    this.checkAuthentication();
  }

  /**
   * Helper privado para usar el proxy si es necesario
   */
  private getProxiedUrl(url: string): string {
    // Usar proxy local para desarrollo
    if (environment.proxyUrl) {
      return `${environment.proxyUrl}?url=${encodeURIComponent(url)}`;
    }
    return url;
  }

  /**
   * Convierte URLs HTTP de logos a HTTPS para evitar Mixed Content
   */
  private sanitizeLogoUrl(url?: string): string | undefined {
    if (!url) return undefined;
    // Upgrade HTTP a HTTPS para evitar Mixed Content warnings
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    return url;
  }

  /**
   * Verifica si hay credenciales guardadas
   */
  private checkAuthentication(): void {
    const credentials = this.storage.getCredentials();
    this.isAuthenticated.set(!!credentials);
  }

  /**
   * Autentica y carga canales según el tipo de fuente
   */
  authenticate(credentials: UserCredentials): Observable<boolean> {
    this.setLoading(true, 'Conectando...');

    if (credentials.type === 'm3u') {
      return this.loadM3UPlaylist(credentials.m3uUrl!)
        .pipe(
          tap(() => {
            this.storage.saveCredentials(credentials);
            this.isAuthenticated.set(true);
            this.setLoading(false);
          }),
          map(() => true),
          catchError(error => {
            this.setLoading(false, undefined, 'Error cargando lista M3U');
            return throwError(() => error);
          })
        );
    } else {
      return this.authenticateXtream(
        credentials.xtreamHost!,
        credentials.xtreamUsername!,
        credentials.xtreamPassword!
      ).pipe(
        tap(() => {
          this.storage.saveCredentials(credentials);
          this.isAuthenticated.set(true);
          this.setLoading(false);
        }),
        map(() => true),
        catchError(error => {
          this.setLoading(false, undefined, 'Error autenticando con Xtream Codes');
          return throwError(() => error);
        })
      );
    }
  }

  /**
   * ==========================================
   * MÉTODOS PARA M3U
   * ==========================================
   */

  /**
   * Carga y parsea una playlist M3U desde URL
   */
  private loadM3UPlaylist(url: string): Observable<void> {
    const proxiedUrl = this.getProxiedUrl(url);
    return this.http.get(proxiedUrl, { responseType: 'text' })
      .pipe(
        map(content => {
          const result = this.m3uParser.parseM3U(content);
          
          // Convertir canales M3U a formato común
          const channels: Channel[] = result.channels.map((m3uChannel, index) => ({
            id: `m3u_${index}`,
            name: m3uChannel.name,
            streamUrl: this.getProxiedUrl(m3uChannel.url), // Proxear streams también
            logo: this.sanitizeLogoUrl(m3uChannel.tvgLogo),
            categoryName: m3uChannel.groupTitle,
            categoryId: m3uChannel.groupTitle ? this.generateCategoryId(m3uChannel.groupTitle) : undefined,
            epgChannelId: m3uChannel.tvgId,
            streamType: 'live'
          }));

          // Crear categorías
          const categories: Category[] = result.categories.map(catName => ({
            id: this.generateCategoryId(catName),
            name: catName,
            type: 'live'
          }));

          this.channelsSubject.next(channels);
          this.categoriesSubject.next(categories);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * ==========================================
   * MÉTODOS PARA XTREAM CODES API
   * ==========================================
   */

  /**
   * Autentica con Xtream Codes API
   * Endpoint: http://domain.com:port/player_api.php?username=XXX&password=XXX
   */
  private authenticateXtream(
    host: string,
    username: string,
    password: string
  ): Observable<XtreamAuthResponse> {
    const directUrl = this.buildXtreamUrl(host, 'player_api.php', { username, password });
    const url = this.getProxiedUrl(directUrl);

    return this.http.get<XtreamAuthResponse>(url)
      .pipe(
        tap(response => {
          if (response.user_info.auth !== 1) {
            throw new Error('Autenticación fallida');
          }
          this.xtreamServerInfo = response.server_info;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obtiene las categorías de streams en vivo
   */
  getXtreamLiveCategories(host: string, username: string, password: string): Observable<Category[]> {
    const directUrl = this.buildXtreamUrl(host, 'player_api.php', {
      username,
      password,
      action: 'get_live_categories'
    });
    const url = this.getProxiedUrl(directUrl);

    return this.http.get<XtreamCategory[]>(url)
      .pipe(
        map(categories => categories.map(cat => ({
          id: cat.category_id,
          name: cat.category_name,
          parentId: cat.parent_id ? cat.parent_id.toString() : undefined,
          type: 'live' as const
        }))),
        tap(categories => this.categoriesSubject.next(categories)),
        catchError(this.handleError)
      );
  }

  /**
   * Obtiene los streams en vivo
   */
  getXtreamLiveStreams(
    host: string,
    username: string,
    password: string,
    categoryId?: string
  ): Observable<Channel[]> {
    const params: any = {
      username,
      password,
      action: 'get_live_streams'
    };

    if (categoryId) {
      params.category_id = categoryId;
    }

    const directUrl = this.buildXtreamUrl(host, 'player_api.php', params);
    const url = this.getProxiedUrl(directUrl);

    return this.http.get<XtreamStream[]>(url)
      .pipe(
        map(streams => streams.map(stream => this.mapXtreamToChannel(stream, host, username, password))),
        tap(channels => this.channelsSubject.next(channels)),
        catchError(this.handleError)
      );
  }

  /**
   * Obtiene las categorías de VOD (películas)
   */
  getXtreamVodCategories(host: string, username: string, password: string): Observable<Category[]> {
    const directUrl = this.buildXtreamUrl(host, 'player_api.php', {
      username,
      password,
      action: 'get_vod_categories'
    });
    const url = this.getProxiedUrl(directUrl);

    return this.http.get<XtreamCategory[]>(url)
      .pipe(
        map(categories => categories.map(cat => ({
          id: cat.category_id,
          name: cat.category_name,
          parentId: cat.parent_id ? cat.parent_id.toString() : undefined,
          type: 'movie' as const
        }))),
        catchError(this.handleError)
      );
  }

  /**
   * Obtiene los streams de VOD
   */
  getXtreamVodStreams(
    host: string,
    username: string,
    password: string,
    categoryId?: string
  ): Observable<Channel[]> {
    const params: any = {
      username,
      password,
      action: 'get_vod_streams'
    };

    if (categoryId) {
      params.category_id = categoryId;
    }

    const directUrl = this.buildXtreamUrl(host, 'player_api.php', params);
    const url = this.getProxiedUrl(directUrl);

    return this.http.get<any[]>(url)
      .pipe(
        map(streams => streams.map(stream => ({
          id: stream.stream_id?.toString() || stream.num?.toString(),
          name: stream.name,
          streamUrl: this.getProxiedUrl(this.buildXtreamStreamUrl(host, username, password, stream.stream_id, stream.container_extension || 'mp4', 'movie')),
          logo: this.sanitizeLogoUrl(stream.stream_icon),
          categoryId: stream.category_id,
          streamType: 'movie' as const,
          added: stream.added,
          containerExtension: stream.container_extension
        }))),
        catchError(this.handleError)
      );
  }

  /**
   * ==========================================
   * MÉTODOS PARA SERIES (Xtream Codes)
   * ==========================================
   */

  /**
   * Obtiene las categorías de Series
   */
  getXtreamSeriesCategories(host: string, username: string, password: string): Observable<Category[]> {
    const directUrl = this.buildXtreamUrl(host, 'player_api.php', {
      username,
      password,
      action: 'get_series_categories'
    });
    const url = this.getProxiedUrl(directUrl);

    return this.http.get<XtreamCategory[]>(url)
      .pipe(
        map(categories => categories.map(cat => ({
          id: cat.category_id,
          name: cat.category_name,
          parentId: cat.parent_id ? cat.parent_id.toString() : undefined,
          type: 'series' as const
        }))),
        catchError(this.handleError)
      );
  }

  /**
   * Obtiene la lista de series
   */
  getXtreamSeries(
    host: string,
    username: string,
    password: string,
    categoryId?: string
  ): Observable<XtreamSeries[]> {
    const params: any = {
      username,
      password,
      action: 'get_series'
    };

    if (categoryId) {
      params.category_id = categoryId;
    }

    const directUrl = this.buildXtreamUrl(host, 'player_api.php', params);
    const url = this.getProxiedUrl(directUrl);

    return this.http.get<XtreamSeries[]>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtiene la info detallada de una serie (temporadas + episodios)
   */
  getXtreamSeriesInfo(
    host: string,
    username: string,
    password: string,
    seriesId: number
  ): Observable<XtreamSeriesInfo> {
    const directUrl = this.buildXtreamUrl(host, 'player_api.php', {
      username,
      password,
      action: 'get_series_info',
      series_id: seriesId.toString()
    });
    const url = this.getProxiedUrl(directUrl);

    return this.http.get<XtreamSeriesInfo>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Convierte episodios de una serie en Channels reproducibles
   */
  mapEpisodesToChannels(
    episodes: XtreamEpisode[],
    seriesName: string,
    host: string,
    username: string,
    password: string,
    cover?: string
  ): Channel[] {
    return episodes.map(ep => ({
      id: `series_${ep.id}`,
      name: ep.title || `${seriesName} - S${ep.season}E${ep.episode_num}`,
      streamUrl: this.getProxiedUrl(this.buildXtreamStreamUrl(host, username, password, parseInt(ep.id), ep.container_extension || 'mkv', 'series')),
      logo: this.sanitizeLogoUrl(cover),
      categoryName: `Temporada ${ep.season}`,
      categoryId: `season_${ep.season}`,
      streamType: 'series' as const,
      added: ep.added,
      containerExtension: ep.container_extension
    }));
  }

  /**
   * Construye la URL del stream de Xtream
   */
  private buildXtreamStreamUrl(
    host: string,
    username: string,
    password: string,
    streamId: number,
    extension: string = 'm3u8',
    type: 'live' | 'movie' | 'series' = 'live'
  ): string {
    const cleanHost = host.replace(/\/$/, '');
    // Formato Xtream: http://host:port/{type}/username/password/streamId.extension
    const streamUrl = `${cleanHost}/${type}/${username}/${password}/${streamId}.${extension}`;
    return streamUrl;
  }

  /**
   * Mapea un stream de Xtream al formato común de Channel
   */
  private mapXtreamToChannel(stream: XtreamStream, host: string, username: string, password: string): Channel {
    const rawUrl = this.buildXtreamStreamUrl(host, username, password, stream.stream_id, 'm3u8');
    const streamUrl = this.getProxiedUrl(rawUrl);
    
    return {
      id: stream.stream_id.toString(),
      name: stream.name,
      streamUrl: streamUrl,
      logo: this.sanitizeLogoUrl(stream.stream_icon),
      categoryId: stream.category_id,
      epgChannelId: stream.epg_channel_id,
      streamType: 'live',
      added: stream.added,
      tvArchive: stream.tv_archive,
      tvArchiveDuration: stream.tv_archive_duration
    };
  }

  /**
   * Construye una URL de Xtream Codes API
   */
  private buildXtreamUrl(host: string, endpoint: string, params: Record<string, string>): string {
    const cleanHost = host.replace(/\/$/, '');
    const queryString = new URLSearchParams(params).toString();
    return `${cleanHost}/${endpoint}?${queryString}`;
  }

  /**
   * ==========================================
   * MÉTODOS AUXILIARES
   * ==========================================
   */

  /**
   * Genera un ID único para una categoría basado en su nombre
   */
  private generateCategoryId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Establece el estado de carga
   */
  private setLoading(isLoading: boolean, message?: string, error?: string): void {
    this.loadingSubject.next({ isLoading, message, error });
  }

  /**
   * Maneja errores HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ocurrió un error desconocido';

    if (error.error instanceof ErrorEvent) {
      // Error del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del servidor
      errorMessage = `Error ${error.status}: ${error.message}`;
      
      // Mensajes específicos para problemas comunes
      if (error.status === 0) {
        errorMessage = 'No se pudo conectar al servidor. Verifica CORS o usa un proxy.';
      } else if (error.status === 404) {
        errorMessage = 'Recurso no encontrado. Verifica la URL.';
      } else if (error.status === 401 || error.status === 403) {
        errorMessage = 'Credenciales inválidas o acceso denegado.';
      }
    }

    console.error('Error en IptvService:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Filtra canales por nombre
   */
  filterChannelsByName(searchTerm: string): Channel[] {
    const channels = this.channelsSubject.value;
    if (!searchTerm.trim()) {
      return channels;
    }

    const term = searchTerm.toLowerCase();
    return channels.filter(channel => 
      channel.name.toLowerCase().includes(term)
    );
  }

  /**
   * Filtra canales por categoría
   */
  filterChannelsByCategory(categoryId: string): Channel[] {
    const channels = this.channelsSubject.value;
    return channels.filter(channel => channel.categoryId === categoryId);
  }

  /**
   * Selecciona un canal para reproducir
   */
  selectChannel(channel: Channel): void {
    this.selectedChannel.set(channel);
    this.storage.saveLastChannel(channel.id);
  }

  /**
   * Cierra sesión y limpia datos
   */
  logout(): void {
    this.storage.clearCredentials();
    this.isAuthenticated.set(false);
    this.channelsSubject.next([]);
    this.categoriesSubject.next([]);
    this.selectedChannel.set(null);
    this.xtreamServerInfo = null;
  }

  /**
   * Obtiene el canal actual
   */
  getCurrentChannel(): Channel | null {
    return this.selectedChannel();
  }

  /**
   * Obtiene todos los canales actuales
   */
  getChannels(): Channel[] {
    return this.channelsSubject.value;
  }

  /**
   * Obtiene todas las categorías actuales
   */
  getCategories(): Category[] {
    return this.categoriesSubject.value;
  }
}
