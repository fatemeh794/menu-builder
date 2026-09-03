import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div style="padding:2rem">Order tracking placeholder</div>`,
})
export class OrderTrackingComponent {}
