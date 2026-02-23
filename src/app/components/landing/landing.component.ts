import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IptvService } from '../../services/iptv.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  showMobileMenu = false;

  constructor(
    private router: Router,
    private iptvService: IptvService
  ) {
    // Si ya está autenticado, ir al dashboard
    if (this.iptvService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
