// DRIFTWOOD HOME — everything you see: the island and the sea, the sky through the day, trees and rocks, what Josh
// builds, Josh himself, crabs, fish, the shark, the ship, rain, the intro boat and the home at the end.
import * as THREE from 'three';
import { heightAt, R, SEA_FLOOR, SPRING, HILL } from './world.js';

const tcache = new Map();
export function ctex(key, w, h, draw) {
  if (tcache.has(key)) return tcache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; tcache.set(key, t); return t;
}
const mcache = new Map();
export function mat(c, o = {}) { const k = c + JSON.stringify(o); if (!mcache.has(k)) mcache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o })); return mcache.get(k); }
export function box(w, h, d, c, x = 0, y = 0, z = 0) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; return b; }
const cyl = (r1, r2, h, c, seg = 8) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat(c)); m.castShadow = true; return m; };
const ball = (r, c, seg = 10) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(c, { flatShading: true })); m.castShadow = true; return m; };

// ---------------------------------------------------------------- the island and the sea
export function buildIsland(scene) {
  const g = new THREE.Group(), size = R * 3.4, seg = 220, geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  const SAND = new THREE.Color('#f0dca8'), WETSAND = new THREE.Color('#d0b480'), GRASS = new THREE.Color('#6ab84a'), JUNGLE = new THREE.Color('#3a8a3a'), ROCK = new THREE.Color('#8a8478'), SEABED = new THREE.Color('#c8b888');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = heightAt(x, z); pos.setY(i, y);
    const slope = Math.abs(heightAt(x + 1, z) - y) + Math.abs(heightAt(x, z + 1) - y);
    if (y < 0.1) c.copy(SEABED).lerp(WETSAND, Math.max(0, (y + 2) / 2.1));
    else if (y < 1.5) c.copy(SAND);
    else if (y < 4) c.copy(SAND).lerp(GRASS, (y - 1.5) / 2.5);
    else c.copy(GRASS).lerp(JUNGLE, Math.min(1, (y - 4) / 4));
    if (slope > 1.3 && y > 3) c.lerp(ROCK, Math.min(1, (slope - 1.3) * 0.8));
    c.offsetHSL(0, 0, (Math.sin(x * 0.9) * Math.cos(z * 0.7)) * 0.03);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); land.receiveShadow = true; g.add(land);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), mat('#2a6a8a')); floor.rotation.x = -Math.PI / 2; floor.position.y = SEA_FLOOR + 0.05; g.add(floor);
  const waves = ctex('waves', 256, 256, (gg, w) => { const img = gg.createImageData(w, w); for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) { const v = 128 + 50 * Math.sin(x / w * Math.PI * 8 + Math.sin(y / w * Math.PI * 4) * 2) + 30 * Math.sin(y / w * Math.PI * 10); const k = (y * w + x) * 4; img.data[k] = v; img.data[k + 1] = 128 + 40 * Math.cos(y / w * Math.PI * 6); img.data[k + 2] = 255; img.data[k + 3] = 255; } gg.putImageData(img, 0, 0); });
  waves.repeat.set(140, 140); waves.colorSpace = THREE.NoColorSpace;
  const seaMat = new THREE.MeshStandardMaterial({ color: '#2a9ad8', roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.82, normalMap: waves, normalScale: new THREE.Vector2(0.35, 0.35) });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), seaMat); sea.rotation.x = -Math.PI / 2; g.add(sea);
  // the spring: a little pool ringed with stones
  const pool = new THREE.Mesh(new THREE.CircleGeometry(SPRING.r, 24), new THREE.MeshStandardMaterial({ color: '#4ac0f0', roughness: 0.1, transparent: true, opacity: 0.85 })); pool.rotation.x = -Math.PI / 2; pool.position.set(SPRING.x, heightAt(SPRING.x, SPRING.z) + 0.25, SPRING.z); g.add(pool);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, x = SPRING.x + Math.cos(a) * (SPRING.r + 0.3), z = SPRING.z + Math.sin(a) * (SPRING.r + 0.3), s = ball(0.4 + (i % 3) * 0.12, '#9a948a'); s.position.set(x, heightAt(x, z) + 0.1, z); g.add(s); }
  scene.add(g);
  return { group: g, sea, seaMat, waves };
}

// ---------------------------------------------------------------- the things on the island
export function thingMesh(o) {
  const g = new THREE.Group(), s = o.s || 1; g.position.set(o.x, o.y - 0.05, o.z); g.rotation.y = (o.x * 13.1 + o.z * 7.3) % 6.28;
  const u = {};
  switch (o.kind) {
    case 'palm': {
      // a leaning trunk in segments, a crown of fronds, coconuts under it
      const lean = 0.25 + (o.id % 5) * 0.05; let px = 0, py = 0;
      for (let i = 0; i < 6; i++) { const seg = cyl(0.22 - i * 0.015, 0.26 - i * 0.015, 1.1, '#a8865a', 7); seg.position.set(px, py + 0.55, 0); seg.rotation.z = -lean * 0.5; g.add(seg); px += Math.sin(lean) * 0.35; py += 1.05; }
      const crown = new THREE.Group(); crown.position.set(px, py, 0);
      for (let i = 0; i < 7; i++) { const f = box(0.5, 0.06, 2.6, '#3aa83a'); f.position.set(0, 0, 1.2); const p = new THREE.Group(); p.add(f); p.rotation.y = i / 7 * Math.PI * 2; p.rotation.x = 0.35; crown.add(p); }
      u.nuts = []; for (let i = 0; i < 2; i++) { const n = ball(0.2, '#6a4a22'); n.position.set(Math.cos(i * 2.5) * 0.3, -0.35, Math.sin(i * 2.5) * 0.3); crown.add(n); u.nuts.push(n); }
      g.add(crown); g.scale.setScalar(s); u.top = crown; break;
    }
    case 'tree': {
      const trunk = cyl(0.3, 0.45, 4.5, '#6a4a2a', 7); trunk.position.y = 2.25; g.add(trunk);
      for (const [x, y, z, r] of [[0, 5, 0, 2.2], [1.2, 4.3, 0.4, 1.5], [-1, 4.5, -0.6, 1.6], [0.2, 6, -0.3, 1.4]]) { const b = ball(r, ['#2a7a2a', '#3a8a34', '#2a6a2a'][Math.abs(Math.round(x * 3)) % 3]); b.position.set(x, y, z); g.add(b); }
      g.scale.setScalar(s); break;
    }
    case 'banana': {
      const stem = cyl(0.15, 0.2, 2.2, '#7aa83a', 6); stem.position.y = 1.1; g.add(stem);
      for (let i = 0; i < 5; i++) { const l = box(0.7, 0.05, 2, '#5ac83a'); const p = new THREE.Group(); l.position.z = 0.9; p.add(l); p.position.y = 2.1; p.rotation.y = i / 5 * 6.28; p.rotation.x = 0.5; g.add(p); }
      u.fruit = new THREE.Group(); for (let i = 0; i < 4; i++) { const b = box(0.12, 0.4, 0.12, '#f0d030', Math.cos(i) * 0.18, 1.6, Math.sin(i) * 0.18); b.rotation.z = 0.4; u.fruit.add(b); } g.add(u.fruit); break;
    }
    case 'berry': {
      const bush = ball(0.8, '#2a7a3a'); bush.position.y = 0.6; bush.scale.set(1.2, 0.8, 1.2); g.add(bush);
      u.fruit = new THREE.Group(); for (let i = 0; i < 9; i++) { const b = ball(0.09, '#3a4ad8'); const a = i * 2.4; b.position.set(Math.cos(a) * 0.85, 0.5 + (i % 3) * 0.2, Math.sin(a) * 0.85); u.fruit.add(b); } g.add(u.fruit); break;
    }
    case 'grass': { for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.9 + (i % 3) * 0.3, 4), mat('#8ac85a')); b.position.set(Math.cos(i * 2.1) * 0.35, 0.45, Math.sin(i * 2.1) * 0.35); b.rotation.z = Math.sin(i) * 0.3; g.add(b); } u.fruit = g; break; }
    case 'branches': { u.fruit = new THREE.Group(); for (let i = 0; i < 3; i++) { const b = cyl(0.05, 0.06, 1.4, '#8a6a3a', 5); b.rotation.z = Math.PI / 2; b.rotation.y = i * 1.2; b.position.y = 0.08 + i * 0.05; u.fruit.add(b); } g.add(u.fruit); break; }
    case 'rock': { const r = ball(0.45 * s, '#9a948a'); r.position.y = 0.2; r.scale.y = 0.7; g.add(r); u.fruit = g; break; }
    case 'flint': { const r = ball(0.7, '#3a3a48'); r.position.y = 0.35; r.scale.set(1, 0.8, 1.2); g.add(r); const shard = ball(0.18, '#5a6a8a'); shard.position.set(0.5, 0.2, 0.2); g.add(shard); u.fruit = shard; break; }
    case 'wreck': {
      // the upturned boat: hull up, keel to the sky, half in the surf
      const hull = new THREE.Group(); const body = box(2.6, 1, 6.5, '#f0f0f0'); body.position.y = 0.5; const stripe = box(2.65, 0.25, 6.55, '#2a5aa8'); stripe.position.y = 0.2; const keel = box(0.2, 0.5, 6, '#c84a3a'); keel.position.y = 1.2; const bow = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.4, 4), mat('#f0f0f0')); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.position.set(0, 0.5, 4.4); bow.scale.set(1, 1, 0.5);
      hull.add(body, stripe, keel, bow); hull.rotation.z = 0.15; hull.rotation.y = 0.8; g.add(hull);
      const mast = cyl(0.08, 0.08, 5, '#c8c8c8'); mast.rotation.z = Math.PI / 2 - 0.1; mast.position.set(-2, 0.2, 1); g.add(mast); break;
    }
    default: break;
  }
  g.userData = u; g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}
// show how much is left: coconuts, bananas, berries; a stump when cut down
export function showStock(m, o, stock, felled) {
  const u = m.userData;
  if (felled) { m.visible = o.kind !== 'palm' && o.kind !== 'tree' ? m.visible : false; return; }
  m.visible = true;
  if (u.nuts) u.nuts.forEach((n, i) => { n.visible = i < stock; });
  else if (u.fruit && o.kind !== 'grass' && o.kind !== 'rock' && o.kind !== 'branches') u.fruit.visible = stock > 0;
  else if (u.fruit) u.fruit.visible = stock > 0;
}
export function stumpMesh(o) { const g = new THREE.Group(); const s = cyl(0.35, 0.45, 0.5, '#7a5a3a', 8); s.position.y = 0.25; const top = new THREE.Mesh(new THREE.CircleGeometry(0.34, 12), mat('#d8b080')); top.rotation.x = -Math.PI / 2; top.position.y = 0.51; g.add(s, top); g.position.set(o.x, o.y, o.z); return g; }
export function crateMesh() { const g = new THREE.Group(); g.add(box(0.9, 0.7, 0.9, '#a87a40', 0, 0.35, 0)); for (const y of [0.15, 0.55]) g.add(box(0.94, 0.08, 0.94, '#6a4a22', 0, y, 0)); const lid = box(0.95, 0.1, 0.95, '#b88a50', 0, 0.75, 0); g.add(lid); g.userData.lid = lid; return g; }

// ---------------------------------------------------------------- what Josh builds
function flame() { const g = new THREE.Group(); for (const [s, c, y] of [[0.5, '#ffd040', 0.35], [0.36, '#ff7a20', 0.55], [0.22, '#ff4a10', 0.75]]) { const f = new THREE.Mesh(new THREE.ConeGeometry(s, s * 2.2, 7), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 })); f.position.y = y; g.add(f); } return g; }
export function builtMesh(b) {
  const g = new THREE.Group(), u = {}; g.position.set(b.x, heightAt(b.x, b.z), b.z);
  if (b.type === 'fire') {
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28, s = ball(0.2, '#8a8478'); s.position.set(Math.cos(a) * 0.65, 0.1, Math.sin(a) * 0.65); g.add(s); }
    for (let i = 0; i < 4; i++) { const l = cyl(0.08, 0.1, 1, '#6a4a2a', 5); l.rotation.z = Math.PI / 2 - 0.5; l.rotation.y = i * 1.57; l.position.y = 0.25; g.add(l); }
    u.flame = flame(); g.add(u.flame); u.light = new THREE.PointLight('#ff9a40', 0, 16, 1.6); u.light.position.y = 1.2; g.add(u.light);
  } else if (b.type === 'collector') {
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) { const p = cyl(0.05, 0.05, 1, '#8a6a3a', 5); p.position.set(x, 0.5, z); g.add(p); }
    const basin = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.5, 4, 1, true), mat('#4ab83a', { side: THREE.DoubleSide })); basin.rotation.x = Math.PI; basin.rotation.y = Math.PI / 4; basin.position.y = 1.05; g.add(basin);
    u.water = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), mat('#4ac0f0')); u.water.rotation.x = -Math.PI / 2; u.water.position.y = 0.9; g.add(u.water);
  } else if (b.type === 'shelter') {
    // a lean-to: two posts, a ridge pole, and a roof of palm leaves sloping to the ground
    for (const x of [-1.4, 1.4]) { const p = cyl(0.08, 0.1, 2.2, '#7a5a2a', 5); p.position.set(x, 1.1, -0.9); g.add(p); }
    const ridge = cyl(0.07, 0.07, 3, '#7a5a2a', 5); ridge.rotation.z = Math.PI / 2; ridge.position.set(0, 2.15, -0.9); g.add(ridge);
    const roof = box(3.2, 0.1, 2.6, '#4aa83a'); roof.position.set(0, 1.1, 0.1); roof.rotation.x = 0.95; g.add(roof);
    for (let i = 0; i < 7; i++) { const l = box(0.45, 0.06, 2.6, i % 2 ? '#3a9a3a' : '#5ab84a'); l.position.set(-1.35 + i * 0.45, 1.16, 0.12); l.rotation.x = 0.95; g.add(l); }
    const bed = box(1.6, 0.12, 1, '#8ac85a'); bed.position.set(0, 0.08, -0.4); g.add(bed);
  } else if (b.type === 'signal') {
    // a tall pyre of logs and leaves
    for (let i = 0; i < 8; i++) { const l = cyl(0.12, 0.14, 2.8, '#6a4a2a', 5); const a = i / 8 * 6.28; l.position.set(Math.cos(a) * 0.5, 1.2, Math.sin(a) * 0.5); l.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); g.add(l); }
    const leaves = ball(0.7, '#4a8a3a'); leaves.position.y = 1; g.add(leaves);
    u.flame = flame(); u.flame.scale.setScalar(2.6); u.flame.position.y = 0.6; g.add(u.flame); u.light = new THREE.PointLight('#ff8a30', 0, 40, 1.4); u.light.position.y = 3; g.add(u.light);
  }
  g.traverse((m) => { if (m.isMesh && !(m.material && m.material.isMeshBasicMaterial)) { m.castShadow = true; m.receiveShadow = true; } });
  g.userData = u; return g;
}
export function raftMesh() {
  const g = new THREE.Group(), u = {};
  for (let i = 0; i < 7; i++) { const l = cyl(0.22, 0.22, 4, '#8a6a3a', 7); l.rotation.x = Math.PI / 2; l.position.set(-1.3 + i * 0.43, 0.2, 0); g.add(l); }
  for (const z of [-1.4, 1.4]) { const c = box(3.2, 0.12, 0.2, '#5a3a1a', 0, 0.45, z); g.add(c); }
  u.sail = new THREE.Group(); const mast = cyl(0.07, 0.07, 3.4, '#6a4a2a', 5); mast.position.y = 2; const sail = box(0.04, 2.2, 1.8, '#3a7ac8'); sail.position.set(0.05, 2.4, 0.3); u.sail.add(mast, sail); g.add(u.sail);
  u.oar = new THREE.Group(); const shaft = cyl(0.04, 0.04, 2.4, '#8a6a3a', 5); shaft.rotation.z = 1.2; shaft.position.set(1.4, 0.7, -0.8); const blade = box(0.1, 0.5, 0.25, '#8a6a3a', 2.4, 0.25, -0.8); u.oar.add(shaft, blade); g.add(u.oar);
  g.userData = u; return g;
}

// ---------------------------------------------------------------- Josh, his family, animals
const faceTex = () => ctex('face', 64, 64, (c) => { c.clearRect(0, 0, 64, 64); c.fillStyle = '#1a1a1a'; c.fillRect(17, 22, 7, 9); c.fillRect(40, 22, 7, 9); c.lineWidth = 4; c.strokeStyle = '#1a1a1a'; c.beginPath(); c.arc(32, 38, 9, 0.3, Math.PI - 0.3); c.stroke(); });
// a blocky person: { shirt, pants, skin, hair, scale }
export function makePerson(o = {}) {
  const { shirt = '#3a7ac8', pants = '#3a3a4a', skin = '#f0c8a0', hair = '#5a3a1a', scale = 0.8, dress } = o;
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  inner.add(box(0.62, 0.62, 0.62, skin, 0, 1.62, 0), box(0.9, 0.8, 0.46, shirt, 0, 0.98, 0), box(0.66, 0.18, 0.66, hair, 0, 1.98, 0), box(0.66, 0.4, 0.12, hair, 0, 1.78, -0.28));
  if (dress) inner.add(box(1, 0.5, 0.56, shirt, 0, 0.5, 0));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: faceTex(), transparent: true })); face.position.set(0, 1.6, 0.315); inner.add(face);
  const pivot = (x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); inner.add(p); return p; };
  const la = pivot(-0.6, 1.34), ra = pivot(0.6, 1.34), ll = pivot(-0.22, 0.58), rl = pivot(0.22, 0.58);
  la.add(box(0.3, 0.8, 0.4, shirt, 0, -0.35, 0)); ra.add(box(0.3, 0.8, 0.4, shirt, 0, -0.35, 0)); ll.add(box(0.4, 0.6, 0.44, pants, 0, -0.28, 0)); rl.add(box(0.4, 0.6, 0.44, pants, 0, -0.28, 0));
  const hand = new THREE.Group(); hand.position.set(0, -0.72, 0.1); ra.add(hand);
  inner.scale.setScalar(scale);
  g.userData = { la, ra, ll, rl, hand, phase: 0, inner };
  return g;
}
export function posePerson(ch, dt, st) {
  const u = ch.userData;
  u.inner.rotation.set(0, 0, 0); u.inner.position.y = 0;
  if (st.lie) { u.inner.rotation.x = -Math.PI / 2; u.inner.position.y = 0.3; return; }
  if (st.swim) { u.phase += dt * 6; const s = Math.sin(u.phase); u.la.rotation.x = -2.8 + s; u.ra.rotation.x = -2.8 - s; u.ll.rotation.x = s * 0.5; u.rl.rotation.x = -s * 0.5; u.inner.rotation.x = 1.1; u.inner.position.y = 0.2; return; }
  if (st.sit) { u.ll.rotation.x = u.rl.rotation.x = -1.4; u.la.rotation.x = u.ra.rotation.x = -0.3; u.inner.position.y = -0.4; return; }
  if (st.air) { u.la.rotation.x = -2.4; u.ra.rotation.x = -2.4; u.ll.rotation.x = 0.5; u.rl.rotation.x = -0.4; }
  else { u.phase += dt * Math.max(2, st.speed * 1.4); const s = Math.sin(u.phase) * Math.min(1, st.speed / 4); u.la.rotation.x = s; u.ra.rotation.x = -s; u.ll.rotation.x = -s; u.rl.rotation.x = s; }
  if (st.wave) { u.ra.rotation.x = -2.8 + Math.sin(st.t * 10) * 0.3; }
  if (st.work > 0) { const k = st.work; u.ra.rotation.x = -2.4 + (1 - k) * 2.8; }
}
export function toolMesh(id) {
  const g = new THREE.Group();
  if (id === 'axe') { const h = cyl(0.04, 0.04, 0.8, '#8a6a3a', 5); h.rotation.x = Math.PI / 2; h.position.z = 0.3; const head = box(0.08, 0.3, 0.2, '#8a8478', 0, 0.05, 0.62); g.add(h, head); }
  else if (id === 'spear') { const h = cyl(0.03, 0.03, 1.8, '#8a6a3a', 5); h.rotation.x = Math.PI / 2; h.position.z = 0.6; const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 5), mat('#8a8478')); tip.rotation.x = Math.PI / 2; tip.position.z = 1.6; g.add(h, tip); }
  else if (id === 'knife') { const b = box(0.06, 0.04, 0.4, '#6a6a72', 0, 0, 0.25); const h = box(0.08, 0.08, 0.16, '#8a6a3a', 0, 0, 0); g.add(b, h); }
  else if (id === 'torch') { const h = cyl(0.04, 0.05, 0.7, '#6a4a2a', 5); h.rotation.x = -0.3; h.position.set(0, 0.2, 0.15); const f = flame(); f.scale.setScalar(0.45); f.position.set(0, 0.45, 0.25); const l = new THREE.PointLight('#ffaa50', 1.4, 10, 1.5); l.position.set(0, 0.7, 0.3); g.add(h, f, l); g.userData.flame = f; }
  return g;
}
export function crabMesh() { const g = new THREE.Group(); const b = ball(0.25, '#e8502a'); b.scale.set(1.3, 0.55, 1); b.position.y = 0.15; g.add(b); for (const s of [-1, 1]) { g.add(box(0.2, 0.08, 0.08, '#e8502a', s * 0.35, 0.15, 0.2)); for (let i = 0; i < 3; i++) g.add(box(0.25, 0.04, 0.04, '#c84020', s * 0.32, 0.06, -0.12 + i * 0.1)); } g.add(box(0.05, 0.08, 0.05, '#1a1a1a', -0.08, 0.3, 0.18), box(0.05, 0.08, 0.05, '#1a1a1a', 0.08, 0.3, 0.18)); return g; }
export function fishMesh(i) { const g = new THREE.Group(); const b = ball(0.25, ['#f0a030', '#4ac0f0', '#f05a8a'][i % 3]); b.scale.set(0.5, 0.7, 1.4); g.add(b); const t = box(0.04, 0.3, 0.25, '#f0f0f0', 0, 0, -0.4); g.add(t); return g; }
export function sharkFin() { const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 3), mat('#5a6a7a')); f.scale.z = 0.25; f.position.y = 0.4; const g = new THREE.Group(); g.add(f); return g; }
export function dogMesh() { const g = new THREE.Group(); g.add(box(0.5, 0.4, 0.9, '#c8904a', 0, 0.45, 0), box(0.4, 0.38, 0.4, '#c8904a', 0, 0.75, 0.55), box(0.12, 0.2, 0.08, '#8a5a2a', -0.14, 0.98, 0.5), box(0.12, 0.2, 0.08, '#8a5a2a', 0.14, 0.98, 0.5), box(0.1, 0.08, 0.1, '#1a1a1a', 0, 0.72, 0.78)); for (const [x, z] of [[-0.17, 0.3], [0.17, 0.3], [-0.17, -0.3], [0.17, -0.3]]) g.add(box(0.12, 0.3, 0.12, '#c8904a', x, 0.15, z)); const tail = box(0.08, 0.08, 0.4, '#c8904a', 0, 0.65, -0.6); tail.rotation.x = 0.6; g.add(tail); g.userData.tail = tail; return g; }
// ---------------------------------------------------------------- the ship, the intro boat, home
export function shipMesh() {
  const g = new THREE.Group();
  const hull = box(10, 3, 40, '#2a2a3a', 0, 1.5, 0); const deck = box(9.6, 0.4, 38, '#c8c8c8', 0, 3.2, 0); const bridge = box(8, 5, 8, '#f0f0f0', 0, 5.5, -12); const funnel = cyl(1.2, 1.4, 5, '#d83a3a', 10); funnel.position.set(0, 9, -12); const stripe = box(10.1, 0.6, 40.1, '#d83a3a', 0, 2.4, 0);
  g.add(hull, deck, bridge, funnel, stripe); return g;
}
export function sailboat() {
  const g = new THREE.Group(); const hull = box(2.4, 1, 6, '#f0f0f0', 0, 0.4, 0); const stripe = box(2.45, 0.25, 6.05, '#2a5aa8', 0, 0.2, 0); const deck = box(2.2, 0.1, 5.6, '#c89a60', 0, 0.95, 0);
  const mast = cyl(0.08, 0.08, 6, '#c8c8c8'); mast.position.set(0, 4, 0.5); const sail = box(0.04, 4.5, 2.6, '#f8f8f0', 0.05, 4.2, -0.6);
  const cabin = box(1.6, 0.8, 1.8, '#f0f0f0', 0, 1.35, -1.6);
  g.add(hull, stripe, deck, mast, sail, cabin); return g;
}
export function homeScene() {
  const g = new THREE.Group(), u = {};
  const floor = box(12, 0.2, 10, '#a8784a', 0, -0.1, 0); const rug = box(5, 0.04, 3.4, '#c84a3a', 0, 0.02, 0.5);
  const back = box(12, 6, 0.3, '#f0e0c0', 0, 3, -5), left = box(0.3, 6, 10, '#e8d8b8', -6, 3, 0), right = box(0.3, 6, 10, '#e8d8b8', 6, 3, 0);
  const fp = box(3, 3, 1, '#8a5a4a', 0, 1.5, -4.4), hearth = box(1.8, 1.4, 0.6, '#1a1210', 0, 0.8, -3.95), mantel = box(3.4, 0.2, 1.2, '#6a4a2a', 0, 3.05, -4.3);
  const fire = flame(); fire.position.set(0, 0.2, -3.9); fire.scale.setScalar(0.9); u.flame = fire;
  const light = new THREE.PointLight('#ffa050', 3, 20, 1.2); light.position.set(0, 1.5, -3); u.light = light;
  const sofa = box(3.4, 0.8, 1.2, '#4a6a9a', -2.5, 0.4, 1.8), sofaBack = box(3.4, 1.2, 0.3, '#4a6a9a', -2.5, 0.9, 2.4);
  const win = box(2.4, 1.8, 0.1, '#1a2a5a', 3.5, 3.2, -4.8), frame = box(2.6, 0.1, 0.12, '#f0f0f0', 3.5, 3.2, -4.75);
  const lamp = box(0.3, 1.4, 0.3, '#f0d080', 4.6, 0.7, 2);
  g.add(floor, rug, back, left, right, fp, hearth, mantel, fire, light, sofa, sofaBack, win, frame, lamp);
  g.userData = u; return g;
}
// rain: falling streaks around the camera
export function makeRain() {
  const n = 1400, pos = new Float32Array(n * 6);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#c8d8f0', transparent: true, opacity: 0.45 }));
  lines.frustumCulled = false; lines.userData = { n, seeds: Array.from({ length: n }, () => [Math.random() * 60 - 30, Math.random() * 30, Math.random() * 60 - 30]) };
  return lines;
}
export function stepRain(r, dt, cx, cy, cz, heavy) {
  const { n, seeds } = r.userData, p = r.geometry.attributes.position.array, sp = heavy ? 34 : 24;
  for (let i = 0; i < n; i++) { const s = seeds[i]; s[1] -= sp * dt; if (s[1] < -4) s[1] += 30; const x = cx + s[0], y = cy + s[1], z = cz + s[2]; p[i * 6] = x; p[i * 6 + 1] = y; p[i * 6 + 2] = z; p[i * 6 + 3] = x + 0.15; p[i * 6 + 4] = y - (heavy ? 1.2 : 0.8); p[i * 6 + 5] = z; }
  r.geometry.attributes.position.needsUpdate = true;
}
export function smokePuff() { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshBasicMaterial({ color: '#d8d8d8', transparent: true, opacity: 0.5, depthWrite: false })); return m; }
export { HILL };
