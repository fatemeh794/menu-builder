export type IngredientCategory = 'protein' | 'base' | 'veggies' | 'extras';

export interface Ingredient {
  id: string;
  nameKey: string;
  category: IngredientCategory;
  /** Toman, matching the rest of the app - no other currency is used anywhere. */
  price: number;
  /** Base RGB color used by the procedural model factory and the card swatch. */
  color: string;
  /** Small flat icon shown on the 2D ingredient card (a real per-card mini 3D
   * preview would mean 11+ simultaneous WebGL contexts for little benefit). */
  icon: string;
  /** Roughly how big the ingredient's footprint is on the plate, in world
   * units - used to keep the packing/placement logic proportional. */
  footprint: number;
  /** Drop-in override: when set, the model factory loads this .glb instead
   * of building procedural geometry. See food-model-factory.ts. */
  modelUrl?: string;
}

export const INGREDIENTS: Ingredient[] = [
  { id: 'chicken', nameKey: 'plate3d.ingredient.chicken', category: 'protein', price: 55000, color: '#d18a45', icon: '🍗', footprint: 0.9 },
  { id: 'beef', nameKey: 'plate3d.ingredient.beef', category: 'protein', price: 65000, color: '#7a4a3a', icon: '🥩', footprint: 0.95 },
  { id: 'egg', nameKey: 'plate3d.ingredient.egg', category: 'protein', price: 18000, color: '#f5f1e6', icon: '🍳', footprint: 0.6 },
  { id: 'rice', nameKey: 'plate3d.ingredient.rice', category: 'base', price: 22000, color: '#f6f1de', icon: '🍚', footprint: 1.1 },
  { id: 'fries', nameKey: 'plate3d.ingredient.fries', category: 'base', price: 32000, color: '#e8b84b', icon: '🍟', footprint: 0.8 },
  { id: 'tomato', nameKey: 'plate3d.ingredient.tomato', category: 'veggies', price: 10000, color: '#c8352e', icon: '🍅', footprint: 0.45 },
  { id: 'lettuce', nameKey: 'plate3d.ingredient.lettuce', category: 'veggies', price: 10000, color: '#6fae4a', icon: '🥬', footprint: 0.7 },
  { id: 'cucumber', nameKey: 'plate3d.ingredient.cucumber', category: 'veggies', price: 10000, color: '#4f8f4a', icon: '🥒', footprint: 0.45 },
  { id: 'mushroom', nameKey: 'plate3d.ingredient.mushroom', category: 'veggies', price: 16000, color: '#c9a67e', icon: '🍄', footprint: 0.5 },
  { id: 'onion', nameKey: 'plate3d.ingredient.onion', category: 'veggies', price: 9000, color: '#e9def0', icon: '🧅', footprint: 0.5 },
  { id: 'cheese', nameKey: 'plate3d.ingredient.cheese', category: 'extras', price: 20000, color: '#f0c645', icon: '🧀', footprint: 0.55 },
];

export const CATEGORIES: { id: IngredientCategory; nameKey: string }[] = [
  { id: 'protein', nameKey: 'plate3d.category.protein' },
  { id: 'base', nameKey: 'plate3d.category.base' },
  { id: 'veggies', nameKey: 'plate3d.category.veggies' },
  { id: 'extras', nameKey: 'plate3d.category.extras' },
];
