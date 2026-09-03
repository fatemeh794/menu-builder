import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { Category, MenuItem, MenuItemOptionGroup } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TomanPricePipe } from '../../../shared/pipes/toman-price.pipe';
import { DashboardApiService } from '../dashboard-api.service';

interface NewItemDraft {
  name: string;
  categoryId: string;
  price: number | null;
}

@Component({
  selector: 'app-dashboard-menu',
  standalone: true,
  imports: [FormsModule, MatIconModule, TranslateModule, EmptyStateComponent, TomanPricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
})
export class DashboardMenuComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(DashboardApiService);
  private readonly restaurantSlug = this.route.snapshot.paramMap.get('restaurantSlug')!;

  readonly items = signal<MenuItem[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly expandedItemId = signal<string | null>(null);
  readonly optionGroups = signal<MenuItemOptionGroup[]>([]);

  readonly draft = signal<NewItemDraft>({ name: '', categoryId: '', price: null });

  constructor() {
    this.api.getCategories(this.restaurantSlug).subscribe((response) => {
      this.categories.set(response.results);
      if (response.results.length > 0) {
        this.draft.update((d) => ({ ...d, categoryId: response.results[0].id }));
      }
    });
    this.api.getItems(this.restaurantSlug).subscribe((response) => {
      this.items.set(response.results);
      this.loading.set(false);
    });
  }

  categoryName(categoryId: string): string {
    return this.categories().find((c) => c.id === categoryId)?.name ?? '';
  }

  updateDraftName(name: string): void {
    this.draft.set({ ...this.draft(), name });
  }

  updateDraftCategory(categoryId: string): void {
    this.draft.set({ ...this.draft(), categoryId });
  }

  updateDraftPrice(price: number | null): void {
    this.draft.set({ ...this.draft(), price });
  }

  addItem(): void {
    const { name, categoryId, price } = this.draft();
    if (!name.trim() || !categoryId || price === null || price < 0) return;

    this.api
      .createItem(this.restaurantSlug, { name, category: categoryId, base_price: price })
      .subscribe((item) => {
        this.items.set([...this.items(), item]);
        this.draft.set({ name: '', categoryId, price: null });
      });
  }

  updatePrice(item: MenuItem, price: string): void {
    const value = Number(price);
    if (Number.isNaN(value) || value < 0) return;
    this.api
      .updateItem(this.restaurantSlug, item.id, { base_price: value })
      .subscribe((updated) => {
        this.patchItem(updated);
      });
  }

  toggleAvailable(item: MenuItem): void {
    this.api
      .updateItem(this.restaurantSlug, item.id, { is_available: !item.is_available })
      .subscribe((updated) => this.patchItem(updated));
  }

  toggleActive(item: MenuItem): void {
    this.api
      .updateItem(this.restaurantSlug, item.id, { is_active: !item.is_active })
      .subscribe((updated) => this.patchItem(updated));
  }

  removeItem(item: MenuItem): void {
    this.api.deleteItem(this.restaurantSlug, item.id).subscribe(() => {
      this.items.set(this.items().filter((i) => i.id !== item.id));
    });
  }

  private patchItem(updated: MenuItem): void {
    this.items.set(this.items().map((i) => (i.id === updated.id ? updated : i)));
  }

  toggleExpand(item: MenuItem): void {
    if (this.expandedItemId() === item.id) {
      this.expandedItemId.set(null);
      return;
    }
    this.expandedItemId.set(item.id);
    this.api.getOptionGroups(this.restaurantSlug, item.id).subscribe((response) => {
      this.optionGroups.set(response.results);
    });
  }

  addOptionGroup(item: MenuItem, name: string): void {
    if (!name.trim()) return;
    this.api
      .createOptionGroup(this.restaurantSlug, item.id, {
        name,
        selection_type: 'SINGLE',
        is_required: false,
        options: [],
      })
      .subscribe((group) => {
        this.optionGroups.set([...this.optionGroups(), group]);
      });
  }

  removeOptionGroup(item: MenuItem, group: MenuItemOptionGroup): void {
    this.api.deleteOptionGroup(this.restaurantSlug, item.id, group.id).subscribe(() => {
      this.optionGroups.set(this.optionGroups().filter((g) => g.id !== group.id));
    });
  }

  toggleGroupRequired(item: MenuItem, group: MenuItemOptionGroup): void {
    this.api
      .updateOptionGroup(this.restaurantSlug, item.id, group.id, {
        is_required: !group.is_required,
      })
      .subscribe((updated) => this.patchGroup(updated));
  }

  toggleGroupType(item: MenuItem, group: MenuItemOptionGroup): void {
    const selection_type = group.selection_type === 'SINGLE' ? 'MULTIPLE' : 'SINGLE';
    this.api
      .updateOptionGroup(this.restaurantSlug, item.id, group.id, { selection_type })
      .subscribe((updated) => this.patchGroup(updated));
  }

  addOption(item: MenuItem, group: MenuItemOptionGroup, name: string, extraPrice: string): void {
    if (!name.trim()) return;
    const price = Number(extraPrice) || 0;
    const options = [
      ...group.options.map((o) => ({ ...o })),
      { name, extra_price: price, is_default: false, is_available: true },
    ];
    this.api
      .updateOptionGroup(this.restaurantSlug, item.id, group.id, { options })
      .subscribe((updated) => this.patchGroup(updated));
  }

  removeOption(item: MenuItem, group: MenuItemOptionGroup, optionId: string): void {
    const options = group.options.filter((o) => o.id !== optionId);
    this.api
      .updateOptionGroup(this.restaurantSlug, item.id, group.id, { options })
      .subscribe((updated) => this.patchGroup(updated));
  }

  private patchGroup(updated: MenuItemOptionGroup): void {
    this.optionGroups.set(this.optionGroups().map((g) => (g.id === updated.id ? updated : g)));
  }
}
