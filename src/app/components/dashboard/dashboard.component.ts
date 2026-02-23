import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IptvService } from '../../services/iptv.service';
import { StorageService } from '../../services/storage.service';
import { VideoPlayerComponent } from '../video-player/video-player.component';
import { Channel, Category } from '../../models/channel.interface';

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
    
    // Filtrar por categoría
    if (this.selectedCategoryId()) {
      channels = channels.filter(ch => ch.categoryId === this.selectedCategoryId());
    }
    
    // Filtrar por búsqueda
    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      channels = channels.filter(ch => 
        ch.name.toLowerCase().includes(term)
      );
    }
    
    // Filtrar por favoritos
    if (this.showFavoritesOnly()) {
      const favorites = this.storage.favorites();
      channels = channels.filter(ch => favorites.includes(ch.id));
    }
    
    return channels;
  });

  constructor(
    public iptvService: IptvService,
    private storage: StorageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Verificar autenticación
    if (!this.iptvService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Suscribirse a canales y categorías
    this.iptvService.channels$.subscribe(channels => {
      this.channels.set(channels);
    });

    this.iptvService.categories$.subscribe(categories => {
      this.categories.set(categories);
    });

    // Sincronizar canal seleccionado
    this.selectedChannel.set(this.iptvService.selectedChannel());

    // Check screen size for sidebar
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  private checkScreenSize(): void {
    if (window.innerWidth < 768) {
      this.isSidebarOpen.set(true); // On mobile, sidebar is always "open" but hidden via overlay
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
    // Close mobile sidebar when selecting channel
    this.isMobileSidebarOpen.set(false);
  }

  /**
   * Cierra el reproductor
   */
  closePlayer(): void {
    this.selectedChannel.set(null); 
    this.isTheatreMode.set(false);
  }

  /**
   * Toggle theatre mode
   */
  toggleTheatreMode(): void {
    this.isTheatreMode.set(!this.isTheatreMode());
  }

  /**
   * Selecciona una categoría para filtrar
   */
  selectCategory(categoryId: string | null): void {
    this.selectedCategoryId.set(categoryId);
    this.isMobileSidebarOpen.set(false);
  }

  /**
   * Alterna el sidebar
   */
  toggleSidebar(): void {
    this.isSidebarOpen.set(!this.isSidebarOpen());
  }

  /**
   * Alterna favoritos
   */
  toggleFavorite(channelId: string, event: Event): void {
    event.stopPropagation();
    if (this.storage.isFavorite(channelId)) {
      this.storage.removeFavorite(channelId);
    } else {
      this.storage.addFavorite(channelId);
    }
  }

  /**
   * Verifica si un canal es favorito
   */
  isFavorite(channelId: string): boolean {
    return this.storage.isFavorite(channelId);
  }

  /**
   * Alterna el menú de usuario
   */
  toggleUserMenu(): void {
    this.showUserMenu.set(!this.showUserMenu());
  }

  /**
   * Cierra sesión
   */
  logout(): void {
    this.iptvService.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Obtiene el conteo de canales por categoría
   */
  getCategoryCount(categoryId: string): number {
    return this.channels().filter(ch => ch.categoryId === categoryId).length;
  }

  /**
   * Limpia la búsqueda
   */
  clearSearch(): void {
    this.searchTerm.set('');
  }
}
