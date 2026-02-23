/**
 * Interfaz unificada para canales IPTV
 * Soporta tanto M3U como Xtream Codes API
 */
export interface Channel {
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

/**
 * Categoría de canales
 */
export interface Category {
  id: string;
  name: string;
  parentId?: string;
  type?: 'live' | 'movie' | 'series';
}

/**
 * Credenciales de usuario para diferentes tipos de fuentes
 */
export interface UserCredentials {
  type: 'm3u' | 'xtream';
  m3uUrl?: string;
  xtreamHost?: string;
  xtreamUsername?: string;
  xtreamPassword?: string;
  lastUsed?: string;
}

/**
 * Respuesta de autenticación de Xtream Codes
 */
export interface XtreamAuthResponse {
  user_info: {
    username: string;
    password: string;
    message: string;
    auth: number;
    status: string;
    exp_date: string;
    is_trial: string;
    active_cons: string;
    created_at: string;
    max_connections: string;
    allowed_output_formats: string[];
  };
  server_info: {
    url: string;
    port: string;
    https_port: string;
    server_protocol: string;
    rtmp_port: string;
    timezone: string;
    timestamp_now: number;
    time_now: string;
  };
}

/**
 * Respuesta de categorías de Xtream Codes
 */
export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

/**
 * Respuesta de streams de Xtream Codes
 */
export interface XtreamStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon?: string;
  epg_channel_id?: string;
  added: string;
  category_id: string;
  custom_sid?: string;
  tv_archive?: number;
  direct_source?: string;
  tv_archive_duration?: number;
}

/**
 * Estado de carga de la aplicación
 */
export interface LoadingState {
  isLoading: boolean;
  message?: string;
  error?: string;
}

/**
 * Configuración de la aplicación
 */
export interface AppConfig {
  proxyUrl?: string;
  enableCorsProxy: boolean;
  videoPlayerType: 'videojs' | 'hlsjs';
  autoplay: boolean;
  volume: number;
}

/**
 * Lista/Playlist guardada para persistencia
 */
export interface SavedPlaylist {
  id: string;
  name: string;
  credentials: UserCredentials;
  addedAt: string;
  lastUsed?: string;
  channelCount?: number;
  icon?: string;
}
