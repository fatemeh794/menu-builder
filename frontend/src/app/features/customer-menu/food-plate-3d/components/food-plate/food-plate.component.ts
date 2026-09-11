import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import gsap from 'gsap';
import * as THREE from 'three';

import { Ingredient } from '../../models/ingredient.model';
import { PlacedFood } from '../../models/placed-food.model';
import { FoodInteractionService } from '../../services/food-interaction.service';
import { loadOrBuild } from '../../services/food-model-factory';
import { ThreeSceneService } from '../../services/three-scene.service';

const PLACEMENT_RADIUS = 1.28;
const PLATE_SURFACE_Y = 0.07;
const DRAG_MOVE_THRESHOLD = 4;

/** Owns the entire Three.js side of the build-your-own plate: the ceramic
 * plate mesh, lighting handled by ThreeSceneService, and every placed food
 * model. This is the ONLY component that imports `three` - FoodSelectorComponent
 * and MealSummaryComponent only ever read/write FoodInteractionService, so
 * the 3D engine stays fully swappable without touching the surrounding UI.
 *
 * Angular <-> Three.js bridge: an `effect()` watches
 * `interaction.placedFoods()` and diffs it against `this.mountedFoods` (a
 * plain Map<id, THREE.Group>) - added ids get a model built and dropped in
 * with a GSAP "fall onto the plate" animation, removed ids get their group
 * disposed and taken out of the scene. Nothing else touches the scene graph
 * directly, so `placedFoods` is always the single source of truth. */
@Component({
  selector: 'app-food-plate',
  standalone: true,
  providers: [ThreeSceneService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './food-plate.component.html',
})
export class FoodPlateComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly three = inject(ThreeSceneService);
  private readonly interaction = inject(FoodInteractionService);

  readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private stage!: THREE.Group;
  private plateMesh!: THREE.Group;
  private raycastPlane!: THREE.Mesh;
  private readonly raycaster = new THREE.Raycaster();
  private readonly mountedFoods = new Map<string, THREE.Group>();

  private draggingId: string | null = null;
  private dragStartClient: { x: number; y: number } | null = null;
  private dragMoved = false;

  private readonly mouseNdc = new THREE.Vector2();
  private readonly cameraBase = new THREE.Vector3(0, 3.6, 4.3);

  constructor() {
    effect(() => this.syncPlacedFoods(this.interaction.placedFoods()));
  }

  ngAfterViewInit(): void {
    this.three.mount(this.canvasRef().nativeElement);
    this.buildPlate();
    this.buildRaycastPlane();
    this.setupCamera();
    this.three.addFrameCallback(() => this.onFrame());
    this.playEntrance();
  }

  ngOnDestroy(): void {
    this.mountedFoods.forEach((group) => this.disposeGroup(group));
    this.mountedFoods.clear();
  }

  /** Called by the page component once it determines a card's custom
   * pointer-drag ended over this canvas (see food-plate-page.component.ts -
   * native HTML5 drag-and-drop doesn't work reliably on touch, so drag
   * source -> drop target is coordinated one level up). */
  dropIngredientAt(ingredient: Ingredient, clientX: number, clientY: number): void {
    const point = this.pointFromClient(clientX, clientY);
    if (!point) return;
    this.interaction.addFood(ingredient.id, point);
  }

  /** Desktop convenience: native HTML5 DnD works fine with a mouse, so it's
   * wired directly on the canvas as a second, purely desktop path. */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const ingredientId = event.dataTransfer?.getData('text/plain');
    const ingredient = ingredientId ? this.interaction.ingredientById(ingredientId) : undefined;
    if (!ingredient) return;
    this.dropIngredientAt(ingredient, event.clientX, event.clientY);
  }

  /** Move-or-remove for food already on the plate: a drag repositions it,
   * a plain tap/click removes it. One gesture, both requirements. */
  onPointerDown(event: PointerEvent): void {
    const hit = this.hitTestPlacedFood(event.clientX, event.clientY);
    if (!hit) return;
    this.draggingId = hit;
    this.dragStartClient = { x: event.clientX, y: event.clientY };
    this.dragMoved = false;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    this.mouseNdc.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);

    if (!this.draggingId || !this.dragStartClient) return;
    const dx = event.clientX - this.dragStartClient.x;
    const dy = event.clientY - this.dragStartClient.y;
    if (!this.dragMoved && Math.hypot(dx, dy) > DRAG_MOVE_THRESHOLD) {
      this.dragMoved = true;
    }
    if (!this.dragMoved) return;

    const point = this.pointFromClient(event.clientX, event.clientY);
    if (!point) return;
    const group = this.mountedFoods.get(this.draggingId);
    if (group) group.position.set(point.x, group.position.y, point.z);
    this.interaction.moveFood(this.draggingId, point);
  }

  onPointerUp(): void {
    if (!this.draggingId) return;
    if (!this.dragMoved) {
      const id = this.draggingId;
      const group = this.mountedFoods.get(id);
      if (group) {
        gsap.to(group.scale, {
          x: 0.01,
          y: 0.01,
          z: 0.01,
          duration: 0.22,
          ease: 'back.in(2)',
          onComplete: () => this.interaction.removeFood(id),
        });
      } else {
        this.interaction.removeFood(id);
      }
    }
    this.draggingId = null;
    this.dragStartClient = null;
  }

  private buildPlate(): void {
    this.stage = new THREE.Group();
    this.three.scene.add(this.stage);

    // A revolved profile gives a believable plate silhouette (flat well,
    // raised rim) far more cheaply than a sculpted/imported mesh.
    const profile = [
      new THREE.Vector2(0, 0.03),
      new THREE.Vector2(1.05, 0.03),
      new THREE.Vector2(1.25, 0.09),
      new THREE.Vector2(1.45, 0.11),
      new THREE.Vector2(1.55, 0.02),
      new THREE.Vector2(1.5, 0),
    ];
    const geometry = new THREE.LatheGeometry(profile, 64);
    const material = new THREE.MeshPhysicalMaterial({
      color: '#fbfaf7',
      roughness: 0.35,
      metalness: 0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.3,
      envMapIntensity: 0.4,
      // The lathe profile's winding leaves the flat well's normals facing
      // down - DoubleSide keeps it visible from above instead of getting
      // backface-culled into looking like a hollow ring.
      side: THREE.DoubleSide,
    });
    const plate = new THREE.Mesh(geometry, material);
    plate.receiveShadow = true;
    plate.castShadow = false;

    this.plateMesh = new THREE.Group();
    this.plateMesh.add(plate);
    this.stage.add(this.plateMesh);
  }

  private buildRaycastPlane(): void {
    const geometry = new THREE.PlaneGeometry(20, 20);
    const material = new THREE.MeshBasicMaterial({ visible: false });
    this.raycastPlane = new THREE.Mesh(geometry, material);
    this.raycastPlane.rotation.x = -Math.PI / 2;
    this.raycastPlane.position.y = PLATE_SURFACE_Y;
    this.stage.add(this.raycastPlane);
  }

  private setupCamera(): void {
    // The "tilt toward the user" comes from the camera angle rather than
    // rotating the plate geometry - the plate stays flat in world space, so
    // drop-position math never has to account for a tilted placement plane.
    this.three.camera.position.copy(this.cameraBase);
    this.three.camera.lookAt(0, PLATE_SURFACE_Y, 0);
  }

  private playEntrance(): void {
    this.plateMesh.scale.setScalar(0.01);
    this.plateMesh.position.y = -0.6;
    gsap.to(this.plateMesh.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'back.out(1.4)' });
    gsap.to(this.plateMesh.position, { y: 0, duration: 0.9, ease: 'back.out(1.4)' });
  }

  private onFrame(): void {
    // Subtle camera parallax + idle sway - alive, never a distraction, and
    // never large enough to make placed food read as "moving on its own".
    const targetX = this.cameraBase.x + this.mouseNdc.x * 0.35;
    const targetY = this.cameraBase.y - this.mouseNdc.y * 0.2;
    this.three.camera.position.x += (targetX - this.three.camera.position.x) * 0.04;
    this.three.camera.position.y += (targetY - this.three.camera.position.y) * 0.04;
    this.three.camera.lookAt(0, PLATE_SURFACE_Y, 0);

    this.stage.rotation.y = Math.sin(performance.now() / 4000) * 0.025;
  }

  private syncPlacedFoods(foods: PlacedFood[]): void {
    const currentIds = new Set(foods.map((f) => f.id));

    for (const [id, group] of this.mountedFoods) {
      if (!currentIds.has(id)) {
        this.disposeGroup(group);
        this.mountedFoods.delete(id);
      }
    }

    for (const food of foods) {
      const existing = this.mountedFoods.get(food.id);
      if (existing) {
        if (this.draggingId !== food.id) {
          existing.position.set(food.position.x, existing.position.y, food.position.z);
        }
        continue;
      }
      this.spawnFood(food);
    }
  }

  private spawnFood(food: PlacedFood): void {
    const ingredient = this.interaction.ingredientById(food.ingredientId);
    if (!ingredient) return;

    // Reserve the slot immediately so a fast add/remove during the async
    // load can't race and leave an orphaned mesh.
    const placeholder = new THREE.Group();
    this.mountedFoods.set(food.id, placeholder);

    loadOrBuild(ingredient).then((model) => {
      if (!this.mountedFoods.has(food.id)) {
        this.disposeGroup(model);
        return;
      }
      model.position.set(food.position.x, 1.4, food.position.z);
      model.rotation.y = food.rotationY;
      model.scale.setScalar(0.01);
      this.plateMesh.add(model);
      this.mountedFoods.set(food.id, model);

      const tl = gsap.timeline();
      tl.to(model.position, { y: PLATE_SURFACE_Y, duration: 0.5, ease: 'bounce.out' }, 0);
      tl.to(model.scale, { x: 1, y: 1, z: 1, duration: 0.35, ease: 'back.out(2)' }, 0);
    });
  }

  private disposeGroup(group: THREE.Group): void {
    this.plateMesh?.remove(group);
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((m) => m.dispose());
      }
    });
  }

  private hitTestPlacedFood(clientX: number, clientY: number): string | null {
    this.updateRaycaster(clientX, clientY, this.three.camera);
    const groups = [...this.mountedFoods.entries()];
    const intersects = this.raycaster.intersectObjects(
      groups.map(([, g]) => g),
      true,
    );
    if (!intersects.length) return null;

    let obj: THREE.Object3D | null = intersects[0].object;
    while (obj && !groups.some(([, g]) => g === obj)) obj = obj.parent;
    const found = groups.find(([, g]) => g === obj);
    return found ? found[0] : null;
  }

  private pointFromClient(clientX: number, clientY: number): { x: number; z: number } | null {
    this.updateRaycaster(clientX, clientY, this.three.camera);
    const hit = new THREE.Vector3();
    const didHit = this.raycaster.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), -PLATE_SURFACE_Y),
      hit,
    );
    if (!didHit) return null;

    const distance = Math.hypot(hit.x, hit.z);
    if (distance > PLACEMENT_RADIUS) {
      const scale = PLACEMENT_RADIUS / distance;
      hit.x *= scale;
      hit.z *= scale;
    }
    return { x: hit.x, z: hit.z };
  }

  private updateRaycaster(clientX: number, clientY: number, camera: THREE.Camera): void {
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, camera);
  }
}
