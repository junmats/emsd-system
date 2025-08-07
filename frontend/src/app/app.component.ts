import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';
import { filter, map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'School Monitoring System';
  sidebarOpen = true;

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getCurrentUser(): string {
    const user = this.authService.getCurrentUser();
    return user ? user.username : 'User';
  }

  getPageTitle(): string {
    const url = this.router.url;
    
    if (url.includes('/dashboard')) return 'Dashboard';
    if (url.includes('/students')) return 'Students';
    if (url.includes('/payments')) return 'Payments';
    if (url.includes('/charges')) return 'Charges';
    
    return 'School System';
  }
}
