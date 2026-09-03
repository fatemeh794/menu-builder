import { Injectable, signal } from '@angular/core';

import { Restaurant } from '../models';

const DEFAULT_VARS: Record<string, string> = {
  '--brand-primary': '#E63946',
  '--brand-secondary': '#1D3557',
  '--brand-background': '#FFFFFF',
  '--brand-radius': '16px',
};

/** Applies a restaurant's theme as CSS custom properties on the document
 * root. This has to be the root (not a scoped wrapper element) because
 * MatBottomSheet/MatDialog content renders in a CDK overlay appended
 * directly to <body> - a sibling of <app-root>, not a descendant of the
 * customer-menu subtree - so only variables set above both branches of
 * the DOM actually reach it. The dashboard never reads --brand-* (it
 * uses its own fixed Material theme), so this can't leak into it. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly restaurant = signal<Restaurant | null>(null);

  apply(restaurant: Restaurant): void {
    this.restaurant.set(restaurant);
    const root = document.documentElement.style;
    root.setProperty('--brand-primary', restaurant.theme_primary_color);
    root.setProperty('--brand-secondary', restaurant.theme_secondary_color);
    root.setProperty('--brand-background', restaurant.theme_background_color);
    root.setProperty('--brand-radius', `${restaurant.theme_border_radius}px`);
  }

  clear(): void {
    this.restaurant.set(null);
    const root = document.documentElement.style;
    for (const [key, value] of Object.entries(DEFAULT_VARS)) {
      root.setProperty(key, value);
    }
  }
}
