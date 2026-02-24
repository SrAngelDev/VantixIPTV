import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, signal, effect, AfterViewInit, computed, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import videojs from 'video.js';
import { Channel } from '../../models/channel.interface';

type VideoJsPlayer = ReturnType<typeof videojs>;

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
  
  private player?: VideoJsPlayer;
  private _channel = signal<Channel | null>(null);
  private audioDetectionTimer?: any;
  private playPromise?: Promise<void>;
  private retryCount = 0;
  private readonly MAX_RETRIES = 2;
  private retryTimeout?: any;
  
  @Input() 
  set channel(value: Channel | null) {
    this._channel.set(value);
  }
  get channel(): Channel | null {
    return this._channel();
  }

  isLoading = signal(false);
  error = signal<string | null>(null);

  // Audio tracks
  audioTracks = signal<AudioTrackInfo[]>([]);
  showAudioMenu = signal(false);
  activeAudioTrack = signal<string>('');
  hasMultipleAudioTracks = computed(() => this.audioTracks().length > 1);

  constructor(private ngZone: NgZone) {
    effect(() => {
      const channel = this._channel();
      if (channel && this.player) {
        this.loadChannel(channel);
      }
    });
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initializePlayer();
    
    if (this._channel()) {
      this.loadChannel(this._channel()!);
    }
  }

  ngOnDestroy(): void {
    if (this.audioDetectionTimer) {
      clearTimeout(this.audioDetectionTimer);
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    if (this.player) {
      this.player.dispose();
      this.player = undefined;
    }
  }

  private initializePlayer(): void {
    if (!this.videoElement) return;

    this.player = videojs(this.videoElement.nativeElement, {
      controls: true,
      autoplay: true,
      preload: 'auto',
      fluid: false,
      fill: true,
      responsive: true,
      liveui: true,
      html5: {
        vhs: {
          overrideNative: true,
          enableLowInitialPlaylist: true,
          smoothQualityChange: true,
          useBandwidthFromLocalStorage: true
        }
      },
      controlBar: {
        pictureInPictureToggle: true
      }
    });

    this.setupPlayerEvents();
  }

  private setupPlayerEvents(): void {
    if (!this.player) return;

    this.player.on('loadstart', () => {
      this.ngZone.run(() => {
        this.isLoading.set(true);
        this.error.set(null);
        this.audioTracks.set([]);
        this.showAudioMenu.set(false);
      });
    });

    this.player.on('canplay', () => {
      this.ngZone.run(() => {
        this.isLoading.set(false);
      });
    });

    this.player.on('error', () => {
      this.ngZone.run(() => {
        this.isLoading.set(false);
        const error = this.player?.error();
        if (error) {
          // Reintentar automáticamente en errores de red/fuente (code 2 o 4)
          if ((error.code === 2 || error.code === 4) && this.retryCount < this.MAX_RETRIES) {
            this.retryCount++;
            console.warn(`[VIDEO-PLAYER] Error code ${error.code}, reintentando (${this.retryCount}/${this.MAX_RETRIES})...`);
            this.retryTimeout = setTimeout(() => {
              const ch = this._channel();
              if (ch && this.player) {
                this.player.error(undefined); // Limpiar error anterior
                this.loadChannel(ch);
              }
            }, 2000 * this.retryCount); // Backoff incremental
          } else {
            this.error.set(`Error de reproducción (${error.code})`);
          }
        }
      });
    });

    // Detectar pistas de audio cuando el stream carga
    this.player.on('loadedmetadata', () => {
      this.ngZone.run(() => this.detectAudioTracks());
      // Reintentar detección con retardo (a veces los tracks se añaden después del metadata)
      this.scheduleAudioDetection(1000);
      this.scheduleAudioDetection(3000);
      this.scheduleAudioDetection(5000);
    });

    // También detectar en canplay (backup)
    this.player.on('canplay', () => {
      this.ngZone.run(() => this.detectAudioTracks());
    });

    this.setupAudioTrackListeners();
  }

  /**
   * Configura listeners en AudioTrackList (se llama al iniciar y al cargar cada canal)
   */
  private setupAudioTrackListeners(): void {
    if (!this.player) return;

    const tracks = this.player.audioTracks();
    if (tracks) {
      const handler = () => this.ngZone.run(() => this.detectAudioTracks());
      tracks.addEventListener('addtrack', handler);
      tracks.addEventListener('removetrack', handler);
      tracks.addEventListener('change', handler);
    }
  }

  /**
   * Programa una detección de audio con retardo
   */
  private scheduleAudioDetection(delayMs: number): void {
    setTimeout(() => {
      this.ngZone.run(() => this.detectAudioTracks());
    }, delayMs);
  }

  loadChannel(channel: Channel): void {
    if (!this.player) return;

    // Cancelar reintento pendiente
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = undefined;
    }

    // Resetear conteo de reintentos al cambiar de canal (no al reintentar)
    if (this._channel()?.id !== channel.id || this.retryCount === 0) {
      this.retryCount = 0;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.audioTracks.set([]);
    this.showAudioMenu.set(false);

    // Pausar antes de cambiar fuente para evitar "play() interrupted"
    this.player.pause();

    let streamUrl = channel.streamUrl;

    this.player.src({
      src: streamUrl,
      type: 'application/x-mpegURL'
    });

    // Re-attach audio track listeners para el nuevo stream
    this.setupAudioTrackListeners();

    // Esperar a que el player esté listo antes de reproducir
    this.player.ready(() => {
      // Pequeño delay para evitar conflictos de carga
      setTimeout(() => {
        if (this.player && !this.player.paused()) return; // Ya está reproduciendo
        this.player?.play()?.catch((e: Error) => {
          // Solo loguear si no es una interrupción por nueva carga
          if (e.name !== 'AbortError') {
            console.warn('[VIDEO-PLAYER] Autoplay prevented:', e.message);
          }
        });
      }, 100);
    });
  }

  /**
   * Detecta las pistas de audio disponibles en el stream
   */
  private detectAudioTracks(): void {
    if (!this.player) return;

    const tracks: any = this.player.audioTracks();
    if (!tracks || tracks.length === 0) {
      this.audioTracks.set([]);
      return;
    }

    const trackList: AudioTrackInfo[] = [];
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      trackList.push({
        id: i,
        label: track.label || this.getTrackLabel(track.language, i),
        language: track.language || '',
        enabled: track.enabled
      });
      if (track.enabled) {
        this.activeAudioTrack.set(track.label || this.getTrackLabel(track.language, i));
      }
    }
    this.audioTracks.set(trackList);
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
      'und': 'Pista ' + (index + 1),
      '': 'Pista ' + (index + 1)
    };
    return langMap[language?.toLowerCase()] || language || 'Pista ' + (index + 1);
  }

  /**
   * Cambia la pista de audio activa
   */
  selectAudioTrack(trackId: number): void {
    if (!this.player) return;

    const tracks: any = this.player.audioTracks();
    if (!tracks) return;

    for (let i = 0; i < tracks.length; i++) {
      tracks[i].enabled = (i === trackId);
    }

    this.detectAudioTracks();
    this.showAudioMenu.set(false);
  }

  /**
   * Toggle del menú de audio
   */
  toggleAudioMenu(): void {
    this.showAudioMenu.update(v => !v);
  }

  /**
   * Cierra el menú de audio
   */
  closeAudioMenu(): void {
    this.showAudioMenu.set(false);
  }
}
