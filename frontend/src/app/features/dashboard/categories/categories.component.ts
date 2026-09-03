import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { Category } from '../../../core/models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { DashboardApiService } from '../dashboard-api.service';

@Component({
  selector: 'app-dashboard-categories',
  standalone: true,
  imports: [FormsModule, MatIconModule, TranslateModule, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss',
})
export class DashboardCategoriesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(DashboardApiService);
  private readonly restaurantSlug = this.route.snapshot.paramMap.get('restaurantSlug')!;

  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly newCategoryName = signal('');

  constructor() {
    this.load();
  }

  private load(): void {
    this.api.getCategories(this.restaurantSlug).subscribe((response) => {
      this.categories.set(response.results);
      this.loading.set(false);
    });
  }

  add(): void {
    const name = this.newCategoryName().trim();
    if (!name) return;
    this.api
      .createCategory(this.restaurantSlug, { name, order: this.categories().length })
      .subscribe((category) => {
        this.categories.set([...this.categories(), category]);
        this.newCategoryName.set('');
      });
  }

  rename(category: Category, name: string): void {
    if (!name.trim() || name === category.name) return;
    this.api.updateCategory(this.restaurantSlug, category.id, { name }).subscribe((updated) => {
      this.categories.set(this.categories().map((c) => (c.id === updated.id ? updated : c)));
    });
  }

  toggleActive(category: Category): void {
    this.api
      .updateCategory(this.restaurantSlug, category.id, { is_active: !category.is_active })
      .subscribe((updated) => {
        this.categories.set(this.categories().map((c) => (c.id === updated.id ? updated : c)));
      });
  }

  remove(category: Category): void {
    this.api.deleteCategory(this.restaurantSlug, category.id).subscribe(() => {
      this.categories.set(this.categories().filter((c) => c.id !== category.id));
    });
  }
}
