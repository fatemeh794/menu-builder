import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription, interval, startWith, switchMap } from 'rxjs';

import { Order } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { TomanPricePipe } from '../../../shared/pipes/toman-price.pipe';
import { MenuApiService } from '../menu-api.service';

const POLL_INTERVAL_MS = 10000;
const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'];

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [TranslateModule, EmptyStateComponent, ErrorStateComponent, TomanPricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-tracking.component.html',
  styleUrl: './order-tracking.component.scss',
})
export class OrderTrackingComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly menuApi = inject(MenuApiService);
  private subscription: Subscription | null = null;

  readonly order = signal<Order | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly statusSteps = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];

  constructor() {
    const token = this.route.snapshot.paramMap.get('token')!;
    this.subscription = interval(POLL_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.menuApi.trackOrder(token)),
      )
      .subscribe({
        next: (order) => {
          this.order.set(order);
          this.loading.set(false);
          if (!ACTIVE_STATUSES.includes(order.status)) {
            this.subscription?.unsubscribe();
          }
        },
        error: () => {
          this.loading.set(false);
          this.error.set(true);
          this.subscription?.unsubscribe();
        },
      });
  }

  currentStepIndex(): number {
    const status = this.order()?.status;
    if (!status) return -1;
    return this.statusSteps.indexOf(status);
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
