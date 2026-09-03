import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-dashboard-orders',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div style="padding:2rem">Dashboard orders placeholder</div>`,
})
export class DashboardOrdersComponent {}
