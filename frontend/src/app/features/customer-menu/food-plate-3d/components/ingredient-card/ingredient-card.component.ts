import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { TomanPricePipe } from '../../../../../shared/pipes/toman-price.pipe';
import { Ingredient } from '../../models/ingredient.model';

@Component({
  selector: 'app-ingredient-card',
  standalone: true,
  imports: [TranslateModule, TomanPricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ingredient-card.component.html',
})
export class IngredientCardComponent {
  readonly ingredient = input.required<Ingredient>();
  readonly tapAdd = output<Ingredient>();
  readonly pointerDown = output<PointerEvent>();

  onDragStart(event: DragEvent): void {
    event.dataTransfer?.setData('text/plain', this.ingredient().id);
    event.dataTransfer!.effectAllowed = 'copy';
  }
}
