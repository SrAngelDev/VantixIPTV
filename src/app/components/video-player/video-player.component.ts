import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, signal, effect, AfterViewInit, computed, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import Hls from 'hls.js';
import { Channel } from '../../models/channel.interface';

export interface AudioTrackInfo {
  id: number;
  label: string;
  language: string;
  enabled: boolean;
}

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-player.component.html',
  styleUrl: './video-player.component.css'
})
export class VideoPlayerComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  private hls?: Hls;
  private _channel = signal<Channel | null>(null);
  private retryCount = 0;
  private readonly MAX_RETRIES = 2;
  private retryTimeout?: any;
  private controlsTimeout?: any;
  private lastDetectedTrackCount = -1;

  @Input()
  set channel(value: Channel | null) {
    this._channel.set(value);
  }
  get channel(): Channel | null {
    return this._channel();
  }

  isLoading = signal(false);
  error = signal<string | null>(null);
  showControls = signal(true);

  // Audio tracks — Hls.js los expone nativamente
  audioTracks = signal<AudioTrackInfo[]>([]);
  showAudioMenu = signal(false);
  activeAudioTrack = signal<string>('');
  hasMultipleAudioTracks = computed(() => this.audioTracks().length > 1);

  constructor(private ngZone: NgZone) {
    effect(() => {
      const channel = this._channel();
      if (channel && this.videoElement) {
        this.loadChannel(channel);
      }
    });
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.setupVideoListeners();

    if (this._channel()) {
      this.loadChannel(this._channel()!);
    }
  }

  ngOnDestroy(): void {
    this.destroyHls();
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    if (this.controlsTimeout) clearTimeout(this.controlsTimeout);
  }

  /**
   * Configura los event listeners del elemento <video> nativo
   */
  private setupVideoListeners(): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    video.addEventListener('loadstart', () => {
      this.ngZone.run(() => {
        this.isLoading.set(true);
        this.error.set(null);
      });
    });

    video.addEventListener('canplay', () => {
      this.ngZone.run(() => this.isLoading.set(false));
    });

    video.addEventListener('playing', () => {
      this.ngZone.run(() => this.isLoading.set(false));
    });

    video.addEventListener('error', () => {
      this.ngZone.run(() => {
        this.isLoading.set(false);
        const mediaError = video.error;
        if (mediaError) {
          if ((mediaError.code === MediaError.MEDIA_ERR_NETWORK || mediaError.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED)
              && this.retryCount < this.MAX_RETRIES) {
            this.retryCount++;
            console.warn(`[PLAYER] Error code ${mediaError.code}, reintentando (${this.retryCount}/${this.MAX_RETRIES})...`);
            this.retryTimeout = setTimeout(() => {
              const ch = this._channel();
              if (ch) this.loadChannel(ch);
            }, 2000 * this.retryCount);
          } else {
            this.error.set(`Error de reproducción (código ${mediaError.code})`);
          }
        }
      });
    });

    // Controles auto-hide
    video.addEventListener('mousemove', () => this.resetControlsTimeout());
    video.addEventListener('click', () => this.togglePlayPause());
  }

  /**
   * Carga un canal HLS usando Hls.js o fallback nativo
   */
  loadChannel(channel: Channel): void {
    // Cancelar reintento pendiente
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = undefined;
    }

    // Resetear conteo de reintentos al cambiar de canal
    if (this._channel()?.id !== channel.id || this.retryCount === 0) {
      this.retryCount = 0;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.audioTracks.set([]);
    this.showAudioMenu.set(false);
    this.lastDetectedTrackCount = -1;

    const video = this.videoElement?.nativeElement;
    if (!video) return;

    // Pausar antes de cambiar fuente
    video.pause();

    const streamUrl = channel.streamUrl;

    // Destruir instancia HLS previa
    this.destroyHls();

    if (Hls.isSupported()) {
      this.initHls(streamUrl, video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari nativo
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => {
          if (e.name !== 'AbortError') {
            console.warn('[PLAYER] Autoplay prevented:', e.message);
          }
        });
      }, { once: true });
    } else {
      this.error.set('Tu navegador no soporta la reproducción HLS');
    }
  }

  /**
   * Inicializa Hls.js con la configuración óptima
   */
  private initHls(url: string, video: HTMLVideoElement): void {
    this.hls = new Hls({
      debug: false,
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 90,
      maxBufferLength: 30,
      maxMaxBufferLength: 600,
      startLevel: -1, // Auto ABR
    });

    const hls = this.hls;

    // ═══════════════════════════════════════════
    // EVENTOS HLS
    // ═══════════════════════════════════════════

    hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
      this.ngZone.run(() => {
        console.log(`[HLS] Manifest parsed: ${data.levels.length} quality levels`);
        // Intentar reproducir
        video.play().catch(e => {
          if (e.name !== 'AbortError') {
            console.warn('[PLAYER] Autoplay prevented:', e.message);
          }
        });
        // Detectar audio tracks del manifiesto
        this.updateAudioTracks();
      });
    });

    // ═══════════════════════════════════════════
    // AUDIO TRACKS — El core de Hls.js
    // ═══════════════════════════════════════════

    hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_event, data) => {
      this.ngZone.run(() => {
        console.log(`[HLS] Audio tracks updated: ${data.audioTracks.length} tracks`);
        this.updateAudioTracks();
      });
    });

    hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_event, data) => {
      this.ngZone.run(() => {
        console.log(`[HLS] Audio track switched to: ${data.id}`);
        this.updateAudioTracks();
      });
    });

    hls.on(Hls.Events.AUDIO_TRACK_LOADING, (_event, data) => {
      console.log(`[HLS] Loading audio track: ${data.url}`);
    });

    // ═══════════════════════════════════════════
    // QUALITY / LEVEL EVENTS
    // ═══════════════════════════════════════════

    hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
      console.log(`[HLS] Quality level switched to: ${data.level}`);
    });

    // ═══════════════════════════════════════════
    // ERROR HANDLING
    // ═══════════════════════════════════════════

    hls.on(Hls.Events.ERROR, (_event, data) => {
      this.ngZone.run(() => {
        if (data.fatal) {
          console.error(`[HLS] Fatal error: ${data.type} - ${data.details}`);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (this.retryCount < this.MAX_RETRIES) {
                this.retryCount++;
                console.warn(`[HLS] Network error, retrying (${this.retryCount}/${this.MAX_RETRIES})...`);
                hls.startLoad();
              } else {
                this.error.set('Error de red: no se puede cargar el stream');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HLS] Media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              this.error.set(`Error fatal de reproducción`);
              this.destroyHls();
              break;
          }
        }
      });
    });

    // Conectar a video y cargar
    hls.attachMedia(video);
    hls.loadSource(url);
  }

  /**
   * Actualiza la lista de audio tracks desde Hls.js.
   * Hls.js detecta audio tracks de:
   * - #EXT-X-MEDIA:TYPE=AUDIO en el manifiesto HLS
   * - Audio PIDs embebidos en segmentos MPEG-TS (demuxer interno)
   * - Alternate audio renditions
   */
  private updateAudioTracks(): void {
    if (!this.hls) return;

    const hlsAudioTracks = this.hls.audioTracks;
    const currentTrackId = this.hls.audioTrack;

    if (hlsAudioTracks.length === this.lastDetectedTrackCount) return;
    this.lastDetectedTrackCount = hlsAudioTracks.length;

    if (hlsAudioTracks.length > 0) {
      const trackList: AudioTrackInfo[] = hlsAudioTracks.map((track, index) => ({
        id: track.id ?? index,
        label: track.name || this.getTrackLabel(track.lang || '', index),
        language: track.lang || '',
        enabled: (track.id ?? index) === currentTrackId
      }));

      console.log(`[AUDIO] ${trackList.length} audio track(s) detectados:`);
      trackList.forEach((t, i) =>
        console.log(`[AUDIO]   [${i}] "${t.label}" lang="${t.language}" active=${t.enabled}`)
      );

      this.audioTracks.set(trackList);
      const active = trackList.find(t => t.enabled);
      if (active) this.activeAudioTrack.set(active.label);
    } else {
      // Fallback: comprobar audio tracks nativos del <video>
      this.detectNativeAudioTracks();
    }
  }

  /**
   * Fallback: detecta audio tracks del elemento <video> nativo (Safari)
   */
  private detectNativeAudioTracks(): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    const nativeTracks = (video as any).audioTracks;
    if (nativeTracks && nativeTracks.length > 0) {
      const trackList: AudioTrackInfo[] = [];
      for (let i = 0; i < nativeTracks.length; i++) {
        const t = nativeTracks[i];
        trackList.push({
          id: i,
          label: t.label || this.getTrackLabel(t.language || '', i),
          language: t.language || '',
          enabled: t.enabled
        });
      }
      if (trackList.length !== this.audioTracks().length) {
        console.log(`[AUDIO] ${trackList.length} track(s) nativos detectados`);
      }
      this.audioTracks.set(trackList);
    }
  }

  /**
   * Cambia la pista de audio activa
   */
  selectAudioTrack(trackId: number): void {
    if (!this.hls) return;

    console.log(`[AUDIO] Cambiando a pista ${trackId}`);

    // Hls.js: cambio directo por ID — así de simple
    this.hls.audioTrack = trackId;

    // Actualizar UI inmediatamente
    const tracks = this.audioTracks();
    const updatedTracks = tracks.map(t => ({ ...t, enabled: t.id === trackId }));
    this.audioTracks.set(updatedTracks);

    const active = updatedTracks.find(t => t.enabled);
    if (active) this.activeAudioTrack.set(active.label);

    this.showAudioMenu.set(false);
  }

  /**
   * Genera una etiqueta legible para la pista de audio
   */
  private getTrackLabel(language: string, index: number): string {
    const langMap: Record<string, string> = {
      'es': 'Español', 'spa': 'Español',
      'en': 'English', 'eng': 'English',
      'pt': 'Português', 'por': 'Português',
      'fr': 'Français', 'fra': 'Français',
      'de': 'Deutsch', 'deu': 'Deutsch',
      'it': 'Italiano', 'ita': 'Italiano',
      'ca': 'Català', 'cat': 'Català',
      'eu': 'Euskara', 'eus': 'Euskara',
      'gl': 'Galego', 'glg': 'Galego',
      'ja': '日本語', 'jpn': '日本語',
      'ko': '한국어', 'kor': '한국어',
      'zh': '中文', 'zho': '中文',
      'ar': 'العربية', 'ara': 'العربية',
      'ru': 'Русский', 'rus': 'Русский',
      'und': 'Pista ' + (index + 1),
      '': 'Pista ' + (index + 1)
    };
    return langMap[language?.toLowerCase()] || language || 'Pista ' + (index + 1);
  }

  /**
   * Destruye la instancia HLS limpiamente
   */
  private destroyHls(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = undefined;
    }
  }

  // ═══════════════════════════════════════════
  // CONTROLES DE REPRODUCCIÓN
  // ═══════════════════════════════════════════

  togglePlayPause(): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    if (video.paused) {
      video.play().catch(e => {
        if (e.name !== 'AbortError') {
          console.warn('[PLAYER] Play prevented:', e.message);
        }
      });
    } else {
      video.pause();
    }
  }

  private resetControlsTimeout(): void {
    this.showControls.set(true);
    if (this.controlsTimeout) clearTimeout(this.controlsTimeout);
    this.controlsTimeout = setTimeout(() => {
      const video = this.videoElement?.nativeElement;
      if (video && !video.paused) {
        this.showControls.set(false);
      }
    }, 3000);
  }

  // ═══════════════════════════════════════════
  // AUDIO MENU UI
  // ═══════════════════════════════════════════

  toggleAudioMenu(): void {
    this.showAudioMenu.update(v => !v);
  }

  closeAudioMenu(): void {
    this.showAudioMenu.set(false);
  }
}
