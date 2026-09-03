import { Injectable, computed, signal } from '@angular/core';

import { MenuItem, MenuItemOption } from '../../core/models';
import { CartLine, computeUnitPrice, optionsSignature } from './cart.model';

interface PersistedCart {
  restaurantSlug: string;
  tableToken: string | null;
  lines: CartLine[];
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private storageKey = '';
  private restaurantSlug = '';
  private tableToken: string | null = null;

  readonly lines = signal<CartLine[]>([]);

  readonly totalItems = computed(() => this.lines().reduce((sum, line) => sum + line.quantity, 0));
  readonly totalAmount = computed(() =>
    this.lines().reduce((sum, line) => sum + line.lineTotal, 0),
  );
  readonly isEmpty = computed(() => this.lines().length === 0);

  /** Just bumped (used to trigger the sticky-cart pulse animation) - flips
   * back to false on the next tick so the same class can retrigger. */
  readonly justAdded = signal(false);

  /** Scopes the cart to one restaurant (+ table, if scanned via QR) so a
   * customer browsing two different restaurants in the same browser never
   * mixes carts. Call once when the menu shell resolves its route. */
  init(restaurantSlug: string, tableToken: string | null): void {
    this.restaurantSlug = restaurantSlug;
    this.tableToken = tableToken;
    this.storageKey = `rm_cart_${restaurantSlug}_${tableToken ?? 'no-table'}`;

    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as PersistedCart;
        this.lines.set(parsed.lines ?? []);
        return;
      } catch {
        // fall through to empty cart
      }
    }
    this.lines.set([]);
  }

  addItem(menuItem: MenuItem, selectedOptions: MenuItemOption[], quantity: number): void {
    const signature = optionsSignature(selectedOptions.map((o) => o.id));
    const unitPrice = computeUnitPrice(menuItem, selectedOptions);

    const existing = this.lines().find(
      (line) =>
        line.menuItem.id === menuItem.id &&
        optionsSignature(line.selectedOptions.map((o) => o.id)) === signature,
    );

    if (existing) {
      this.setLines(
        this.lines().map((line) =>
          line.id === existing.id
            ? {
                ...line,
                quantity: line.quantity + quantity,
                lineTotal: line.unitPrice * (line.quantity + quantity),
              }
            : line,
        ),
      );
    } else {
      const line: CartLine = {
        id: crypto.randomUUID(),
        menuItem,
        selectedOptions,
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity,
      };
      this.setLines([...this.lines(), line]);
    }

    this.pulse();
  }

  updateQuantity(lineId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeLine(lineId);
      return;
    }
    this.setLines(
      this.lines().map((line) =>
        line.id === lineId ? { ...line, quantity, lineTotal: line.unitPrice * quantity } : line,
      ),
    );
  }

  removeLine(lineId: string): void {
    this.setLines(this.lines().filter((line) => line.id !== lineId));
  }

  clear(): void {
    this.setLines([]);
  }

  private setLines(lines: CartLine[]): void {
    this.lines.set(lines);
    this.persist();
  }

  private persist(): void {
    if (!this.storageKey) return;
    const payload: PersistedCart = {
      restaurantSlug: this.restaurantSlug,
      tableToken: this.tableToken,
      lines: this.lines(),
    };
    localStorage.setItem(this.storageKey, JSON.stringify(payload));
  }

  private pulse(): void {
    this.justAdded.set(true);
    setTimeout(() => this.justAdded.set(false), 400);
  }
}
