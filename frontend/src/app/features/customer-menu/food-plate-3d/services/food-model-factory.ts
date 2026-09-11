import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { Ingredient } from '../models/ingredient.model';

/** Builds the 3D representation for one ingredient. Every builder returns a
 * self-contained THREE.Group centered on its own origin at y=0 (its base),
 * sized to roughly `ingredient.footprint` world units across, so the caller
 * never needs to know how any particular food is modeled internally.
 *
 * Procedural geometry is the default (guaranteed to load instantly, zero
 * licensing surface). Setting `ingredient.modelUrl` to a real .glb swaps
 * that ingredient over to GLTFLoader with no other code changes - see
 * `loadOrBuild` below and the "adding a new ingredient" notes in the repo. */

const loader = new GLTFLoader();
const gltfCache = new Map<string, Promise<THREE.Group>>();

function tag(group: THREE.Group, ingredient: Ingredient): THREE.Group {
  group.userData['ingredientId'] = ingredient.id;
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = false;
    }
  });
  return group;
}

function ceramicLike(color: string, roughness = 0.55, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function buildChicken(): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), ceramicLike('#d18a45', 0.7));
  body.scale.set(1.15, 0.55, 0.85);
  body.position.y = 0.24;
  group.add(body);

  const grillMark = ceramicLike('#5c3417', 0.8);
  for (let i = -1; i <= 1; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.03, 0.07), grillMark);
    stripe.position.set(0, 0.42, i * 0.16);
    stripe.rotation.y = 0.15;
    group.add(stripe);
  }
  return group;
}

function buildBeef(): THREE.Group {
  const group = new THREE.Group();
  const patty = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.22, 24), ceramicLike('#6b3a2c', 0.75));
  patty.position.y = 0.11;
  group.add(patty);

  const grillMark = ceramicLike('#331a12', 0.85);
  for (let i = -1; i <= 1; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.24, 0.05), grillMark);
    stripe.position.set(0, 0.11, i * 0.14);
    group.add(stripe);
  }
  return group;
}

function buildEgg(): THREE.Group {
  const group = new THREE.Group();
  const white = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 12), ceramicLike('#f7f2e2', 0.4));
  white.scale.set(1.2, 0.22, 1);
  white.position.y = 0.05;
  group.add(white);

  const yolk = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), ceramicLike('#f0a828', 0.5));
  yolk.scale.set(1, 0.55, 1);
  yolk.position.y = 0.14;
  group.add(yolk);
  return group;
}

function buildRice(): THREE.Group {
  const group = new THREE.Group();
  const mound = new THREE.Mesh(new THREE.SphereGeometry(0.4, 18, 12), ceramicLike('#f6f1de', 0.6));
  mound.scale.set(1.1, 0.5, 1.1);
  mound.position.y = 0.14;
  group.add(mound);

  const grain = new THREE.CapsuleGeometry(0.025, 0.06, 2, 4);
  const grainMat = ceramicLike('#fffaf0', 0.5);
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Mesh(grain, grainMat);
    const angle = (i / 10) * Math.PI * 2;
    const r = 0.15 + (i % 3) * 0.08;
    g.position.set(Math.cos(angle) * r, 0.3 + (i % 2) * 0.03, Math.sin(angle) * r);
    g.rotation.set(Math.random() * 0.6, Math.random() * Math.PI, Math.random() * 0.6);
    group.add(g);
  }
  return group;
}

function buildFries(): THREE.Group {
  const group = new THREE.Group();
  const mat = ceramicLike('#e8b84b', 0.55);
  const stickGeo = new THREE.BoxGeometry(0.06, 0.38, 0.06);
  const positions = [
    [-0.14, 0.05], [-0.05, -0.08], [0.06, 0.06], [0.15, -0.05], [0, 0.15], [-0.1, 0.16],
  ];
  positions.forEach(([x, z], i) => {
    const stick = new THREE.Mesh(stickGeo, mat);
    stick.position.set(x, 0.19, z);
    stick.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.08;
    stick.rotation.y = Math.random() * Math.PI;
    group.add(stick);
  });
  return group;
}

function buildTomato(): THREE.Group {
  const group = new THREE.Group();
  const slice = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 24), ceramicLike('#c8352e', 0.35));
  slice.position.y = 0.08;
  group.add(slice);

  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.18, 16), ceramicLike('#e8827a', 0.35));
  core.position.y = 0.09;
  group.add(core);
  return group;
}

function buildLettuce(): THREE.Group {
  const group = new THREE.Group();
  const geometry = new THREE.IcosahedronGeometry(0.34, 1);
  const pos = geometry.attributes['position'];
  for (let i = 0; i < pos.count; i++) {
    const jitter = 0.03;
    pos.setXYZ(
      i,
      pos.getX(i) + (Math.random() - 0.5) * jitter,
      pos.getY(i) + (Math.random() - 0.5) * jitter,
      pos.getZ(i) + (Math.random() - 0.5) * jitter,
    );
  }
  geometry.computeVertexNormals();
  const leaf = new THREE.Mesh(geometry, ceramicLike('#6fae4a', 0.85));
  leaf.scale.y = 0.4;
  leaf.position.y = 0.14;
  group.add(leaf);
  return group;
}

function buildCucumber(): THREE.Group {
  const group = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 20), ceramicLike('#2f6b3a', 0.6));
  outer.position.y = 0.06;
  group.add(outer);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.13, 20), ceramicLike('#cdeec0', 0.5));
  inner.position.y = 0.065;
  group.add(inner);
  return group;
}

function buildMushroom(): THREE.Group {
  const group = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.24, 12), ceramicLike('#efe6d6', 0.6));
  stem.position.y = 0.12;
  group.add(stem);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), ceramicLike('#c9a67e', 0.6));
  cap.position.y = 0.24;
  group.add(cap);
  return group;
}

function buildOnion(): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 24), ceramicLike('#f2eaf5', 0.4));
  base.position.y = 0.05;
  group.add(base);
  const ringMat = ceramicLike('#c9a3d6', 0.4);
  [0.19, 0.12].forEach((r) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 32), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.1;
    group.add(ring);
  });
  return group;
}

function buildCheese(): THREE.Group {
  const group = new THREE.Group();
  // A 3-sided cylinder is a cheap triangular prism - a perfect cheese wedge.
  const wedge = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.3, 3), ceramicLike('#f0c645', 0.4));
  wedge.rotation.x = Math.PI / 2;
  wedge.rotation.z = Math.PI / 6;
  wedge.position.y = 0.14;
  group.add(wedge);
  return group;
}

const BUILDERS: Record<string, () => THREE.Group> = {
  chicken: buildChicken,
  beef: buildBeef,
  egg: buildEgg,
  rice: buildRice,
  fries: buildFries,
  tomato: buildTomato,
  lettuce: buildLettuce,
  cucumber: buildCucumber,
  mushroom: buildMushroom,
  onion: buildOnion,
  cheese: buildCheese,
};

function buildProcedural(ingredient: Ingredient): THREE.Group {
  const builder = BUILDERS[ingredient.id];
  const group = builder ? builder() : buildFallback();
  return tag(group, ingredient);
}

function buildFallback(): THREE.Group {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), ceramicLike('#cccccc'));
  mesh.position.y = 0.15;
  group.add(mesh);
  return group;
}

/** Centers and rescales a loaded .glb so it behaves like the procedural
 * models: sitting on y=0, roughly `footprint` units across. */
function normalizeLoadedModel(root: THREE.Group, footprint: number): THREE.Group {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z) || 1;
  const scale = footprint / largest;
  root.scale.setScalar(scale);

  const box2 = new THREE.Box3().setFromObject(root);
  root.position.y -= box2.min.y;
  const center = box2.getCenter(new THREE.Vector3());
  root.position.x -= center.x * scale;
  root.position.z -= center.z * scale;
  return root;
}

function loadGlb(url: string): Promise<THREE.Group> {
  const cached = gltfCache.get(url);
  if (cached) return cached.then((g) => g.clone());

  const promise = new Promise<THREE.Group>((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      (err) => reject(err instanceof Error ? err : new Error(String(err))),
    );
  });
  gltfCache.set(url, promise);
  return promise.then((g) => g.clone());
}

/** Main entry point: async so a real .glb can be swapped in later for any
 * ingredient without changing any caller. Procedural models resolve
 * immediately; a failed .glb load falls back to the procedural version
 * rather than leaving a hole on the plate. */
export async function loadOrBuild(ingredient: Ingredient): Promise<THREE.Group> {
  if (!ingredient.modelUrl) {
    return buildProcedural(ingredient);
  }
  try {
    const model = await loadGlb(ingredient.modelUrl);
    return tag(normalizeLoadedModel(model, ingredient.footprint), ingredient);
  } catch {
    return buildProcedural(ingredient);
  }
}
