import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { RestaurantTable } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { DashboardApiService } from '../dashboard-api.service';

@Component({
  selector: 'app-dashboard-tables',
  standalone: true,
  imports: [FormsModule, MatIconModule, TranslateModule, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tables.component.html',
  styleUrl: './tables.component.scss',
})
export class DashboardTablesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(DashboardApiService);
  private readonly restaurantSlug = this.route.snapshot.paramMap.get('restaurantSlug')!;

  readonly tables = signal<RestaurantTable[]>([]);
  readonly loading = signal(true);
  readonly newTableLabel = signal('');
  readonly qrPreviewUrl = signal<string | null>(null);
  readonly qrPreviewLabel = signal('');

  constructor() {
    this.load();
  }

  private load(): void {
    this.api.getTables(this.restaurantSlug).subscribe((response) => {
      this.tables.set(response.results);
      this.loading.set(false);
    });
  }

  add(): void {
    const label = this.newTableLabel().trim();
    if (!label) return;
    this.api.createTable(this.restaurantSlug, label).subscribe((table) => {
      this.tables.set([...this.tables(), table]);
      this.newTableLabel.set('');
    });
  }

  toggleActive(table: RestaurantTable): void {
    this.api
      .updateTable(this.restaurantSlug, table.id, { is_active: !table.is_active })
      .subscribe((updated) => {
        this.tables.set(this.tables().map((t) => (t.id === updated.id ? updated : t)));
      });
  }

  remove(table: RestaurantTable): void {
    this.api.deleteTable(this.restaurantSlug, table.id).subscribe(() => {
      this.tables.set(this.tables().filter((t) => t.id !== table.id));
    });
  }

  showQr(table: RestaurantTable): void {
    this.api.getTableQrCodeBlob(this.restaurantSlug, table.id).subscribe((blob) => {
      this.qrPreviewUrl.set(URL.createObjectURL(blob));
      this.qrPreviewLabel.set(table.label);
    });
  }

  closeQr(): void {
    const url = this.qrPreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this.qrPreviewUrl.set(null);
  }

  downloadQr(): void {
    const url = this.qrPreviewUrl();
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `table-${this.qrPreviewLabel()}-qr.png`;
    link.click();
  }
}
