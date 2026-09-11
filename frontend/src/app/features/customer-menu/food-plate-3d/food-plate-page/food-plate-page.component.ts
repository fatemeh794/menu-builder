import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { CartService } from '../../cart.service';
import { FoodPlateComponent } from '../components/food-plate/food-plate.component';
import { FoodSelectorComponent } from '../components/food-selector/food-selector.component';
import { MealSummaryComponent } from '../components/meal-summary/meal-summary.component';
import { Ingredient } from '../models/ingredient.model';
import { FoodInteractionService } from '../services/food-interaction.service';

interface DragGhost {
  ingredient: Ingredient;
  x: number;
  y: number;
}

const DRAG_ACTIVATE_THRESHOLD = 8;

/** Top-level page: lays out the selector, the 3D plate, and the floating
 * summary, and owns the one piece of cross-component choreography the whole
 * feature needs - bridging a pointer-drag that starts on an ingredient card
 * (FoodSelectorComponent) to a drop onto the canvas (FoodPlateComponent).
 * Native HTML5 drag-and-drop can't do that bridging on touch devices at all,
 * so this custom pointer-tracked "ghost" is what makes the drag gesture work
 * identically for mouse and touch - desktop mouse users additionally get
 * native HTML5 DnD for free (wired directly on the card and the canvas). */
@Component({
  selector: 'app-food-plate-page',
  standalone: true,
  imports: [MatIconModule, TranslateModule, FoodPlateComponent, FoodSelectorComponent, MealSummaryComponent],
  providers: [FoodInteractionService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './food-plate-page.component.html',
  styleUrl: './food-plate-page.component.scss',
})
export class FoodPlatePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cartService = inject(CartService);
  readonly interaction = inject(FoodInteractionService);

  private readonly restaurantSlug = this.route.snapshot.paramMap.get('slug')!;

  readonly plate = viewChild.required(FoodPlateComponent);

  readonly ghost = signal<DragGhost | null>(null);
  readonly justAdded = signal(false);

  private pending: { ingredient: Ingredient; startX: number; startY: number } | null = null;
  private readonly boundMove = (e: PointerEvent) => this.onWindowPointerMove(e);
  private readonly boundUp = (e: PointerEvent) => this.onWindowPointerUp(e);

  onIngredientPointerDown(payload: { ingredient: Ingredient; event: PointerEvent }): void {
    this.pending = { ingredient: payload.ingredient, startX: payload.event.clientX, startY: payload.event.clientY };
    window.addEventListener('pointermove', this.boundMove);
    window.addEventListener('pointerup', this.boundUp, { once: true });
  }

  private onWindowPointerMove(event: PointerEvent): void {
    if (!this.pending) return;

    if (!this.ghost()) {
      const dx = event.clientX - this.pending.startX;
      const dy = event.clientY - this.pending.startY;
      if (Math.hypot(dx, dy) < DRAG_ACTIVATE_THRESHOLD) return;
      this.ghost.set({ ingredient: this.pending.ingredient, x: event.clientX, y: event.clientY });
      return;
    }
    this.ghost.set({ ...this.ghost()!, x: event.clientX, y: event.clientY });
  }

  private onWindowPointerUp(event: PointerEvent): void {
    window.removeEventListener('pointermove', this.boundMove);
    const activeGhost = this.ghost();
    this.ghost.set(null);
    this.pending = null;
    if (!activeGhost) return;

    const canvasHost = this.plate().canvasRef().nativeElement.getBoundingClientRect();
    const overCanvas =
      event.clientX >= canvasHost.left &&
      event.clientX <= canvasHost.right &&
      event.clientY >= canvasHost.top &&
      event.clientY <= canvasHost.bottom;

    if (overCanvas) {
      this.plate().dropIngredientAt(activeGhost.ingredient, event.clientX, event.clientY);
    }
  }

  onIngredientTapAdd(ingredient: Ingredient): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.9;
    this.interaction.addFood(ingredient.id, { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius });
  }

  addToCart(): void {
    if (!this.interaction.summary().length) return;
    this.justAdded.set(true);
    setTimeout(() => this.justAdded.set(false), 1600);
  }

  goBack(): void {
    const token = this.cartService.tableToken;
    if (token) {
      this.router.navigate(['/menu', this.restaurantSlug, 'table', token]);
    } else {
      this.router.navigate(['/menu', this.restaurantSlug]);
    }
  }
}
