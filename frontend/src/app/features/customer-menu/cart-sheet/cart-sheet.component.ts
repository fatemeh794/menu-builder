import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { TomanPricePipe } from '../../../shared/pipes/toman-price.pipe';
import { CartLine } from '../cart.model';
import { CartService } from '../cart.service';

export interface CartSheetData {
  restaurantSlug: string;
}

@Component({
  selector: 'app-cart-sheet',
  standalone: true,
  imports: [MatIconModule, TranslateModule, TomanPricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart-sheet.component.html',
  styleUrl: './cart-sheet.component.scss',
})
export class CartSheetComponent {
  readonly cartService = inject(CartService);
  private readonly data = inject<CartSheetData>(MAT_BOTTOM_SHEET_DATA);
  private readonly sheetRef = inject(MatBottomSheetRef<CartSheetComponent>);
  private readonly router = inject(Router);

  increment(lineId: string, quantity: number): void {
    this.cartService.updateQuantity(lineId, quantity + 1);
  }

  decrement(lineId: string, quantity: number): void {
    this.cartService.updateQuantity(lineId, quantity - 1);
  }

  remove(lineId: string): void {
    this.cartService.removeLine(lineId);
  }

  optionsLabel(line: CartLine): string {
    return line.selectedOptions.map((o) => o.name).join('، ');
  }

  close(): void {
    this.sheetRef.dismiss();
  }

  checkout(): void {
    this.sheetRef.dismiss();
    this.router.navigate(['/menu', this.data.restaurantSlug, 'checkout']);
  }
}
