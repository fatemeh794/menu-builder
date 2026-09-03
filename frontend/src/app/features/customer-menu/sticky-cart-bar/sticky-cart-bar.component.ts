import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { TomanPricePipe } from '../../../shared/pipes/toman-price.pipe';
import { CartService } from '../cart.service';

@Component({
  selector: 'app-sticky-cart-bar',
  standalone: true,
  imports: [TranslateModule, TomanPricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sticky-cart-bar.component.html',
  styleUrl: './sticky-cart-bar.component.scss',
})
export class StickyCartBarComponent {
  readonly cartService = inject(CartService);
  readonly viewCart = output<void>();
}
