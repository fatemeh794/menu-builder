import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Owns the raw Three.js scene graph: renderer, camera, lights, the render
 * loop, and resize/dispose lifecycle. Deliberately knows nothing about food,
 * plates, or Angular state - FoodPlateComponent is the only thing that talks
 * to both this service and FoodInteractionService, keeping Three.js concerns
 * and app/UI concerns from leaking into each other. Provided per-component
 * (see FoodPlateComponent's `providers`) so each page instance gets a fresh
 * scene that is fully disposed when the page is left. */
@Injectable()
export class ThreeSceneService implements OnDestroy {
  private readonly zone = inject(NgZone);

  readonly scene = new THREE.Scene();
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;

  private canvas?: HTMLCanvasElement;
  private frameId = 0;
  private resizeObserver?: ResizeObserver;
  private readonly onBeforeRender: (() => void)[] = [];

  mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const { clientWidth, clientHeight } = canvas.parentElement ?? canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.camera = new THREE.PerspectiveCamera(38, clientWidth / clientHeight, 0.1, 50);

    // A cheap procedural environment (no HDRI download) gives the ceramic
    // plate material believable PBR reflections instead of looking flat.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.setupLights();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);

    this.zone.runOutsideAngular(() => this.animate());
  }

  /** Runs every frame, outside Angular's zone - used for camera parallax and
   * subtle idle rotation, which have no business triggering change detection. */
  addFrameCallback(fn: () => void): void {
    this.onBeforeRender.push(fn);
  }

  private setupLights(): void {
    const hemi = new THREE.HemisphereLight('#ffffff', '#3a2f28', 0.9);
    this.scene.add(hemi);

    const ambient = new THREE.AmbientLight('#ffffff', 0.5);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight('#fff4e0', 2.2);
    key.position.set(1.5, 7, 2.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 3;
    key.shadow.camera.bottom = -3;
    key.shadow.bias = -0.002;
    this.scene.add(key);

    const fill = new THREE.PointLight('#dce9ff', 0.5);
    fill.position.set(-4, 3, -2);
    this.scene.add(fill);
  }

  private handleResize(): void {
    if (!this.canvas?.parentElement || !this.renderer) return;
    const { clientWidth, clientHeight } = this.canvas.parentElement;
    if (clientWidth === 0 || clientHeight === 0) return;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight, false);
  }

  private animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);
    for (const fn of this.onBeforeRender) fn();
    this.renderer.render(this.scene, this.camera);
  };

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver?.disconnect();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((m) => m.dispose());
      }
    });
    this.renderer?.dispose();
  }
}
