import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { TomanPricePipe } from '../../../../../shared/pipes/toman-price.pipe';
import { FoodInteractionService } from '../../services/food-interaction.service';

@Component({
  selector: 'app-meal-summary',
  standalone: true,
  imports: [MatIconModule, TranslateModule, TomanPricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meal-summary.component.html',
})
export class MealSummaryComponent {
  readonly interaction = inject(FoodInteractionService);
  readonly addToCart = output<void>();

  removeOne(ingredientId: string): void {
    const last = [...this.interaction.placedFoods()].reverse().find((f) => f.ingredientId === ingredientId);
    if (last) this.interaction.removeFood(last.id);
  }
}
