import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { MyMembership } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-restaurant-select',
  standalone: true,
  imports: [MatCardModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './restaurant-select.component.html',
  styleUrl: './restaurant-select.component.scss',
})
export class RestaurantSelectComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(true);

  constructor() {
    if (this.authService.memberships().length > 0) {
      this.afterLoaded();
      return;
    }
    this.authService.loadMyMemberships().subscribe(() => this.afterLoaded());
  }

  private afterLoaded(): void {
    this.loading.set(false);
    if (this.authService.memberships().length === 1) {
      this.select(this.authService.memberships()[0]);
    }
  }

  select(membership: MyMembership): void {
    this.router.navigate(['/dashboard', membership.restaurant.slug, 'orders']);
  }
}
