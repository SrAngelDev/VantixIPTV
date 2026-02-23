import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IptvService } from '../../services/iptv.service';
import { StorageService } from '../../services/storage.service';
import { UserCredentials, SavedPlaylist } from '../../models/channel.interface';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  // Tipo de fuente seleccionado
  sourceType: 'm3u' | 'xtream' = 'm3u';
  
  // Datos del formulario
  playlistName: string = '';
  m3uUrl: string = '';
  xtreamHost: string = '';
  xtreamUsername: string = '';
  xtreamPassword: string = '';
  
  // Estado
  isLoading: boolean = false;
  errorMessage: string = '';
  showPassword: boolean = false;
  selectedPlaylistId: string = '';

  // Saved playlists
  savedPlaylists = computed(() => this.storage.savedPlaylists());

  constructor(
    private iptvService: IptvService,
    private storage: StorageService,
    private router: Router
  ) {}

  /**
   * Navegar a la landing page
   */
  goToLanding(): void {
    this.router.navigate(['/']);
  }

  /**
   * Cambia el tipo de fuente
   */
  selectSourceType(type: 'm3u' | 'xtream'): void {
    this.sourceType = type;
    this.errorMessage = '';
  }

  /**
   * Carga una playlist guardada
   */
  loadSavedPlaylist(playlist: SavedPlaylist): void {
    this.selectedPlaylistId = playlist.id;
    this.isLoading = true;
    this.errorMessage = '';

    this.iptvService.authenticate(playlist.credentials).subscribe({
      next: () => {
        this.isLoading = false;
        this.storage.updatePlaylistUsage(playlist.id);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isLoading = false;
        this.selectedPlaylistId = '';
        this.errorMessage = error.message || 'Error al conectar con la lista guardada.';
      }
    });
  }

  /**
   * Elimina una playlist guardada
   */
  deletePlaylist(id: string, event: Event): void {
    event.stopPropagation();
    this.storage.removePlaylist(id);
  }

  /**
   * Maneja el envío del formulario
   */
  onSubmit(): void {
    this.errorMessage = '';
    this.isLoading = true;

    const credentials: UserCredentials = {
      type: this.sourceType
    };

    if (this.sourceType === 'm3u') {
      if (!this.m3uUrl.trim()) {
        this.errorMessage = 'Por favor ingresa una URL M3U válida';
        this.isLoading = false;
        return;
      }
      credentials.m3uUrl = this.m3uUrl.trim();
    } else {
      if (!this.xtreamHost.trim() || !this.xtreamUsername.trim() || !this.xtreamPassword.trim()) {
        this.errorMessage = 'Por favor completa todos los campos de Xtream Codes';
        this.isLoading = false;
        return;
      }
      credentials.xtreamHost = this.xtreamHost.trim();
      credentials.xtreamUsername = this.xtreamUsername.trim();
      credentials.xtreamPassword = this.xtreamPassword.trim();
    }

    this.iptvService.authenticate(credentials).subscribe({
      next: () => {
        this.isLoading = false;
        // Guardar playlist si no existe ya
        if (!this.storage.playlistExists(credentials)) {
          const name = this.playlistName.trim() || this.getDefaultPlaylistName(credentials);
          this.storage.savePlaylist(name, credentials);
        }
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Error al conectar. Verifica tus credenciales.';
      }
    });
  }

  /**
   * Genera un nombre por defecto para la playlist
   */
  private getDefaultPlaylistName(credentials: UserCredentials): string {
    if (credentials.type === 'm3u') {
      try {
        const url = new URL(credentials.m3uUrl!);
        return url.hostname || 'Lista M3U';
      } catch {
        return 'Lista M3U';
      }
    } else {
      return credentials.xtreamUsername || 'Xtream Codes';
    }
  }

  /**
   * Alterna la visibilidad de la contraseña
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
