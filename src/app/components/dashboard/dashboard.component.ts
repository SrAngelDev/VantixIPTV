import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IptvService } from '../../services/iptv.service';
import { StorageService } from '../../services/storage.service';
import { VideoPlayerComponent } from '../video-player/video-player.component';
import { Channel, Category, ContentType, XtreamSeries, XtreamSeriesInfo, XtreamEpisode } from '../../models/channel.interface';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, VideoPlayerComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  // Estado
  channels = signal<Channel[]>([]);
  categories = signal<Category[]>([]);
  selectedChannel = signal<Channel | null>(null);
  
  // Tipo de contenido
  contentType = signal<ContentType>('live');
  isXtream = signal(false);
  contentLoading = signal(false);

  // Series
  seriesList = signal<XtreamSeries[]>([]);
  selectedSeries = signal<XtreamSeries | null>(null);
  seriesInfo = signal<XtreamSeriesInfo | null>(null);
  selectedSeason = signal<number>(1);
  seriesLoading = signal(false);

  // Filtros
  searchTerm = signal('');
  selectedCategoryId = signal<string | null>(null);
  showFavoritesOnly = signal(false);
  
  // UI
  isSidebarOpen = signal(true);
  isMobileSidebarOpen = signal(false);
  isTheatreMode = signal(false);
  showUserMenu = signal(false);
  
  // Canales filtrados
  filteredChannels = computed(() => {
    let channels = this.channels();
    
    if (this.selectedCategoryId()) {
      channels = channels.filter(ch => ch.categoryId === this.selectedCategoryId());
    }
    
    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      channels = channels.filter(ch => 
        ch.name.toLowerCase().includes(term)
      );
    }
    
    if (this.showFavoritesOnly()) {
      const favorites = this.storage.favorites();
      channels = channels.filter(ch => favorites.includes(ch.id));
    }
    
    return channels;
  });

  // Series filtradas
  filteredSeries = computed(() => {
    let series = this.seriesList();
    
    if (this.selectedCategoryId()) {
      series = series.filter(s => s.category_id === this.selectedCategoryId());
    }
    
    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      series = series.filter(s => 
        s.name.toLowerCase().includes(term)
      );
    }
    
    return series;
  });

  // Episodios de la temporada seleccionada
  seasonEpisodes = computed(() => {
    const info = this.seriesInfo();
    if (!info?.episodes) return [];
    const seasonKey = this.selectedSeason().toString();
    return info.episodes[seasonKey] || [];
  });

  // Temporadas disponibles
  availableSeasons = computed(() => {
    const info = this.seriesInfo();
    if (!info?.episodes) return [];
    return Object.keys(info.episodes)
      .map(k => parseInt(k))
      .sort((a, b) => a - b);
  });

  constructor(
    public iptvService: IptvService,
    private storage: StorageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.iptvService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Detectar tipo de conexión
    const credentials = this.storage.getCredentials();
    this.isXtream.set(credentials?.type === 'xtream');

    this.iptvService.channels$.subscribe(channels => {
      this.channels.set(channels);
    });

    this.iptvService.categories$.subscribe(categories => {
      this.categories.set(categories);
    });

    this.selectedChannel.set(this.iptvService.selectedChannel());

    // Si es Xtream, cargar canales en vivo por defecto
    if (this.isXtream() && credentials) {
      this.loadContentType('live');
    }

    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  private checkScreenSize(): void {
    if (window.innerWidth < 768) {
      this.isSidebarOpen.set(true);
    }
  }

  /**
   * Cambia el tipo de contenido (TV, Películas, Series)
   */
  switchContentType(type: ContentType): void {
    if (this.contentType() === type && !this.contentLoading()) return;
    
    this.contentType.set(type);
    this.selectedCategoryId.set(null);
    this.searchTerm.set('');
    this.showFavoritesOnly.set(false);
    this.selectedSeries.set(null);
    this.seriesInfo.set(null);
    
    this.loadContentType(type);
  }

  /**
   * Carga categorías y contenido según el tipo
   */
  private loadContentType(type: ContentType): void {
    const credentials = this.storage.getCredentials();
    if (!credentials || credentials.type !== 'xtream') return;

    const host = credentials.xtreamHost!;
    const user = credentials.xtreamUsername!;
    const pass = credentials.xtreamPassword!;
    
    this.contentLoading.set(true);

    if (type === 'live') {
      this.iptvService.getXtreamLiveCategories(host, user, pass).subscribe({
        next: (cats) => {
          this.categories.set(cats);
          this.iptvService.getXtreamLiveStreams(host, user, pass).subscribe({
            next: () => this.contentLoading.set(false),
            error: () => this.contentLoading.set(false)
          });
        },
        error: () => this.contentLoading.set(false)
      });
    } else if (type === 'movie') {
      this.iptvService.getXtreamVodCategories(host, user, pass).subscribe({
        next: (cats) => {
          this.categories.set(cats);
          this.iptvService.getXtreamVodStreams(host, user, pass).subscribe({
            next: (channels) => {
              this.channels.set(channels);
              this.contentLoading.set(false);
            },
            error: () => this.contentLoading.set(false)
          });
        },
        error: () => this.contentLoading.set(false)
      });
    } else if (type === 'series') {
      this.iptvService.getXtreamSeriesCategories(host, user, pass).subscribe({
        next: (cats) => {
          this.categories.set(cats);
          this.iptvService.getXtreamSeries(host, user, pass).subscribe({
            next: (series) => {
              this.seriesList.set(series);
              this.contentLoading.set(false);
            },
            error: () => this.contentLoading.set(false)
          });
        },
        error: () => this.contentLoading.set(false)
      });
    }
  }

  /**
   * Selecciona una serie para ver sus temporadas/episodios
   */
  openSeries(series: XtreamSeries): void {
    this.selectedSeries.set(series);
    this.seriesLoading.set(true);
    this.selectedSeason.set(1);

    const credentials = this.storage.getCredentials();
    if (!credentials) return;

    this.iptvService.getXtreamSeriesInfo(
      credentials.xtreamHost!,
      credentials.xtreamUsername!,
      credentials.xtreamPassword!,
      series.series_id
    ).subscribe({
      next: (info) => {
        this.seriesInfo.set(info);
        // Auto-seleccionar primera temporada disponible
        const seasons = Object.keys(info.episodes || {}).map(k => parseInt(k)).sort((a, b) => a - b);
        if (seasons.length > 0) {
          this.selectedSeason.set(seasons[0]);
        }
        this.seriesLoading.set(false);
      },
      error: () => this.seriesLoading.set(false)
    });
  }

  /**
   * Vuelve a la lista de series
   */
  backToSeriesList(): void {
    this.selectedSeries.set(null);
    this.seriesInfo.set(null);
    this.selectedChannel.set(null);
  }

  /**
   * Selecciona una temporada
   */
  selectSeason(seasonNum: number): void {
    this.selectedSeason.set(seasonNum);
  }

  /**
   * Reproduce un episodio
   */
  playEpisode(episode: XtreamEpisode): void {
    const credentials = this.storage.getCredentials();
    if (!credentials) return;
    
    const series = this.selectedSeries();
    const channels = this.iptvService.mapEpisodesToChannels(
      [episode],
      series?.name || '',
      credentials.xtreamHost!,
      credentials.xtreamUsername!,
      credentials.xtreamPassword!,
      series?.cover
    );
    
    if (channels.length > 0) {
      this.selectChannel(channels[0]);
    }
  }

  /**
   * Selecciona un canal para reproducir
   */
  selectChannel(channel: Channel): void {
    if (this.selectedChannel()?.id === channel.id) {
       return;
    }
    this.iptvService.selectChannel(channel);
    this.selectedChannel.set(channel);
    this.isMobileSidebarOpen.set(false);
  }

  closePlayer(): void {
    this.selectedChannel.set(null); 
    this.isTheatreMode.set(false);
  }

  toggleTheatreMode(): void {
    this.isTheatreMode.set(!this.isTheatreMode());
  }

  selectCategory(categoryId: string | null): void {
    this.selectedCategoryId.set(categoryId);
    this.isMobileSidebarOpen.set(false);
  }

  toggleSidebar(): void {
    this.isSidebarOpen.set(!this.isSidebarOpen());
  }

  toggleFavorite(channelId: string, event: Event): void {
    event.stopPropagation();
    if (this.storage.isFavorite(channelId)) {
      this.storage.removeFavorite(channelId);
    } else {
      this.storage.addFavorite(channelId);
    }
  }

  isFavorite(channelId: string): boolean {
    return this.storage.isFavorite(channelId);
  }

  toggleUserMenu(): void {
    this.showUserMenu.set(!this.showUserMenu());
  }

  logout(): void {
    this.iptvService.logout();
    this.router.navigate(['/login']);
  }

  getCategoryCount(categoryId: string): number {
    if (this.contentType() === 'series') {
      return this.seriesList().filter(s => s.category_id === categoryId).length;
    }
    return this.channels().filter(ch => ch.categoryId === categoryId).length;
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  /**
   * Conteo total de items según el tipo de contenido
   */
  get totalItemsCount(): number {
    if (this.contentType() === 'series') {
      return this.filteredSeries().length;
    }
    return this.filteredChannels().length;
  }

  /**
   * Label del tipo de contenido
   */
  get contentLabel(): string {
    switch (this.contentType()) {
      case 'live': return 'canales';
      case 'movie': return 'películas';
      case 'series': return 'series';
    }
  }
}
