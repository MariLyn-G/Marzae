import * as THREE from 'three';
import type { BagColors, Spec3D } from './catalog';

// Procedural bag geometry. Production swaps this for artist-made GLB models
// per style and keeps the same API: colours and textures change on config.

function roundedShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function slab(w: number, h: number, d: number, r: number): THREE.BufferGeometry {
  const bevel = Math.min(0.045, d * 0.25);
  const g = new THREE.ExtrudeGeometry(roundedShape(w, h, r), {
    depth: d,
    bevelEnabled: true,
    curveSegments: 18,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
  });
  g.translate(0, 0, -d / 2);
  g.computeVertexNormals();
  return g;
}

function tube(points: [number, number, number][], radius: number): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.TubeGeometry(curve, 96, radius, 14, false);
}

type Vec3 = [number, number, number];

function buildBag(
  spec: Spec3D,
  leather: THREE.Material,
  accentLeather: THREE.Material,
  metal: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  const { w, h, d, r } = spec;
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, pos?: Vec3, rot?: Vec3) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };

  add(slab(w, h, d, r), leather);

  // side gusset seams
  const seam = new THREE.BoxGeometry(0.012, h * 0.94, d * 0.9);
  add(seam, accentLeather, [-w / 2 + 0.008, 0, 0]);
  add(seam, accentLeather, [w / 2 - 0.008, 0, 0]);

  if (spec.flap) {
    const fh = h * 0.4;
    add(slab(w * 0.995, fh, d * 1.09, r), accentLeather, [0, h / 2 - fh / 2, 0]);
    add(new THREE.BoxGeometry(w * 0.17, 0.1, 0.06), metal, [0, h / 2 - fh + 0.02, d * 0.56]);
    add(new THREE.TorusGeometry(0.085, 0.022, 12, 28), metal, [0, h / 2 - fh - 0.09, d * 0.56]);
  } else {
    // open top: an inner shadow band reads as the mouth of the bag
    add(new THREE.BoxGeometry(w * 0.92, 0.05, d * 0.7), accentLeather, [0, h / 2 - 0.03, 0]);
  }

  if (spec.pocket) {
    add(slab(w * 0.56, h * 0.34, 0.06, r * 0.8), accentLeather, [0, -h * 0.18, d / 2 + 0.03]);
  }

  const hr = Math.min(0.34, w * 0.3);
  if (spec.handle === 'twin') {
    for (const sx of [-1, 1]) {
      add(new THREE.TorusGeometry(hr, 0.032, 14, 40, Math.PI), leather, [sx * w * 0.24, h / 2 - 0.02, 0]);
      add(new THREE.TorusGeometry(0.05, 0.018, 10, 22), metal, [sx * w * 0.24 - hr, h / 2 - 0.02, 0]);
      add(new THREE.TorusGeometry(0.05, 0.018, 10, 22), metal, [sx * w * 0.24 + hr, h / 2 - 0.02, 0]);
    }
  } else if (spec.handle === 'top') {
    add(new THREE.TorusGeometry(w * 0.2, 0.034, 14, 44, Math.PI), leather, [0, h / 2 - 0.02, 0]);
  } else if (spec.handle === 'sling' || spec.handle === 'chain') {
    const pts: Vec3[] = [
      [-w / 2 + 0.03, h / 2 - 0.08, 0],
      [-w * 0.52, h * 0.95, 0.05],
      [0, h * 1.32, 0.12],
      [w * 0.52, h * 0.95, 0.05],
      [w / 2 - 0.03, h / 2 - 0.08, 0],
    ];
    const chain = spec.handle === 'chain';
    add(tube(pts, chain ? 0.026 : 0.038), chain ? metal : leather);
    for (const sx of [-1, 1]) {
      add(new THREE.TorusGeometry(0.06, 0.02, 10, 24), metal, [sx * (w / 2 - 0.03), h / 2 - 0.08, 0]);
    }
  }

  // feet
  if (spec.h > 0.9) {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        add(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 14), metal, [sx * w * 0.36, -h / 2 - 0.015, sz * d * 0.3]);
      }
    }
  }
  return g;
}

function disposeGeometry(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
}

function configureRenderer(renderer: THREE.WebGLRenderer) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

function addLights(scene: THREE.Scene, shadowMap: number, shadowExtent: number, shadowRadius: number) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9694, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(3.2, 5.2, 4.4);
  key.castShadow = true;
  key.shadow.mapSize.set(shadowMap, shadowMap);
  key.shadow.camera.left = -shadowExtent;
  key.shadow.camera.right = shadowExtent;
  key.shadow.camera.top = shadowExtent;
  key.shadow.camera.bottom = -shadowExtent;
  key.shadow.radius = shadowRadius;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.55);
  fill.position.set(-4, 1.6, 2.4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(-1.2, 2.4, -4.2);
  scene.add(rim);
}

// ── Stills: one shared offscreen renderer for every card, cart and bench thumbnail ──

interface StillCtx {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  ground: THREE.Mesh;
  canvas: HTMLCanvasElement;
}

let still: StillCtx | null = null;

function stillCtx(): StillCtx {
  if (still) return still;
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  configureRenderer(renderer);
  const scene = new THREE.Scene();
  addLights(scene, 2048, 7, 5);
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  still = { canvas, renderer, scene, camera, ground };
  return still;
}

export interface StillItem {
  spec: Spec3D;
  colors: BagColors;
  rotY?: number;
}

export interface StillOptions {
  width?: number;
  height?: number;
  gap?: number;
  margin?: number;
  rotY?: number;
}

/**
 * Renders one or several bags side by side and resolves to a PNG blob URL.
 * Blob URLs, not data URLs, so they can sit inside inline styles safely.
 */
export function renderStill(items: StillItem[], o: StillOptions = {}): Promise<string> {
  const width = o.width ?? 600;
  const height = o.height ?? 720;
  const gap = o.gap ?? 0.4;
  const margin = o.margin ?? 1.2;
  const { canvas, renderer, scene, camera, ground } = stillCtx();
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  const root = new THREE.Group();
  const mats: THREE.Material[] = [];
  const total = items.reduce((a, it) => a + it.spec.w, 0) + gap * (items.length - 1);
  let cursor = -total / 2;
  for (const it of items) {
    const c = it.colors;
    const leather = new THREE.MeshStandardMaterial({ color: c.leather, roughness: 0.62, metalness: 0.06 });
    const accent = new THREE.MeshStandardMaterial({ color: c.accent, roughness: 0.52, metalness: 0.06 });
    const metal = new THREE.MeshStandardMaterial({ color: c.metal, roughness: c.metalRough, metalness: 0.95 });
    mats.push(leather, accent, metal);
    const pivot = new THREE.Group();
    pivot.add(buildBag(it.spec, leather, accent, metal));
    pivot.rotation.y = it.rotY ?? o.rotY ?? -0.55;
    pivot.position.set(cursor + it.spec.w / 2, it.spec.h / 2, 0);
    cursor += it.spec.w + gap;
    root.add(pivot);
  }
  scene.add(root);
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const ctr = box.getCenter(new THREE.Vector3());
  ground.position.y = box.min.y + 0.005;
  const vHalf = THREE.MathUtils.degToRad(camera.fov) / 2;
  const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
  const dist = Math.max(size.y / 2 / Math.tan(vHalf), size.x / 2 / Math.tan(hHalf)) * margin + size.z / 2;
  camera.position.set(ctr.x, ctr.y + dist * 0.2, ctr.z + dist);
  camera.lookAt(ctr.x, ctr.y - size.y * 0.04, ctr.z);
  renderer.render(scene, camera);

  scene.remove(root);
  disposeGeometry(root);
  mats.forEach((m) => m.dispose());

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

// ── Interactive viewer ──

export type ViewName = 'front' | 'three' | 'side' | 'top' | 'back';

const VIEWS: Record<ViewName, { x: number; y: number }> = {
  front: { x: 0.02, y: 0 },
  three: { x: 0.12, y: -0.62 },
  side: { x: 0.06, y: -1.5 },
  top: { x: 0.85, y: -0.35 },
  back: { x: 0.05, y: -Math.PI },
};

export interface Viewer {
  setConfig(spec: Spec3D, colors: BagColors): void;
  setView(name: ViewName): void;
  setAutorotate(on: boolean): void;
  setZoom(z: number): void;
  dispose(): void;
}

export function createViewer(canvas: HTMLCanvasElement, opts: { autorotate?: boolean; shadow?: boolean } = {}): Viewer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  configureRenderer(renderer);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  addLights(scene, 1024, 4, 4);

  const leather = new THREE.MeshStandardMaterial({ color: 0x2d2b2b, roughness: 0.62, metalness: 0.06 });
  const accentLeather = new THREE.MeshStandardMaterial({ color: 0x2d2b2b, roughness: 0.52, metalness: 0.06 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: 0.3, metalness: 0.95 });

  const pivot = new THREE.Group();
  scene.add(pivot);

  const groundMat = new THREE.ShadowMaterial({ opacity: opts.shadow === false ? 0 : 0.17 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  let bag: THREE.Group | null = null;
  let spec: Spec3D | null = null;
  const extent = { top: 0, bottom: 0 };
  const rot = { x: 0.1, y: -0.62 };
  const target = { x: 0.1, y: -0.62 };
  let zoom = 1;
  let zoomTarget = 1;
  let autorotate = opts.autorotate !== false;
  let dragging = false;
  let last: [number, number] | null = null;
  let alive = true;
  let raf = 0;
  let lastT = performance.now();

  function frame() {
    if (!spec) return;
    const vHalf = THREE.MathUtils.degToRad(camera.fov) / 2;
    const hHalf = Math.atan(Math.tan(vHalf) * Math.max(camera.aspect, 0.2));
    // Frame the real extent, so tall straps and chains are not cropped.
    const halfH = Math.max(spec.h * 0.86, extent.top, extent.bottom) + 0.3;
    const halfW = Math.max(spec.w, spec.d) * 0.62 + 0.22;
    const dist = Math.max(halfH / Math.tan(vHalf), halfW / Math.tan(hHalf)) + spec.d;
    camera.position.set(0, spec.h * 0.14, dist * zoom);
    camera.lookAt(0, 0, 0);
  }

  function setConfig(nextSpec: Spec3D, colors: BagColors) {
    leather.color.set(colors.leather);
    accentLeather.color.set(colors.accent);
    metal.color.set(colors.metal);
    metal.roughness = colors.metalRough;
    if (!bag || JSON.stringify(nextSpec) !== JSON.stringify(spec)) {
      if (bag) {
        pivot.remove(bag);
        disposeGeometry(bag);
      }
      spec = { ...nextSpec };
      bag = buildBag(spec, leather, accentLeather, metal);
      const box = new THREE.Box3().setFromObject(bag);
      extent.top = box.max.y;
      extent.bottom = -box.min.y;
      pivot.add(bag);
      ground.position.y = -spec.h / 2 - 0.06;
      frame();
    }
  }

  const onDown = (e: PointerEvent) => {
    dragging = true;
    last = [e.clientX, e.clientY];
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging || !last) return;
    target.y += (e.clientX - last[0]) * 0.009;
    target.x = Math.max(-0.55, Math.min(1.15, target.x + (e.clientY - last[1]) * 0.006));
    last = [e.clientX, e.clientY];
  };
  const onUp = () => {
    dragging = false;
    last = null;
    canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onUp);

  let w0 = 0;
  let h0 = 0;
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h || (w === w0 && h === h0)) return;
    w0 = w;
    h0 = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    frame();
  }

  function loop(t: number) {
    if (!alive) return;
    const dt = Math.min(0.1, (t - lastT) / 1000);
    lastT = t;
    resize();
    if (autorotate && !dragging) target.y += 0.21 * dt; // ~0.2 rad/s
    rot.x += (target.x - rot.x) * 0.1;
    rot.y += (target.y - rot.y) * 0.1;
    pivot.rotation.set(rot.x, rot.y, 0);
    if (Math.abs(zoomTarget - zoom) > 0.002) {
      zoom += (zoomTarget - zoom) * 0.12;
      frame();
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  return {
    setConfig,
    setView(name) {
      const v = VIEWS[name] ?? VIEWS.three;
      target.x = v.x;
      target.y = v.y;
    },
    setAutorotate(on) {
      autorotate = on;
    },
    setZoom(z) {
      zoomTarget = z;
    },
    dispose() {
      alive = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave', onUp);
      if (bag) disposeGeometry(bag);
      ground.geometry.dispose();
      [leather, accentLeather, metal, groundMat].forEach((m) => m.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
