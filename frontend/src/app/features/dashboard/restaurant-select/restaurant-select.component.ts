import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-restaurant-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div style="padding:2rem">Restaurant select placeholder</div>`,
})
export class RestaurantSelectComponent {}
