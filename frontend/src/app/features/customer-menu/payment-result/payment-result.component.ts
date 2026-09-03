import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { MenuApiService } from '../menu-api.service';

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment-result.component.html',
  styleUrl: './payment-result.component.scss',
})
export class PaymentResultComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly menuApi = inject(MenuApiService);

  readonly token = this.route.snapshot.paramMap.get('token')!;
  readonly success = this.route.snapshot.queryParamMap.get('status') === 'success';
  readonly retrying = signal(false);

  retryPayment(): void {
    this.retrying.set(true);
    this.menuApi.createPayment(this.token).subscribe({
      next: (payment) => {
        window.location.href = payment.redirect_url;
      },
      error: () => this.retrying.set(false),
    });
  }
}
