import { Injectable, signal } from '@angular/core';
import { UserCredentials, SavedPlaylist } from '../models/channel.interface';

/**
 * Servicio para gestionar la persistencia de credenciales y configuración
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly STORAGE_KEYS = {
    CREDENTIALS: 'iptv_credentials',
    LAST_CHANNEL: 'iptv_last_channel',
    FAVORITES: 'iptv_favorites',
    APP_CONFIG: 'iptv_config',
    SAVED_PLAYLISTS: 'iptv_saved_playlists'
  };

  // Signals para estado reactivo
  readonly credentials = signal<UserCredentials | null>(this.getCredentials());
  readonly favorites = signal<string[]>(this.getFavorites());
  readonly savedPlaylists = signal<SavedPlaylist[]>(this.getSavedPlaylists());

  constructor() {}

  /**
   * Guarda las credenciales de usuario
   */
  saveCredentials(credentials: UserCredentials): void {
    try {
      credentials.lastUsed = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));
      this.credentials.set(credentials);
    } catch (error) {
      console.error('Error guardando credenciales:', error);
    }
  }

  /**
   * Obtiene las credenciales guardadas
   */
  getCredentials(): UserCredentials | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.CREDENTIALS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error leyendo credenciales:', error);
      return null;
    }
  }

  /**
   * Elimina las credenciales guardadas
   */
  clearCredentials(): void {
    localStorage.removeItem(this.STORAGE_KEYS.CREDENTIALS);
    this.credentials.set(null);
  }

  /**
   * Guarda el último canal reproducido
   */
  saveLastChannel(channelId: string): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.LAST_CHANNEL, channelId);
    } catch (error) {
      console.error('Error guardando último canal:', error);
    }
  }

  /**
   * Obtiene el último canal reproducido
   */
  getLastChannel(): string | null {
    return localStorage.getItem(this.STORAGE_KEYS.LAST_CHANNEL);
  }

  /**
   * Agrega un canal a favoritos
   */
  addFavorite(channelId: string): void {
    const favorites = this.getFavorites();
    if (!favorites.includes(channelId)) {
      favorites.push(channelId);
      this.saveFavorites(favorites);
    }
  }

  /**
   * Elimina un canal de favoritos
   */
  removeFavorite(channelId: string): void {
    const favorites = this.getFavorites().filter(id => id !== channelId);
    this.saveFavorites(favorites);
  }

  /**
   * Verifica si un canal está en favoritos
   */
  isFavorite(channelId: string): boolean {
    return this.getFavorites().includes(channelId);
  }

  /**
   * Obtiene la lista de favoritos
   */
  getFavorites(): string[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error leyendo favoritos:', error);
      return [];
    }
  }

  /**
   * Guarda la lista de favoritos
   */
  private saveFavorites(favorites: string[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
      this.favorites.set(favorites);
    } catch (error) {
      console.error('Error guardando favoritos:', error);
    }
  }

  /**
   * Limpia todos los datos almacenados
   */
  clearAll(): void {
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    this.credentials.set(null);
    this.favorites.set([]);
    this.savedPlaylists.set([]);
  }

  // ==========================================
  // SAVED PLAYLISTS
  // ==========================================

  /**
   * Obtiene las playlists guardadas
   */
  getSavedPlaylists(): SavedPlaylist[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.SAVED_PLAYLISTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error leyendo playlists guardadas:', error);
      return [];
    }
  }

  /**
   * Guarda una nueva playlist
   */
  savePlaylist(name: string, credentials: UserCredentials, channelCount?: number): SavedPlaylist {
    const playlists = this.getSavedPlaylists();
    const playlist: SavedPlaylist = {
      id: this.generatePlaylistId(),
      name,
      credentials,
      addedAt: new Date().toISOString(),
      channelCount,
      icon: this.getPlaylistIcon(credentials.type)
    };
    playlists.push(playlist);
    this.persistPlaylists(playlists);
    return playlist;
  }

  /**
   * Elimina una playlist guardada
   */
  removePlaylist(id: string): void {
    const playlists = this.getSavedPlaylists().filter(p => p.id !== id);
    this.persistPlaylists(playlists);
  }

  /**
   * Actualiza el lastUsed y channelCount de una playlist
   */
  updatePlaylistUsage(id: string, channelCount?: number): void {
    const playlists = this.getSavedPlaylists();
    const playlist = playlists.find(p => p.id === id);
    if (playlist) {
      playlist.lastUsed = new Date().toISOString();
      if (channelCount !== undefined) {
        playlist.channelCount = channelCount;
      }
      this.persistPlaylists(playlists);
    }
  }

  /**
   * Verifica si ya existe una playlist con las mismas credenciales
   */
  playlistExists(credentials: UserCredentials): boolean {
    const playlists = this.getSavedPlaylists();
    return playlists.some(p => {
      if (p.credentials.type !== credentials.type) return false;
      if (credentials.type === 'm3u') {
        return p.credentials.m3uUrl === credentials.m3uUrl;
      } else {
        return p.credentials.xtreamHost === credentials.xtreamHost
          && p.credentials.xtreamUsername === credentials.xtreamUsername;
      }
    });
  }

  private persistPlaylists(playlists: SavedPlaylist[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.SAVED_PLAYLISTS, JSON.stringify(playlists));
      this.savedPlaylists.set(playlists);
    } catch (error) {
      console.error('Error guardando playlists:', error);
    }
  }

  private generatePlaylistId(): string {
    return 'pl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  }

  private getPlaylistIcon(type: 'm3u' | 'xtream'): string {
    return type === 'm3u' ? '📋' : '🔗';
  }
}
