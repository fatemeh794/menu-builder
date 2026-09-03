import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-menu-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div style="padding:2rem">Menu shell placeholder</div>`,
})
export class MenuShellComponent {}
