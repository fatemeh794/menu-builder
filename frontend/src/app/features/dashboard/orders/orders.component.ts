import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { interval, startWith, switchMap } from 'rxjs';

import { Order, OrderItem, OrderListItem, OrderStatus } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TomanPricePipe } from '../../../shared/pipes/toman-price.pipe';
import { DashboardApiService } from '../dashboard-api.service';

const POLL_INTERVAL_MS = 15000;
const STATUS_FLOW: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
];

@Component({
  selector: 'app-dashboard-orders',
  standalone: true,
  imports: [TranslateModule, EmptyStateComponent, TomanPricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss',
})
export class DashboardOrdersComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(DashboardApiService);

  private readonly restaurantSlug = this.route.snapshot.paramMap.get('restaurantSlug')!;

  readonly orders = signal<OrderListItem[]>([]);
  readonly expandedOrder = signal<Order | null>(null);
  readonly loading = signal(true);
  readonly statusOptions = STATUS_FLOW;

  constructor() {
    interval(POLL_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.api.getOrders(this.restaurantSlug)),
      )
      .subscribe((response) => {
        this.orders.set(response.results);
        this.loading.set(false);
      });
  }

  toggleExpand(orderId: string): void {
    if (this.expandedOrder()?.id === orderId) {
      this.expandedOrder.set(null);
      return;
    }
    this.api.getOrder(this.restaurantSlug, orderId).subscribe((order) => {
      this.expandedOrder.set(order);
    });
  }

  changeStatus(orderId: string, status: OrderStatus): void {
    this.api.updateOrderStatus(this.restaurantSlug, orderId, status).subscribe((updated) => {
      this.orders.set(
        this.orders().map((o) => (o.id === orderId ? { ...o, status: updated.status } : o)),
      );
      if (this.expandedOrder()?.id === orderId) {
        this.expandedOrder.set(updated);
      }
    });
  }

  isTerminal(status: OrderStatus): boolean {
    return status === 'COMPLETED' || status === 'CANCELLED';
  }

  optionsLabel(item: OrderItem): string {
    return item.options.map((o) => o.option_name).join('، ');
  }
}
