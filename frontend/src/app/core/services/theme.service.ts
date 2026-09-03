import { Injectable, signal } from '@angular/core';

import { Restaurant } from '../models';

/** Holds the active restaurant's theme. The customer-menu shell binds
 * these as CSS custom properties on its root element (see
 * MenuShellComponent), so the whole subtree re-themes via normal CSS
 * inheritance - no global document mutation, no leaking into the
 * dashboard's own Material theme. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly restaurant = signal<Restaurant | null>(null);

  apply(restaurant: Restaurant): void {
    this.restaurant.set(restaurant);
  }

  clear(): void {
    this.restaurant.set(null);
  }
}
