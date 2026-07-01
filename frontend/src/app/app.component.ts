import { Component, ElementRef, Inject, OnInit } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AuthService } from './services/auth.service';
import { branding } from '../branding/branding.config';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = branding.schoolName;
  branding = branding;
  sidebarOpen = true;

  constructor(
    public authService: AuthService,
    private router: Router,
    private titleService: Title,
    private elementRef: ElementRef<HTMLElement>,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit() {
    this.titleService.setTitle(branding.schoolName);

    // Set primary vars as inline styles on the host element so they override
    // the :host CSS fallbacks in app.component.scss and cascade to all children.
    const host = this.elementRef.nativeElement;
    host.style.setProperty('--primary-color', branding.primaryColor);
    host.style.setProperty('--primary-dark', branding.primaryDark);
    host.style.setProperty('--side-menu-color', branding.sideMenuColor);
    host.style.setProperty('--side-menu-dark', branding.sideMenuDark);
    host.style.setProperty('--side-menu-font', branding.sideMenuFontColor);

    const favicon = this.document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
      favicon.href = '/' + branding.faviconPath;
      favicon.type = branding.faviconPath.endsWith('.png') ? 'image/png' : 'image/x-icon';
    }

    const doc = this.document.documentElement;

    // Derive semi-transparent overlays from the font color so the sidebar
    // looks correct on both dark and light backgrounds.
    const hex = branding.sideMenuFontColor.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const ov = `${r},${g},${b}`;
    host.style.setProperty('--side-menu-font-muted', `rgba(${ov},0.65)`);
    host.style.setProperty('--side-menu-hover-bg', `rgba(${ov},0.08)`);
    host.style.setProperty('--side-menu-active-bg', `rgba(${ov},0.14)`);
    host.style.setProperty('--side-menu-border', `rgba(${ov},0.12)`);

    doc.style.setProperty('--primary-color', branding.primaryColor);
    doc.style.setProperty('--primary-dark', branding.primaryDark);
  }

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
    if (url.includes('/students')) return 'Student Management';
    if (url.includes('/payments')) return 'Payment Management';
    if (url.includes('/charges')) return 'Charge Management';
    if (url.includes('/assessments')) return 'Monthly Assessments';

    return branding.schoolName;
  }
}
