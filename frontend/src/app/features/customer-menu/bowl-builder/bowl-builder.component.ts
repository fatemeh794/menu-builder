import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { MenuItem, MenuItemOption, MenuItemOptionGroup } from '../../../core/models';
import { TomanPricePipe } from '../../../shared/pipes/toman-price.pipe';
import { CartService } from '../cart.service';
import { ingredientEmoji, ingredientImageUrl } from '../ingredient-icon.util';
import { MenuApiService } from '../menu-api.service';

interface PlacedIngredient {
  groupId: string;
  option: MenuItemOption;
  angle: number;
}

@Component({
  selector: 'app-bowl-builder',
  standalone: true,
  imports: [MatIconModule, TranslateModule, TomanPricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bowl-builder.component.html',
  styleUrl: './bowl-builder.component.scss',
})
export class BowlBuilderComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly menuApi = inject(MenuApiService);
  private readonly cartService = inject(CartService);

  private readonly restaurantSlug = this.route.snapshot.paramMap.get('slug')!;
  private readonly itemId = this.route.snapshot.paramMap.get('itemId')!;

  readonly plateRef = viewChild<ElementRef<HTMLElement>>('plate');

  readonly loading = signal(true);
  readonly menuItem = signal<MenuItem | null>(null);
  readonly activeGroupId = signal<string | null>(null);
  readonly quantity = signal(1);
  readonly draggedOverPlate = signal(false);
  readonly justLanded = signal(false);

  private readonly selections = signal<Record<string, string[]>>({});

  readonly activeGroup = computed<MenuItemOptionGroup | null>(() => {
    const item = this.menuItem();
    const groupId = this.activeGroupId();
    if (!item || !groupId) return null;
    return item.option_groups.find((g) => g.id === groupId) ?? null;
  });

  readonly placedIngredients = computed<PlacedIngredient[]>(() => {
    const item = this.menuItem();
    if (!item) return [];
    const flat: { groupId: string; option: MenuItemOption }[] = [];
    for (const group of item.option_groups) {
      const ids = this.selections()[group.id] ?? [];
      for (const option of group.options) {
        if (ids.includes(option.id)) flat.push({ groupId: group.id, option });
      }
    }
    return flat.map((entry, index) => ({
      ...entry,
      angle: flat.length ? (360 / flat.length) * index : 0,
    }));
  });

  readonly totalPrice = computed(() => {
    const item = this.menuItem();
    if (!item) return 0;
    const extra = this.placedIngredients().reduce((sum, p) => sum + p.option.extra_price, 0);
    return (item.base_price + extra) * this.quantity();
  });

  readonly canAddToCart = computed(() => {
    const item = this.menuItem();
    if (!item) return false;
    for (const group of item.option_groups) {
      const selected = this.selections()[group.id] ?? [];
      if (group.is_required && selected.length === 0) return false;
      if (group.selection_type === 'MULTIPLE') {
        if (selected.length < group.min_select) return false;
        if (group.max_select !== null && selected.length > group.max_select) return false;
      }
    }
    return true;
  });

  constructor() {
    this.menuApi.getItems(this.restaurantSlug).subscribe((items) => {
      const item = items.find((i) => i.id === this.itemId) ?? null;
      this.menuItem.set(item);
      this.loading.set(false);
      if (item) {
        const initial: Record<string, string[]> = {};
        for (const group of item.option_groups) {
          const def = group.options.find((o) => o.is_default && o.is_available);
          initial[group.id] = def ? [def.id] : [];
        }
        this.selections.set(initial);
        this.activeGroupId.set(item.option_groups[0]?.id ?? null);
      }
    });
  }

  iconUrl(name: string): string | null {
    return ingredientImageUrl(name);
  }

  iconEmoji(name: string): string {
    return ingredientEmoji(name);
  }

  selectGroup(groupId: string): void {
    this.activeGroupId.set(groupId);
  }

  isSelected(groupId: string, optionId: string): boolean {
    return (this.selections()[groupId] ?? []).includes(optionId);
  }

  isFull(group: MenuItemOptionGroup): boolean {
    if (group.selection_type !== 'MULTIPLE' || group.max_select === null) return false;
    return (this.selections()[group.id] ?? []).length >= group.max_select;
  }

  /** Tap-to-add: works everywhere, always the primary interaction. */
  addIngredient(group: MenuItemOptionGroup, option: MenuItemOption, sourceEl: HTMLElement): void {
    if (!option.is_available) return;
    const alreadySelected = this.isSelected(group.id, option.id);

    if (group.selection_type === 'SINGLE') {
      this.selections.set({ ...this.selections(), [group.id]: alreadySelected ? [] : [option.id] });
    } else {
      const current = this.selections()[group.id] ?? [];
      if (alreadySelected) {
        this.selections.set({
          ...this.selections(),
          [group.id]: current.filter((id) => id !== option.id),
        });
        return;
      }
      if (this.isFull(group)) return;
      this.selections.set({ ...this.selections(), [group.id]: [...current, option.id] });
    }

    if (!alreadySelected) this.flyToPlate(sourceEl);
  }

  removeIngredient(placed: PlacedIngredient): void {
    const current = this.selections()[placed.groupId] ?? [];
    this.selections.set({
      ...this.selections(),
      [placed.groupId]: current.filter((id) => id !== placed.option.id),
    });
  }

  /** Real drag-and-drop for pointer/mouse devices - native HTML5 DnD, the
   * browser handles the drag preview. Touch devices fall back to tap
   * (above), which is universally reliable where DnD is not. */
  onDragStart(event: DragEvent, group: MenuItemOptionGroup, option: MenuItemOption): void {
    if (!option.is_available || (group.selection_type === 'MULTIPLE' && this.isFull(group))) {
      event.preventDefault();
      return;
    }
    event.dataTransfer?.setData('text/plain', JSON.stringify({ groupId: group.id, optionId: option.id }));
    event.dataTransfer!.effectAllowed = 'copy';
  }

  onPlateDragOver(event: DragEvent): void {
    event.preventDefault();
    this.draggedOverPlate.set(true);
  }

  onPlateDragLeave(): void {
    this.draggedOverPlate.set(false);
  }

  onPlateDrop(event: DragEvent): void {
    event.preventDefault();
    this.draggedOverPlate.set(false);
    const raw = event.dataTransfer?.getData('text/plain');
    if (!raw) return;
    const { groupId, optionId } = JSON.parse(raw) as { groupId: string; optionId: string };
    const item = this.menuItem();
    const group = item?.option_groups.find((g) => g.id === groupId);
    const option = group?.options.find((o) => o.id === optionId);
    if (!group || !option) return;

    const alreadySelected = this.isSelected(group.id, option.id);
    if (group.selection_type === 'SINGLE') {
      this.selections.set({ ...this.selections(), [group.id]: [option.id] });
    } else if (!alreadySelected && !this.isFull(group)) {
      const current = this.selections()[group.id] ?? [];
      this.selections.set({ ...this.selections(), [group.id]: [...current, option.id] });
    }
    this.pulseLanding();
  }

  increment(): void {
    this.quantity.set(this.quantity() + 1);
  }

  decrement(): void {
    if (this.quantity() > 1) this.quantity.set(this.quantity() - 1);
  }

  addToCart(): void {
    const item = this.menuItem();
    if (!item || !this.canAddToCart()) return;
    const options = this.placedIngredients().map((p) => p.option);
    this.cartService.addItem(item, options, this.quantity());
    this.goBack();
  }

  goBack(): void {
    const token = this.cartService.tableToken;
    if (token) {
      this.router.navigate(['/menu', this.restaurantSlug, 'table', token]);
    } else {
      this.router.navigate(['/menu', this.restaurantSlug]);
    }
  }

  private flyToPlate(sourceEl: HTMLElement): void {
    const plate = this.plateRef()?.nativeElement;
    if (!plate) return;

    const from = sourceEl.getBoundingClientRect();
    const to = plate.getBoundingClientRect();

    const clone = document.createElement('div');
    clone.className = 'flying-ingredient';
    clone.style.left = `${from.left + from.width / 2 - 18}px`;
    clone.style.top = `${from.top + from.height / 2 - 18}px`;
    document.body.appendChild(clone);

    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);

    const animation = clone.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 40}px) scale(1.15)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0.2 },
      ],
      { duration: 480, easing: 'cubic-bezier(0.3, 0.6, 0.4, 1)' },
    );
    animation.onfinish = () => {
      clone.remove();
      this.pulseLanding();
    };
  }

  private pulseLanding(): void {
    this.justLanded.set(true);
    setTimeout(() => this.justLanded.set(false), 350);
  }
}
