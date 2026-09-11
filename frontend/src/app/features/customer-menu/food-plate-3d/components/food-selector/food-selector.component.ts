import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { Ingredient, IngredientCategory } from '../../models/ingredient.model';
import { FoodInteractionService } from '../../services/food-interaction.service';
import { IngredientCardComponent } from '../ingredient-card/ingredient-card.component';

@Component({
  selector: 'app-food-selector',
  standalone: true,
  imports: [TranslateModule, IngredientCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './food-selector.component.html',
})
export class FoodSelectorComponent {
  readonly interaction = inject(FoodInteractionService);

  readonly ingredientPointerDown = output<{ ingredient: Ingredient; event: PointerEvent }>();
  readonly ingredientTapAdd = output<Ingredient>();

  selectCategory(category: IngredientCategory): void {
    this.interaction.selectCategory(category);
  }
}
