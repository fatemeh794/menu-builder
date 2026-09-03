import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    TranslateModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-shell.component.html',
  styleUrl: './dashboard-shell.component.scss',
})
export class DashboardShellComponent {
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);
  readonly translationService = inject(TranslationService);

  private readonly currentUrl = signal(this.router.url);

  readonly restaurantSlug = computed(() => {
    const match = this.currentUrl().match(/\/dashboard\/([^/]+)\//);
    return match && match[1] !== 'restaurants' ? match[1] : null;
  });

  readonly navItems = [
    { path: 'orders', icon: 'receipt_long', labelKey: 'dashboard.nav.orders' },
    { path: 'menu', icon: 'restaurant_menu', labelKey: 'dashboard.nav.menu' },
    { path: 'categories', icon: 'category', labelKey: 'dashboard.nav.categories' },
    { path: 'tables', icon: 'table_bar', labelKey: 'dashboard.nav.tables' },
    { path: 'staff', icon: 'group', labelKey: 'dashboard.nav.staff' },
    { path: 'settings', icon: 'settings', labelKey: 'dashboard.nav.settings' },
  ];

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.currentUrl.set(this.router.url);
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/staff/login']);
  }

  toggleLanguage(): void {
    this.translationService.toggle();
  }
}
