import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { MenuItem, MenuItemOption, MenuItemOptionGroup } from '../../../core/models';
import { TomanPricePipe } from '../../../shared/pipes/toman-price.pipe';
import { CartService } from '../cart.service';

export interface ItemDetailSheetData {
  menuItem: MenuItem;
}

@Component({
  selector: 'app-item-detail-sheet',
  standalone: true,
  imports: [MatIconModule, TranslateModule, TomanPricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-detail-sheet.component.html',
  styleUrl: './item-detail-sheet.component.scss',
})
export class ItemDetailSheetComponent {
  private readonly data = inject<ItemDetailSheetData>(MAT_BOTTOM_SHEET_DATA);
  private readonly sheetRef = inject(MatBottomSheetRef<ItemDetailSheetComponent>);
  private readonly cartService = inject(CartService);

  readonly menuItem = this.data.menuItem;
  readonly quantity = signal(1);

  /** groupId -> selected option ids, kept as arrays so both SINGLE and
   * MULTIPLE groups share one shape. */
  private readonly selections = signal<Record<string, string[]>>(
    this.buildInitialSelections(this.menuItem),
  );

  readonly totalPrice = computed(() => {
    const extra = this.selectedOptions().reduce((sum, o) => sum + o.extra_price, 0);
    return (this.menuItem.base_price + extra) * this.quantity();
  });

  readonly canAddToCart = computed(() => {
    for (const group of this.menuItem.option_groups) {
      const selected = this.selections()[group.id] ?? [];
      if (group.is_required && selected.length === 0) return false;
      if (group.selection_type === 'MULTIPLE') {
        if (selected.length < group.min_select) return false;
        if (group.max_select !== null && selected.length > group.max_select) return false;
      }
    }
    return true;
  });

  private buildInitialSelections(menuItem: MenuItem): Record<string, string[]> {
    const initial: Record<string, string[]> = {};
    for (const group of menuItem.option_groups) {
      const defaultOption = group.options.find((o) => o.is_default && o.is_available);
      initial[group.id] = defaultOption ? [defaultOption.id] : [];
    }
    return initial;
  }

  isSelected(groupId: string, optionId: string): boolean {
    return (this.selections()[groupId] ?? []).includes(optionId);
  }

  selectSingle(group: MenuItemOptionGroup, option: MenuItemOption): void {
    if (!option.is_available) return;
    this.selections.set({ ...this.selections(), [group.id]: [option.id] });
  }

  toggleMultiple(group: MenuItemOptionGroup, option: MenuItemOption): void {
    if (!option.is_available) return;
    const current = this.selections()[group.id] ?? [];
    const isSelected = current.includes(option.id);

    if (isSelected) {
      this.selections.set({
        ...this.selections(),
        [group.id]: current.filter((id) => id !== option.id),
      });
      return;
    }

    if (group.max_select !== null && current.length >= group.max_select) {
      return;
    }
    this.selections.set({ ...this.selections(), [group.id]: [...current, option.id] });
  }

  increment(): void {
    this.quantity.set(this.quantity() + 1);
  }

  decrement(): void {
    if (this.quantity() > 1) {
      this.quantity.set(this.quantity() - 1);
    }
  }

  addToCart(): void {
    if (!this.canAddToCart()) return;
    this.cartService.addItem(this.menuItem, this.selectedOptions(), this.quantity());
    this.sheetRef.dismiss();
  }

  close(): void {
    this.sheetRef.dismiss();
  }

  private selectedOptions(): MenuItemOption[] {
    const selections = this.selections();
    const result: MenuItemOption[] = [];
    for (const group of this.menuItem.option_groups) {
      const ids = selections[group.id] ?? [];
      for (const option of group.options) {
        if (ids.includes(option.id)) result.push(option);
      }
    }
    return result;
  }
}
