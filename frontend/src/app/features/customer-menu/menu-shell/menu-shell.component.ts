import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { finalize, forkJoin } from 'rxjs';

import { Category, MenuItem, Restaurant } from '../../../core/models';
import { ThemeService } from '../../../core/services/theme.service';
import { TranslationService } from '../../../core/services/translation.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { MenuGridSkeletonComponent } from '../../../shared/components/skeleton/menu-grid-skeleton.component';
import { CartSheetComponent } from '../cart-sheet/cart-sheet.component';
import { CartService } from '../cart.service';
import { ItemCardComponent } from '../item-card/item-card.component';
import { ItemDetailSheetComponent } from '../item-detail-sheet/item-detail-sheet.component';
import { MenuApiService } from '../menu-api.service';
import { StickyCartBarComponent } from '../sticky-cart-bar/sticky-cart-bar.component';

const ALL_CATEGORY = 'ALL';

@Component({
  selector: 'app-menu-shell',
  standalone: true,
  imports: [
    MatIconModule,
    TranslateModule,
    ItemCardComponent,
    StickyCartBarComponent,
    MenuGridSkeletonComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-shell.component.html',
  styleUrl: './menu-shell.component.scss',
})
export class MenuShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly menuApi = inject(MenuApiService);
  private readonly themeService = inject(ThemeService);
  private readonly cartService = inject(CartService);
  private readonly bottomSheet = inject(MatBottomSheet);
  readonly translationService = inject(TranslationService);

  readonly restaurantSlug = this.route.snapshot.paramMap.get('slug')!;
  private readonly tableToken = this.route.snapshot.paramMap.get('token');

  readonly restaurant = signal<Restaurant | null>(null);
  readonly categories = signal<Category[]>([]);
  readonly items = signal<MenuItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly selectedCategoryId = signal<string>(ALL_CATEGORY);
  readonly searchQuery = signal('');
  readonly ALL_CATEGORY = ALL_CATEGORY;

  readonly filteredItems = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const categoryId = this.selectedCategoryId();

    return this.items().filter((item) => {
      const matchesCategory = categoryId === ALL_CATEGORY || item.category === categoryId;
      const matchesSearch = !query || item.name.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  });

  constructor() {
    this.loadMenu();
  }

  private loadMenu(): void {
    this.loading.set(true);
    this.error.set(false);

    const restaurant$ = this.menuApi.getRestaurant(this.restaurantSlug);
    const validation$ = this.tableToken
      ? this.menuApi.validateTable(this.restaurantSlug, this.tableToken)
      : null;

    forkJoin({
      restaurant: restaurant$,
      table: validation$ ?? [null],
    }).subscribe({
      next: ({ restaurant }) => {
        this.restaurant.set(restaurant);
        this.themeService.apply(restaurant);
        this.cartService.init(this.restaurantSlug, this.tableToken);
        this.loadCategoriesAndItems();
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  private loadCategoriesAndItems(): void {
    forkJoin({
      categories: this.menuApi.getCategories(this.restaurantSlug),
      items: this.menuApi.getItems(this.restaurantSlug),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ categories, items }) => {
          this.categories.set(categories);
          this.items.set(items);
        },
        error: () => this.error.set(true),
      });
  }

  selectCategory(categoryId: string): void {
    this.selectedCategoryId.set(categoryId);
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  openItemDetail(item: MenuItem): void {
    this.bottomSheet.open(ItemDetailSheetComponent, {
      data: { menuItem: item },
      panelClass: 'brand-sheet-panel',
    });
  }

  openCart(): void {
    this.bottomSheet.open(CartSheetComponent, {
      data: { restaurantSlug: this.restaurantSlug },
      panelClass: 'brand-sheet-panel',
    });
  }

  toggleLanguage(): void {
    this.translationService.toggle();
  }

  retry(): void {
    this.loadMenu();
  }
}
