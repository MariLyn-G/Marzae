import * as THREE from 'https://esm.sh/three@0.166.0';

function roundedShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function slab(w, h, d, r) {
  const g = new THREE.ExtrudeGeometry(roundedShape(w, h, r), {
    depth: d, bevelEnabled: true, curveSegments: 18,
    bevelThickness: Math.min(0.045, d * 0.25), bevelSize: Math.min(0.045, d * 0.25), bevelSegments: 4
  });
  g.translate(0, 0, -d / 2);
  g.computeVertexNormals();
  return g;
}

function tube(points, radius) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  return new THREE.TubeGeometry(curve, 96, radius, 14, false);
}

// spec: { w,h,d,r, handle:'twin'|'top'|'sling'|'chain'|'none', flap:boolean, pocket:boolean }
function buildBag(spec, leather, accentLeather, metal) {
  const g = new THREE.Group();
  const { w, h, d, r } = spec;
  const add = (geo, mat, pos, rot) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    m.castShadow = true; m.receiveShadow = true;
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
    // open-top: an inner shadow band reads as the mouth of the bag
    add(new THREE.BoxGeometry(w * 0.92, 0.05, d * 0.7), accentLeather, [0, h / 2 - 0.03, 0]);
  }

  if (spec.pocket) {
    const ph = h * 0.34;
    add(slab(w * 0.56, ph, 0.06, r * 0.8), accentLeather, [0, -h * 0.18, d / 2 + 0.03]);
  }

  const hr = Math.min(0.34, w * 0.3);
  if (spec.handle === 'twin') {
    [-1, 1].forEach(sx => {
      add(new THREE.TorusGeometry(hr, 0.032, 14, 40, Math.PI), leather, [sx * w * 0.24, h / 2 - 0.02, 0]);
      add(new THREE.TorusGeometry(0.05, 0.018, 10, 22), metal, [sx * w * 0.24 - hr, h / 2 - 0.02, 0]);
      add(new THREE.TorusGeometry(0.05, 0.018, 10, 22), metal, [sx * w * 0.24 + hr, h / 2 - 0.02, 0]);
    });
  } else if (spec.handle === 'top') {
    add(new THREE.TorusGeometry(w * 0.2, 0.034, 14, 44, Math.PI), leather, [0, h / 2 - 0.02, 0]);
  } else if (spec.handle === 'sling' || spec.handle === 'chain') {
    const pts = [
      [-w / 2 + 0.03, h / 2 - 0.08, 0],
      [-w * 0.52, h * 0.95, 0.05],
      [0, h * 1.32, 0.12],
      [w * 0.52, h * 0.95, 0.05],
      [w / 2 - 0.03, h / 2 - 0.08, 0]
    ];
    const mat = spec.handle === 'chain' ? metal : leather;
    add(tube(pts, spec.handle === 'chain' ? 0.026 : 0.038), mat);
    [-1, 1].forEach(sx => add(new THREE.TorusGeometry(0.06, 0.02, 10, 24), metal, [sx * (w / 2 - 0.03), h / 2 - 0.08, 0]));
  }

  // feet
  if (spec.h > 0.9) {
    [-1, 1].forEach(sx => [-1, 1].forEach(sz =>
      add(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 14), metal, [sx * w * 0.36, -h / 2 - 0.015, sz * d * 0.3])
    ));
  }
  return g;
}

let S = null;
function stillCtx() {
  if (S) return S;
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9694, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(3.2, 5.2, 4.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -7; key.shadow.camera.right = 7;
  key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
  key.shadow.radius = 5;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.55); fill.position.set(-4, 1.6, 2.4); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9); rim.position.set(-1.2, 2.4, -4.2); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  S = { canvas, renderer, scene, camera, ground };
  return S;
}

// items: [{ spec, colors, rotY? }] -> PNG data URL
export function renderStill(items, o = {}) {
  const width = o.width || 600, height = o.height || 720, gap = o.gap ?? 0.4, margin = o.margin || 1.2;
  const { canvas, renderer, scene, camera, ground } = stillCtx();
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  const root = new THREE.Group();
  const mats = [];
  const total = items.reduce((a, it) => a + it.spec.w, 0) + gap * (items.length - 1);
  let cursor = -total / 2;
  items.forEach(it => {
    const c = it.colors;
    const leather = new THREE.MeshStandardMaterial({ color: c.leather, roughness: 0.62, metalness: 0.06 });
    const accent = new THREE.MeshStandardMaterial({ color: c.accent || c.leather, roughness: 0.52, metalness: 0.06 });
    const metal = new THREE.MeshStandardMaterial({ color: c.metal, roughness: c.metalRough ?? 0.3, metalness: 0.95 });
    mats.push(leather, accent, metal);
    const piv = new THREE.Group();
    piv.add(buildBag(it.spec, leather, accent, metal));
    piv.rotation.y = it.rotY ?? (o.rotY ?? -0.55);
    piv.position.set(cursor + it.spec.w / 2, it.spec.h / 2, 0);
    cursor += it.spec.w + gap;
    root.add(piv);
  });
  scene.add(root);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const ctr = box.getCenter(new THREE.Vector3());
  ground.position.y = box.min.y + 0.005;
  const vHalf = THREE.MathUtils.degToRad(camera.fov) / 2;
  const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
  const dist = Math.max((size.y / 2) / Math.tan(vHalf), (size.x / 2) / Math.tan(hHalf)) * margin + size.z / 2;
  camera.position.set(ctr.x, ctr.y + dist * 0.2, ctr.z + dist);
  camera.lookAt(ctr.x, ctr.y - size.y * 0.04, ctr.z);
  renderer.render(scene, camera);
  const b64 = canvas.toDataURL('image/png').split(',')[1];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
  scene.remove(root);
  root.traverse(m => m.geometry && m.geometry.dispose());
  mats.forEach(m => m.dispose());
  return url;
}

export function createViewer(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9694, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(3.2, 5.2, 4.4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -4; key.shadow.camera.right = 4;
  key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.55); fill.position.set(-4, 1.6, 2.4); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9); rim.position.set(-1.2, 2.4, -4.2); scene.add(rim);

  const leather = new THREE.MeshStandardMaterial({ color: 0x2d2b2b, roughness: 0.62, metalness: 0.06 });
  const accentLeather = new THREE.MeshStandardMaterial({ color: 0x2d2b2b, roughness: 0.52, metalness: 0.06 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: 0.3, metalness: 0.95 });

  const pivot = new THREE.Group();
  scene.add(pivot);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.ShadowMaterial({ opacity: opts.shadow === false ? 0 : 0.17 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  let bag = null, spec = null;
  const rot = { x: 0.1, y: -0.62 };
  const target = { x: 0.1, y: -0.62 };
  let zoom = 1, zoomTarget = 1;
  let autorotate = opts.autorotate !== false;
  let dragging = false, last = null, alive = true;

  const VIEWS = { front: { x: 0.02, y: 0 }, three: { x: 0.12, y: -0.62 }, side: { x: 0.06, y: -1.5 }, top: { x: 0.85, y: -0.35 }, back: { x: 0.05, y: -Math.PI } };

  function frame() {
    if (!spec) return;
    const vHalf = THREE.MathUtils.degToRad(camera.fov) / 2;
    const hHalf = Math.atan(Math.tan(vHalf) * Math.max(camera.aspect, 0.2));
    const halfH = spec.h * 0.86 + 0.3;
    const halfW = Math.max(spec.w, spec.d) * 0.62 + 0.22;
    const dist = Math.max(halfH / Math.tan(vHalf), halfW / Math.tan(hHalf)) + spec.d;
    camera.position.set(0, spec.h * 0.14, dist * zoom);
    camera.lookAt(0, 0, 0);
  }

  function setConfig(nextSpec, colors) {
    leather.color.set(colors.leather);
    accentLeather.color.set(colors.accent || colors.leather);
    metal.color.set(colors.metal);
    metal.roughness = colors.metalRough ?? 0.3;
    const key2 = JSON.stringify(nextSpec);
    if (!bag || key2 !== JSON.stringify(spec)) {
      if (bag) { pivot.remove(bag); bag.traverse(o => o.geometry && o.geometry.dispose()); }
      spec = nextSpec;
      bag = buildBag(spec, leather, accentLeather, metal);
      pivot.add(bag);
      ground.position.y = -spec.h / 2 - 0.06;
      frame();
    }
  }

  function setView(name) {
    const v = VIEWS[name] || VIEWS.three;
    target.x = v.x; target.y = v.y;
  }
  function setAutorotate(on) { autorotate = on; }
  function setZoom(z) { zoomTarget = z; }

  const onDown = e => { dragging = true; last = [e.clientX, e.clientY]; canvas.style.cursor = 'grabbing'; canvas.setPointerCapture?.(e.pointerId); };
  const onMove = e => {
    if (!dragging) return;
    target.y += (e.clientX - last[0]) * 0.009;
    target.x = Math.max(-0.55, Math.min(1.15, target.x + (e.clientY - last[1]) * 0.006));
    last = [e.clientX, e.clientY];
  };
  const onUp = () => { dragging = false; last = null; canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onUp);

  let w0 = 0, h0 = 0;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h || (w === w0 && h === h0)) return;
    w0 = w; h0 = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    frame();
  }

  function loop() {
    if (!alive) return;
    resize();
    if (autorotate && !dragging) target.y += 0.0035;
    rot.x += (target.x - rot.x) * 0.1;
    rot.y += (target.y - rot.y) * 0.1;
    pivot.rotation.set(rot.x, rot.y, 0);
    if (Math.abs(zoomTarget - zoom) > 0.002) { zoom += (zoomTarget - zoom) * 0.12; frame(); }
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return {
    setConfig, setView, setAutorotate, setZoom,
    dispose() {
      alive = false;
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      renderer.dispose();
    }
  };
}
