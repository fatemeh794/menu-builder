import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { TomanPricePipe } from '../../../shared/pipes/toman-price.pipe';
import { CartService } from '../cart.service';
import { MenuApiService } from '../menu-api.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, TranslateModule, TomanPricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
})
export class CheckoutComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly menuApi = inject(MenuApiService);
  readonly cartService = inject(CartService);

  readonly restaurantSlug = this.route.snapshot.paramMap.get('slug')!;
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    customer_name: ['', Validators.required],
    customer_phone: ['', Validators.required],
    note: [''],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const tableToken = this.cartService.tableToken;
    if (!tableToken) {
      this.error.set('checkout.no_table');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const { customer_name, customer_phone, note } = this.form.getRawValue();
    const items = this.cartService.lines().map((line) => ({
      menu_item_id: line.menuItem.id,
      quantity: line.quantity,
      option_ids: line.selectedOptions.map((o) => o.id),
    }));

    this.menuApi
      .createOrder({
        restaurant_slug: this.restaurantSlug,
        table_token: tableToken,
        customer_name: customer_name!,
        customer_phone: customer_phone!,
        note: note ?? '',
        items,
      })
      .subscribe({
        next: (order) => {
          this.menuApi.createPayment(order.secure_order_token).subscribe({
            next: (payment) => {
              this.cartService.clear();
              window.location.href = payment.redirect_url;
            },
            error: () => {
              this.submitting.set(false);
              this.error.set('checkout.payment_start_failed');
              this.router.navigate(['/orders', order.secure_order_token]);
            },
          });
        },
        error: () => {
          this.submitting.set(false);
          this.error.set('checkout.order_failed');
        },
      });
  }
}
