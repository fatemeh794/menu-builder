import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { MenuItem } from '../../../core/models';
import { TomanPricePipe } from '../../../shared/pipes/toman-price.pipe';

@Component({
  selector: 'app-item-card',
  standalone: true,
  imports: [TranslateModule, TomanPricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-card.component.html',
  styleUrl: './item-card.component.scss',
})
export class ItemCardComponent {
  readonly item = input.required<MenuItem>();
  readonly index = input<number>(0);
  readonly select = output<MenuItem>();
}
