import { Injectable, computed, signal } from '@angular/core';

import { CATEGORIES, INGREDIENTS, Ingredient, IngredientCategory } from '../models/ingredient.model';
import { PlacedFood } from '../models/placed-food.model';

export interface SummaryLine {
  ingredient: Ingredient;
  count: number;
  subtotal: number;
}

/** All app-facing state for the food-plate feature: what's on the plate, the
 * active ingredient category, and derived totals. Pure data - no Three.js,
 * no DOM. FoodPlateComponent watches `placedFoods` to know what to render
 * and calls `addFood`/`moveFood`/`removeFood` in response to pointer
 * events; FoodSelectorComponent and MealSummaryComponent only ever read
 * from or call this service, never touch the 3D scene directly. Provided at
 * the page component so every child shares one instance. */
@Injectable()
export class FoodInteractionService {
  readonly ingredients = INGREDIENTS;
  readonly categories = CATEGORIES;

  readonly activeCategory = signal<IngredientCategory>(CATEGORIES[0].id);
  readonly placedFoods = signal<PlacedFood[]>([]);

  readonly visibleIngredients = computed(() =>
    this.ingredients.filter((i) => i.category === this.activeCategory()),
  );

  readonly summary = computed<SummaryLine[]>(() => {
    const counts = new Map<string, number>();
    for (const food of this.placedFoods()) {
      counts.set(food.ingredientId, (counts.get(food.ingredientId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([ingredientId, count]) => {
        const ingredient = this.ingredientById(ingredientId);
        return ingredient ? { ingredient, count, subtotal: ingredient.price * count } : null;
      })
      .filter((line): line is SummaryLine => line !== null);
  });

  readonly total = computed(() => this.summary().reduce((sum, line) => sum + line.subtotal, 0));

  selectCategory(category: IngredientCategory): void {
    this.activeCategory.set(category);
  }

  ingredientById(id: string): Ingredient | undefined {
    return this.ingredients.find((i) => i.id === id);
  }

  addFood(ingredientId: string, position: { x: number; z: number }): string {
    const id = crypto.randomUUID();
    this.placedFoods.update((foods) => [
      ...foods,
      { id, ingredientId, position, rotationY: Math.random() * Math.PI * 2 },
    ]);
    return id;
  }

  moveFood(id: string, position: { x: number; z: number }): void {
    this.placedFoods.update((foods) => foods.map((f) => (f.id === id ? { ...f, position } : f)));
  }

  removeFood(id: string): void {
    this.placedFoods.update((foods) => foods.filter((f) => f.id !== id));
  }

  clearAll(): void {
    this.placedFoods.set([]);
  }
}
