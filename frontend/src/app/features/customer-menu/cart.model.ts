import { MenuItem, MenuItemOption } from '../../core/models';

export interface CartLine {
  id: string;
  menuItem: MenuItem;
  selectedOptions: MenuItemOption[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export function computeUnitPrice(menuItem: MenuItem, selectedOptions: MenuItemOption[]): number {
  return menuItem.base_price + selectedOptions.reduce((sum, o) => sum + o.extra_price, 0);
}

/** Two selections of the same dish are the "same line" (and should just
 * bump quantity) only if they picked the exact same set of options. */
export function optionsSignature(optionIds: string[]): string {
  return [...optionIds].sort().join(',');
}
