import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-dashboard-staff',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div style="padding:2rem">Dashboard staff placeholder</div>`,
})
export class DashboardStaffComponent {}
