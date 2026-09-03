import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-payment-result',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div style="padding:2rem">Payment result placeholder</div>`,
})
export class PaymentResultComponent {}
