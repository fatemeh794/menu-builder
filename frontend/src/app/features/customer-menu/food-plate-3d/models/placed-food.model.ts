export interface PlacedFood {
  /** Unique per placement, not per ingredient - the same ingredient can be
   * dropped onto the plate multiple times as separate pieces. */
  id: string;
  ingredientId: string;
  position: { x: number; z: number };
  rotationY: number;
}
