import { TestBed } from '@angular/core/testing';

import { MenuItem, MenuItemOption } from '../../core/models';
import { CartService } from './cart.service';

function makeMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'item-1',
    category: 'cat-1',
    name: 'Classic Burger',
    description: '',
    base_price: 120000,
    image: null,
    is_available: true,
    option_groups: [],
    ...overrides,
  };
}

function makeOption(overrides: Partial<MenuItemOption> = {}): MenuItemOption {
  return {
    id: 'opt-1',
    name: 'Whole wheat',
    extra_price: 10000,
    is_default: false,
    is_available: true,
    ...overrides,
  };
}

describe('CartService', () => {
  let service: CartService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CartService);
    service.init('golden-fork', 'table-token-1');
  });

  it('starts empty for a restaurant/table with no stored cart', () => {
    expect(service.isEmpty()).toBe(true);
    expect(service.totalItems()).toBe(0);
  });

  it('adds an item and computes unit/line totals from base price + options', () => {
    const item = makeMenuItem();
    const option = makeOption();

    service.addItem(item, [option], 2);

    expect(service.lines().length).toBe(1);
    expect(service.lines()[0].unitPrice).toBe(130000);
    expect(service.lines()[0].lineTotal).toBe(260000);
    expect(service.totalItems()).toBe(2);
    expect(service.totalAmount()).toBe(260000);
  });

  it('merges a second add with the exact same options into the existing line', () => {
    const item = makeMenuItem();
    const option = makeOption();

    service.addItem(item, [option], 1);
    service.addItem(item, [option], 1);

    expect(service.lines().length).toBe(1);
    expect(service.lines()[0].quantity).toBe(2);
  });

  it('keeps a differently-customized add as a separate line', () => {
    const item = makeMenuItem();
    const optionA = makeOption({ id: 'opt-a' });
    const optionB = makeOption({ id: 'opt-b' });

    service.addItem(item, [optionA], 1);
    service.addItem(item, [optionB], 1);

    expect(service.lines().length).toBe(2);
  });

  it('persists every mutation to localStorage under a scoped key', () => {
    const item = makeMenuItem();
    service.addItem(item, [], 1);

    const raw = localStorage.getItem('rm_cart_golden-fork_table-token-1');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.lines.length).toBe(1);
    expect(parsed.restaurantSlug).toBe('golden-fork');
  });

  it('reloads a persisted cart on init for the same restaurant/table', () => {
    service.addItem(makeMenuItem(), [], 3);

    // Simulate a fresh page load re-injecting the (still-singleton) service
    // context by calling init again, as MenuShellComponent would.
    service.init('golden-fork', 'table-token-1');

    expect(service.totalItems()).toBe(3);
  });

  it('does not leak a cart between two different tables', () => {
    service.addItem(makeMenuItem(), [], 1);

    service.init('golden-fork', 'table-token-2');

    expect(service.isEmpty()).toBe(true);
  });

  it('updateQuantity removes the line when dropped to zero', () => {
    service.addItem(makeMenuItem(), [], 1);
    const lineId = service.lines()[0].id;

    service.updateQuantity(lineId, 0);

    expect(service.isEmpty()).toBe(true);
  });

  it('removeLine takes the item out of the cart and persists it', () => {
    service.addItem(makeMenuItem(), [], 1);
    const lineId = service.lines()[0].id;

    service.removeLine(lineId);

    expect(service.isEmpty()).toBe(true);
    const raw = JSON.parse(localStorage.getItem('rm_cart_golden-fork_table-token-1')!);
    expect(raw.lines.length).toBe(0);
  });
});
