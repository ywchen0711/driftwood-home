// DRIFTWOOD HOME — the page: the stormy night and the capsize, life on the island (walking, swimming, gathering,
// crafting, building, day and night), the HUD and panels, and the way home.
import * as THREE from 'three';
import { ITEMS, RECIPES, SECONDS_PER_HOUR, NIGHT, JOURNAL, ENDINGS, VOYAGE, newState } from './data.js';
import { heightAt, R, SPRING, HILL, START, WRECK } from './world.js';
import { newGame, tick, gather, craft, canCraft, light, feed, cook, consume, stockOf, isFelled, cratesFor, openCrate, sleep, faint, voyageMissing, setSail, firesNear, count, day, hour, rainAt, shipNow, catchAnimal, fireFlare, collectRain, recipe } from './survive.js';
import { buildIsland, thingMesh, showStock, stumpMesh, crateMesh, builtMesh, raftMesh, makePerson, posePerson, toolMesh, crabMesh, fishMesh, sharkFin, dogMesh, shipMesh, sailboat, homeScene, makeRain, stepRain, smokePuff, box } from './scene.js';
import { Sound } from './audio.js';

const $ = (id) => document.getElementById(id);
// ---------------------------------------------------------------- language
const q = new URLSearchParams(location.search);
let lang = q.get('lang') || (() => { try { return localStorage.getItem('driftwood.lang'); } catch (e) { return null; } })() || ((navigator.language || '').startsWith('zh') ? 'zh' : 'en');
if (lang !== 'en') lang = 'zh';
const EN = () => lang === 'en';
const L = (zh, en) => (EN() ? en : zh);
const N = (pair) => pair[EN() ? 1 : 0];
const iname = (id) => (ITEMS[id] ? N(ITEMS[id].name) : id);

// ---------------------------------------------------------------- the save
const KEY = 'driftwood.save';
const loaded = (() => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.S && s.S.v === 1 && !s.S.ending) return s; } catch (e) { /* none */ } return null; })();
let G = newGame(loaded ? loaded.S : null), S = G.S, W = G.W;
const P = { x: loaded ? loaded.x : START.x, z: loaded ? loaded.z : START.z, y: 0, vx: 0, vy: 0, vz: 0, face: 0, grounded: true, swim: false };
P.y = Math.max(heightAt(P.x, P.z), -0.75);
const store = () => { if (S.ending) return; try { localStorage.setItem(KEY, JSON.stringify({ S, x: P.x, z: P.z })); } catch (e) { /* private mode */ } };

// ---------------------------------------------------------------- renderer, light, sky
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace;
const LOWFX = q.get('fx') === 'low';
renderer.shadowMap.enabled = !LOWFX; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1600);
scene.fog = new THREE.Fog('#bfe0f8', 80, 420);
const hemi = new THREE.HemisphereLight('#ffffff', '#6a7a5a', 0.9); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4dc', 1.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 220 }); sun.shadow.bias = -0.0008; scene.add(sun, sun.target);
const moon = new THREE.DirectionalLight('#8aa8ff', 0); scene.add(moon);
const stars = (() => { const n = 900, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * 1.2 + 0.1, r = 900; p[i * 3] = Math.cos(a) * Math.cos(e) * r; p[i * 3 + 1] = Math.sin(e) * r; p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false })); })();
scene.add(stars);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const sound = new Sound();

// ---------------------------------------------------------------- the world\'s meshes
const ISL = buildIsland(scene);
const thingMeshes = new Map(), stumps = new Map();
for (const o of W.things) { if (o.kind === 'spring') continue; const m = thingMesh(o); scene.add(m); thingMeshes.set(o.id, m); if (o.kind === 'palm' || o.kind === 'tree') { const s = stumpMesh(o); s.visible = false; scene.add(s); stumps.set(o.id, s); } }
const builtMeshes = new Map();
let raft3d = null;
function syncBuilt() {
  for (const b of S.built) if (!builtMeshes.has(b)) { const m = builtMesh(b); scene.add(m); builtMeshes.set(b, m); }
  for (const [b, m] of builtMeshes) if (!S.built.includes(b)) { scene.remove(m); builtMeshes.delete(b); }
  if (S.raft && !raft3d) { raft3d = raftMesh(); raft3d.position.set(S.raft.x, Math.max(heightAt(S.raft.x, S.raft.z), 0) + 0.05, S.raft.z); raft3d.rotation.y = Math.atan2(S.raft.x, S.raft.z); scene.add(raft3d); }
  if (raft3d) { raft3d.userData.sail.visible = !!S.raft.sail; raft3d.userData.oar.visible = !!S.raft.oar; }
}
// crates on the beach: today\'s, and any left from the last two days
const crateMeshes = new Map();
let crates = [];
function syncCrates() {
  const d = day(S); crates = [];
  for (let k = Math.max(1, d - 2); k <= d; k++) if (k < d || hour(S) >= 6 || k === 1) crates.push(...cratesFor(G, k).filter((c) => !c.open));
  for (const c of crates) if (!crateMeshes.has(c.id)) { const m = crateMesh(); m.position.set(c.x, heightAt(c.x, c.z), c.z); m.rotation.y = c.x; scene.add(m); crateMeshes.set(c.id, m); }
  for (const [id, m] of crateMeshes) if (!crates.some((c) => c.id === id)) { scene.remove(m); crateMeshes.delete(id); }
}
// crabs and fish
const crabs = W.crabs.map((c) => { const m = crabMesh(); scene.add(m); return { ...c, m, t: Math.random() * 5, a: Math.random() * 6, back: 0 }; });
const fishes = W.fishes.map((f, i) => { const m = fishMesh(i); scene.add(m); return { ...f, m, a: Math.random() * 6, r: 2 + Math.random() * 3, back: 0 }; });
const shark = sharkFin(); shark.visible = false; scene.add(shark); let sharkT = 0, sharkA = 0, biteCd = 0;
const ship = shipMesh(); ship.visible = false; scene.add(ship);
const rain = makeRain(); rain.visible = false; scene.add(rain);
const smokes = [];

// ---------------------------------------------------------------- Josh
const josh = makePerson({ shirt: '#3a7ac8', pants: '#4a4a5a', hair: '#5a3a1a' }); scene.add(josh);
let heldTool = null;
function holdTool() { const h = josh.userData.hand; if (heldTool) h.remove(heldTool); heldTool = S.hand ? toolMesh(S.hand) : null; if (heldTool) h.add(heldTool); }
holdTool();
const blob = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false })); blob.rotation.x = -Math.PI / 2; scene.add(blob);

// ---------------------------------------------------------------- input
const cam = { yaw: Math.PI * 0.25, pitch: 0.38, dist: 9 };
const keys = new Set(), act = new Set();
let dragging = false, lastX = 0, lastY = 0, mouseUse = false, dragMoved = 0;
const turnCam = (dx, dy, k) => { cam.yaw -= dx * k; cam.pitch = Math.max(-0.2, Math.min(1.25, cam.pitch + dy * k)); };
canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') return; sound.start(); dragging = true; dragMoved = 0; lastX = e.clientX; lastY = e.clientY; if (e.button === 0) mouseUse = true; });
addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch' && mouseUse && dragMoved < 6 && S_.mode === 'play' && !S_.panel) act.add('use'); dragging = false; mouseUse = false; });
addEventListener('pointermove', (e) => { if (!dragging) return; dragMoved += Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY); turnCam(e.clientX - lastX, e.clientY - lastY, 0.006); lastX = e.clientX; lastY = e.clientY; });
canvas.addEventListener('wheel', (e) => { cam.dist = Math.max(4, Math.min(22, cam.dist * (e.deltaY > 0 ? 1.1 : 0.9))); e.preventDefault(); }, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
const KEYMAP = { Space: 'jump', KeyE: 'act', KeyF: 'use', Tab: 'bag', KeyI: 'bag', KeyM: 'map', KeyJ: 'journal', KeyQ: 'quick', KeyZ: 'sleep', Escape: 'menu', Digit1: 'h0', Digit2: 'h1', Digit3: 'h2', Digit4: 'h3', Digit5: 'h4' };
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return; keys.add(e.code); sound.start();
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (S_.mode === 'title') { if (e.code === 'Enter' || e.code === 'Space') begin(); return; }
  if (S_.mode === 'intro') { skipIntro(); return; }
  if (S_.panel) { if (e.code === 'Escape' || (e.code === 'Tab' && S_.panel === 'bag') || (e.code === 'KeyM' && S_.panel === 'map') || (e.code === 'KeyJ' && S_.panel === 'journal')) closePanel(); else if (e.code === 'Enter' || e.code === 'Space') panelPress(); else if (e.code.startsWith('Arrow')) panelMove(e.code === 'ArrowDown' || e.code === 'ArrowRight' ? 1 : -1); return; }
  if (KEYMAP[e.code]) act.add(KEYMAP[e.code]);
});
addEventListener('keyup', (e) => keys.delete(e.code));
// touch: a stick on the left, drag on the right turns the camera, buttons for the rest
const touch = { id: null, ox: 0, oy: 0, x: 0, y: 0, camId: null, cx: 0, cy: 0 };
canvas.addEventListener('touchstart', (e) => { sound.start(); if (S_.mode === 'intro') skipIntro(); if (S_.mode === 'title') return; for (const t of e.changedTouches) { if (t.clientX < innerWidth * 0.42 && touch.id === null) { touch.id = t.identifier; touch.ox = t.clientX; touch.oy = t.clientY; touch.x = touch.y = 0; $('stick').style.left = (t.clientX - 60) + 'px'; $('stick').style.top = (t.clientY - 60) + 'px'; $('stick').hidden = false; } else if (touch.camId === null) { touch.camId = t.identifier; touch.cx = t.clientX; touch.cy = t.clientY; } } }, { passive: true });
canvas.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) { if (t.identifier === touch.id) { let dx = t.clientX - touch.ox, dy = t.clientY - touch.oy; const d = Math.hypot(dx, dy); if (d > 55) { dx *= 55 / d; dy *= 55 / d; } touch.x = dx / 55; touch.y = dy / 55; $('knob').style.transform = `translate(${dx}px,${dy}px)`; } if (t.identifier === touch.camId) { turnCam(t.clientX - touch.cx, t.clientY - touch.cy, 0.008); touch.cx = t.clientX; touch.cy = t.clientY; } } }, { passive: true });
const endTouch = (e) => { for (const t of e.changedTouches) { if (t.identifier === touch.id) { touch.id = null; touch.x = touch.y = 0; $('stick').hidden = true; $('knob').style.transform = ''; } if (t.identifier === touch.camId) touch.camId = null; } };
canvas.addEventListener('touchend', endTouch); canvas.addEventListener('touchcancel', endTouch);
for (const [id, a] of [['b-act', 'act'], ['b-use', 'use'], ['b-jump', 'jump'], ['b-bag', 'bag'], ['b-map', 'map'], ['b-menu', 'menu'], ['b-eat', 'quick'], ['b-sleep', 'sleep']]) $(id).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); sound.start(); if (S_.panel && (a === 'bag' || a === 'map' || a === 'menu')) closePanel(); else act.add(a); });
$('hotbar').addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-h]'); if (!b) return; e.preventDefault(); act.add('h' + b.dataset.h); });
// game controllers (standard mapping): left stick move · right stick camera · A jump · X act · B use tool · Y bag · LB/RB tools · LT sprint · Start menu · View map · R3 quick eat
const PAD = { ix: 0, iz: 0, sprint: false, prev: [], used: false, connected: false };
const DEAD = 0.18, dz = (v) => (Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD));
addEventListener('gamepadconnected', () => { PAD.connected = true; toast(L('已連接控制器', 'Controller connected')); });
function pollPad(dt) {
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean)[0] : null; PAD.ix = PAD.iz = 0; PAD.sprint = false; if (!gp) return;
  const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed), pr = (i) => b(i) && !PAD.prev[i];
  if (gp.buttons.some((x) => x.pressed)) { PAD.used = true; sound.start(); }
  if (S_.mode === 'title') { if (pr(0) || pr(9)) begin(); }
  else if (S_.mode === 'intro') { if (gp.buttons.some((x, i) => x.pressed && !PAD.prev[i])) skipIntro(); }
  else if (S_.panel) { if (pr(13) || pr(15)) panelMove(1); if (pr(12) || pr(14)) panelMove(-1); if (pr(0)) panelPress(); if (pr(1) || pr(9) && S_.panel === 'menu' || pr(3) && S_.panel === 'bag' || pr(8) && S_.panel === 'map') closePanel(); }
  else if (S_.mode === 'play') {
    PAD.ix = dz(gp.axes[0] || 0); PAD.iz = -dz(gp.axes[1] || 0); PAD.sprint = b(6) || b(10);
    turnCam(dz(gp.axes[2] || 0) * 2.6 * dt, dz(gp.axes[3] || 0) * 1.6 * dt, 1);
    const one = { 0: 'jump', 2: 'act', 1: 'use', 3: 'bag', 9: 'menu', 8: 'map', 11: 'quick', 12: 'sleep' };
    for (const [i, a] of Object.entries(one)) if (pr(+i)) act.add(a);
    if (pr(4)) act.add('hprev'); if (pr(5)) act.add('hnext');
  }
  PAD.prev = gp.buttons.map((x) => x.pressed);
}

// ---------------------------------------------------------------- panels (mouse, keyboard or controller)
let handlers = [], focus = 0;
const btn = (label, fn, o = {}) => { handlers.push(fn); return `<button data-i="${handlers.length - 1}" class="${o.cls || ''}"${o.off ? ' disabled' : ''}${o.title ? ` title="${o.title}"` : ''}>${label}</button>`; };
function showPanel(kind, title, build) {
  handlers = []; const html = build(); const keep = S_.panel === kind ? focus : 0;
  $('panel').innerHTML = `<div class="pbox ${kind}"><h2><span>${title}</span><button data-i="x" class="x" aria-label="close">✕</button></h2>${html}</div>`;
  $('panel').hidden = false; S_.panel = kind; focus = keep; markFocus();
}
function closePanel() { $('panel').hidden = true; $('panel').innerHTML = ''; S_.panel = null; }
const panelButtons = () => [...$('panel').querySelectorAll('button:not([disabled])')];
function markFocus() { const bs = panelButtons(); if (focus >= bs.length) focus = Math.max(0, bs.length - 1); bs.forEach((b, i) => b.classList.toggle('focus', (PAD.used || S_.kbnav) && i === focus)); }
function panelMove(d) { const n = panelButtons().length; if (!n) return; S_.kbnav = true; focus = (focus + d + n) % n; markFocus(); }
function panelPress() { const b = panelButtons()[focus]; if (b) b.click(); }
$('panel').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) { if (e.target === $('panel')) closePanel(); return; } sound.play('click'); if (b.dataset.i === 'x') closePanel(); else if (handlers[+b.dataset.i]) handlers[+b.dataset.i](); });

// ---------------------------------------------------------------- HUD bits
function toast(text) { const d = $('toast'); d.innerHTML = text; d.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => d.classList.remove('on'), 2600); }
function say(pair) { toast(N(pair)); }
function journalNote(key) { const d = $('note'); d.innerHTML = `<b>${L(`第 ${day(S)} 天`, `Day ${day(S)}`)}</b>${N(JOURNAL[key])}`; d.classList.remove('on'); void d.offsetWidth; d.classList.add('on'); sound.play('page'); }
const clock = () => { const h = hour(S), hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 10) * 10; return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };
const gotText = (got) => Object.entries(got).map(([k, n]) => `${ITEMS[k].icon} ${iname(k)} ×${n}`).join('　');
let hudT = 0;
function hud() {
  for (const [k, v] of [['hp', S.hp], ['hunger', S.hunger], ['thirst', S.thirst], ['energy', S.energy], ['warmth', S.warmth]]) { const e = $('s-' + k); e.style.width = Math.max(0, Math.min(100, v)) + '%'; e.parentElement.classList.toggle('low', v < 25); }
  const wx = rainAt(S), h = hour(S);
  $('when').innerHTML = `<b>${L(`第 ${day(S)} 天`, `Day ${day(S)}`)}</b> ${clock()} ${wx === 'storm' ? '⛈️' : wx ? '🌧️' : NIGHT(h) ? '🌙' : h < 8 || h > 17.5 ? '🌅' : '☀️'}`;
  $('hotbar').innerHTML = S.hot.map((id, i) => `<button data-h="${i}" class="${id && S.hand === id ? 'on' : ''}${id ? '' : ' empty'}"><small>${i + 1}</small>${id ? `<span>${ITEMS[id].icon}</span><em>${iname(id)}</em>` : ''}</button>`).join('');
  const n = near; $('prompt').hidden = !n; if (n) $('prompt').innerHTML = `<kbd>${PAD.used ? 'X' : matchMedia('(pointer: coarse)').matches ? '✋' : 'E'}</kbd> ${n.label}${n.use ? ` · <kbd>${PAD.used ? 'B' : 'F'}</kbd> ${n.use}` : ''}`;
  $('b-act').classList.toggle('on', !!n);
  $('status').textContent = S.sick > 0 ? L('肚子痛', 'Sick') : S.wet > 0.3 ? L('濕透了', 'Soaked') : S.warmth < 30 ? L('好冷', 'Freezing') : '';
}

// ---------------------------------------------------------------- the game state on this page
const S_ = { mode: 'title', panel: null, t: 0, work: 0, near: null, faintT: 0, introT: 0, endT: 0, ending: null, kbnav: false };
let near = null;
// what Josh can do right here: the nearest thing to gather, a crate, something he built, the spring
function findNear() {
  if (P.swim) { const f = fishes.find((f) => f.back <= S.time && Math.hypot(f.x - P.x, f.z - P.z) < 2.6); return f && S.hand === 'spear' ? { kind: 'fish', obj: f, label: L('游泳中', 'Swimming'), use: L('叉魚', 'Spear the fish') } : null; }
  const d = (o) => Math.hypot(o.x - P.x, o.z - P.z);
  let best = null, bd = 99;
  const consider = (kind, obj, r, label, use) => { const dd = d(obj); if (dd < r && dd < bd) { bd = dd; best = { kind, obj, label, use }; } };
  for (const c of crates) consider('crate', c, 1.9, L('打開漂流箱', 'Open the crate'));
  for (const b of S.built) consider('built', b, b.type === 'shelter' ? 2.6 : 2.1, N(recipe(b.type).name));
  if (S.raft) consider('raft', S.raft, 3.2, L('木筏', 'Raft'));
  consider('spring', { x: SPRING.x, z: SPRING.z }, SPRING.r + 1.3, count(S, 'bottle') ? L('把瓶子裝滿泉水', 'Fill bottles at the spring') : L('喝泉水', 'Drink from the spring'));
  for (const c of crabs) if (c.back <= S.time) consider('crab', c, 1.7, L('螃蟹', 'Crab'), S.hand === 'spear' || S.hand === 'knife' ? L('抓螃蟹', 'Catch it') : L('（拿刀或魚叉才抓得到）', '(needs a knife or spear)'));
  for (const o of W.things) {
    if (o.kind === 'spring' || isFelled(S, o)) continue;
    const r = o.kind === 'wreck' ? 3.6 : o.kind === 'tree' || o.kind === 'palm' ? 2.2 : 1.8; if (d(o) > r || d(o) >= bd) continue;
    const st = stockOf(S, o), axe = S.hand === 'axe';
    const L2 = { palm: axe ? L('砍倒棕櫚樹', 'Chop the palm') : st > 0 ? L('搖下椰子、摘葉子', 'Shake down a coconut, take a leaf') : L('摘棕櫚葉', 'Take a palm leaf'), tree: axe ? L('砍樹', 'Chop the tree') : L('撿樹枝', 'Gather sticks'), banana: L('摘香蕉', 'Pick bananas'), berry: L('摘野莓', 'Pick berries'), grass: L('拔草取纖維', 'Pull fibre'), branches: L('撿樹枝', 'Pick up sticks'), rock: L('撿石頭', 'Pick up a stone'), flint: L('敲下燧石', 'Chip off flint'), wreck: L('翻找翻覆的船', 'Search the capsized boat') }[o.kind];
    consider('thing', o, r, L2);
  }
  return best;
}
function doAct() {
  const n = near; if (!n) return;
  S_.work = 1;
  if (n.kind === 'thing') { const r = gather(G, n.obj); if (r.got) { toast(gotText(r.got)); sound.play(n.obj.kind === 'palm' && S.hand === 'axe' || n.obj.kind === 'tree' && S.hand === 'axe' ? 'fall' : 'pick'); } else { say(r.msg); sound.play('deny'); } }
  else if (n.kind === 'crate') { const r = openCrate(G, n.obj); if (r) { toast(gotText(r.got)); sound.play('crate'); } syncCrates(); }
  else if (n.kind === 'spring') { const r = gather(G, W.things.find((o) => o.kind === 'spring')); sound.play('drink'); toast(r.got && r.got.water ? gotText(r.got) : L('喝了清涼的泉水', 'A long drink of cool spring water')); }
  else if (n.kind === 'built') builtPanel(n.obj);
  else if (n.kind === 'raft') raftPanel();
  else if (n.kind === 'crab') doUse();
  else if (n.kind === 'fish') doUse();
  store();
}
function doUse() {
  S_.work = 1; sound.play('pick');
  if (near && near.kind === 'crab') { if (catchAnimal(G, 'crab')) { near.obj.back = S.time + 20; toast(gotText({ crab: 1 })); sound.play('catch'); } else say(['要拿著刀或魚叉', 'Hold a knife or spear']); return; }
  if (near && near.kind === 'fish') { if (catchAnimal(G, 'fish')) { near.obj.back = S.time + 10; toast(gotText({ fish: 1 })); sound.play('catch'); } return; }
  // the axe also chops what is in front of you
  if (S.hand === 'axe' && near && near.kind === 'thing') return doAct();
  if (S.hand === 'flare' || (!S.hand && count(S, 'flare') && shipNow(S))) { const r = fireFlare(G); if (r.msg) say(r.msg); }
}
function quickEat() {
  const need = S.thirst < S.hunger ? 'drink' : 'food';
  const order = need === 'drink' ? ['water', 'coconut', 'berries', 'banana', 'fishc', 'crabc'] : ['fishc', 'crabc', 'banana', 'coconut', 'berries', 'water'];
  const id = order.find((k) => count(S, k) && (k !== 'coconut' || count(S, 'stone')));
  if (!id) { say(['沒有可以吃喝的東西', 'Nothing to eat or drink']); sound.play('deny'); return; }
  consume(G, id); sound.play(id === 'water' ? 'drink' : 'eat'); toast(`${ITEMS[id].icon} ${iname(id)}`);
}

// ---------------------------------------------------------------- panels: bag & crafting, built things, raft, map, journal, menu
const ctxNow = () => ({ nearFire: firesNear(S, P.x, P.z).length > 0, nearRaft: !!S.raft && Math.hypot(S.raft.x - P.x, S.raft.z - P.z) < 4, inShelter: S.built.some((b) => b.type === 'shelter' && Math.hypot(b.x - P.x, b.z - P.z) < 2.8), torch: S.hand === 'torch' });
function front(d) { return { x: P.x + Math.sin(P.face) * d, z: P.z + Math.cos(P.face) * d }; }
function bagPanel() {
  showPanel('bag', L('背包與製作', 'Bag & crafting'), () => {
    const items = Object.entries(S.inv).filter(([, n]) => n > 0);
    let h = `<div class="cols"><section><h3>${L('背包', 'Bag')}</h3>${items.length ? '<div class="grid">' + items.map(([k, n]) => { const it = ITEMS[k], use = it.food || it.drink ? L('吃／喝', 'Eat / drink') : it.tool ? (S.hand === k ? L('收起', 'Put away') : L('拿在手上', 'Hold')) : k === 'flare' ? L('發射', 'Fire') : ''; return `<div class="it"><span class="ic">${it.icon}</span><b>${iname(k)}</b><small>×${n}</small>${use ? btn(use, () => useItem(k)) : ''}</div>`; }).join('') + '</div>' : `<p class="hint">${L('背包是空的。在島上四處走走，按 E 撿東西。', 'Empty. Walk around the island and press E to pick things up.')}</p>`}</section>`;
    h += `<section><h3>${L('製作', 'Make')}</h3><div class="list">`;
    for (const rc of RECIPES) {
      if (rc.onto) continue;
      const c = canCraft(G, rc.id, ctxNow()), needs = Object.entries(rc.needs).map(([k, n]) => `<span class="${count(S, k) >= n ? 'have' : 'miss'}">${ITEMS[k].icon}${n}</span>`).join(' ');
      h += `<div class="rc"><div><b>${N(rc.name)}</b> ${needs}<br><small>${N(rc.note)}</small></div>${btn(rc.place ? L('蓋在這裡', 'Build here') : L('製作', 'Make'), () => doCraft(rc.id), { cls: 'go', off: !c.ok })}</div>`;
    }
    return h + '</div></section></div>';
  });
}
function useItem(k) {
  const it = ITEMS[k];
  if (it.food || it.drink) { const r = consume(G, k); if (r.msg) { say(r.msg); sound.play('deny'); } else sound.play(k === 'water' ? 'drink' : 'eat'); }
  else if (it.tool) { S.hand = S.hand === k ? null : k; holdTool(); }
  else if (k === 'flare') { const r = fireFlare(G); sound.play('flare'); if (r.msg) say(r.msg); }
  if (S_.panel === 'bag') bagPanel();
}
function doCraft(id) {
  const rc = recipe(id);
  let at = rc.place ? front(rc.shore ? 2.2 : 2.6) : {};
  if (rc.hill && Math.hypot(P.x - HILL.x, P.z - HILL.z) < 7) at = front(1.8);
  const r = craft(G, id, { ...ctxNow(), ...at });
  if (!r.ok) { sound.play('deny'); toast(r.why ? N(r.why) : r.missing ? L('材料不夠：', 'Missing: ') + r.missing.map(([k, n]) => `${ITEMS[k].icon}${iname(k)} ×${n}`).join('、') : ''); return; }
  sound.play(rc.place ? 'build' : 'craft'); toast(`${L('完成：', 'Made: ')}${N(rc.name)}`);
  if (ITEMS[id] && ITEMS[id].tool && !S.hand) { S.hand = id; holdTool(); }
  syncBuilt(); store();
  if (rc.place) closePanel(); else bagPanel();
}
function builtPanel(b) {
  const nm = N(recipe(b.type).name);
  showPanel('built', nm, () => {
    if (b.type === 'fire') {
      const raw = count(S, 'fish') + count(S, 'crab');
      return `<p class="say">${b.lit ? L(`火燒得正旺，還能燒大約 ${Math.ceil(b.fuel)} 小時。`, `The fire is burning: about ${Math.ceil(b.fuel)} hours left.`) : L('營火沒點著。', 'The fire is out.')}</p><div class="row">`
        + (b.lit ? '' : btn(L('點火', 'Light it'), () => { const r = light(G, b); if (r.msg) say(r.msg); else sound.play('light'); builtPanel(b); }, { cls: 'go' }))
        + btn(L('加柴', 'Add fuel'), () => { const r = feed(G, b); if (r.msg) say(r.msg); else toast(`+ ${iname(r.used)}`); builtPanel(b); })
        + btn(L(`烤食物（${raw}）`, `Cook food (${raw})`), () => { const n = cook(G); toast(n ? L(`烤好了 ${n} 份`, `Cooked ${n}`) : L('沒有生的食物', 'Nothing raw to cook')); builtPanel(b); }, { off: !b.lit || !raw })
        + btn(L('做火把', 'Make a torch'), () => doCraft('torch'), { off: !b.lit })
        + btn(L('在火邊睡覺', 'Sleep by the fire'), () => { closePanel(); doSleep(); }, { off: !(NIGHT(hour(S)) || S.energy < 60) }) + '</div>';
    }
    if (b.type === 'collector') return `<p class="say">${L(`接到的雨水：${b.water.toFixed(1)} 瓶`, `Rainwater caught: ${b.water.toFixed(1)} bottles`)}</p>` + btn(L('裝滿空瓶', 'Fill empty bottles'), () => { const r = collectRain(G, b); if (r.msg) say(r.msg); else sound.play('drink'); builtPanel(b); }, { cls: 'go' });
    if (b.type === 'shelter') return `<p class="say">${L('樹葉屋頂下又乾又暖。在這裡睡覺恢復得最快，也會存檔。', 'Dry and warm under the leaves. Sleeping here is most restful, and it saves your game.')}</p>` + btn(L('睡到天亮', 'Sleep till morning'), () => { closePanel(); doSleep(); }, { cls: 'go', off: !(NIGHT(hour(S)) || S.energy < 60) });
    if (b.type === 'signal') return `<p class="say">${b.lit ? L('信號火熊熊燃燒，濃煙直上天空！', 'The signal fire roars, smoke climbing into the sky!') : L('看到船經過時，就點燃它。濃煙會讓船上的人看見你。', 'When a ship passes, light it: the smoke will catch the crew\'s eye.')}</p>` + (b.lit ? '' : btn(L('點燃信號火', 'Light the signal fire'), () => { const r = light(G, b); if (r.msg) say(r.msg); else { sound.play('light'); if (!shipNow(S)) say(['火燒起來了，但現在沒有船……', 'It burns, but there is no ship right now…']); } builtPanel(b); }, { cls: 'go' }));
    return '';
  });
}
function raftPanel() {
  const miss = voyageMissing(G), label = { raft: L('木筏', 'raft'), sail: L('船帆', 'sail'), oar: L('船槳', 'oar'), compass: iname('compass'), map: iname('map'), water: L(`清水 ${VOYAGE.water} 瓶`, `${VOYAGE.water} bottles of water`), food: L(`熟食或水果 ${VOYAGE.food} 份`, `${VOYAGE.food} cooked food or fruit`) };
  showPanel('built', L('木筏', 'Raft'), () => {
    let h = `<p class="say">${L('出海回家之前，需要準備好：', 'Before setting out for home you need:')}</p><ul class="check">`;
    for (const k of ['sail', 'oar', 'compass', 'map', 'water', 'food']) h += `<li class="${miss.includes(k) ? 'miss' : 'have'}">${miss.includes(k) ? '✗' : '✓'} ${label[k]}</li>`;
    h += '</ul><div class="row">';
    for (const id of ['sail', 'oar']) if (!S.raft[id]) { const rc = recipe(id); h += btn(`${N(rc.name)} ${Object.entries(rc.needs).map(([k, n]) => `${ITEMS[k].icon}${n}`).join(' ')}`, () => { const r = craft(G, id, ctxNow()); if (!r.ok) { sound.play('deny'); toast(r.why ? N(r.why) : L('材料不夠', 'Not enough materials')); } else { sound.play('build'); syncBuilt(); } raftPanel(); }); }
    h += btn(L('出海回家！', 'Set sail for home!'), () => { if (setSail(G).ok) { closePanel(); startEnding('raft'); } }, { cls: 'go', off: miss.length > 0 });
    return h + '</div>';
  });
}
const mapBase = (() => { const n = 300, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), img = g.createImageData(n, n), k = (R * 1.7 * 2) / n; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const wx = (x - n / 2) * k, wz = (y - n / 2) * k, h = heightAt(wx, wz), i = (y * n + x) * 4; const col = h < -2.5 ? [26, 98, 168] : h < 0.1 ? [52, 160, 214] : h < 1.5 ? [240, 220, 160] : h < 10 ? [90, 170, 80] : [140, 132, 118]; img.data.set([...col, 255], i); } g.putImageData(img, 0, 0); return { c, k, n }; })();
function mapPanel() {
  showPanel('map', L('島的地圖', 'Island map'), () => `<canvas id="bigmap" width="600" height="600"></canvas><p class="hint">${L('白色箭頭：Josh · 藍：泉水 · 橘：營火 · 綠：小屋 · 紅：信號火 · 棕：漂流箱', 'White arrow: Josh · blue: spring · orange: campfire · green: shelter · red: signal fire · brown: crates')}</p>`);
  const g = $('bigmap').getContext('2d'), s = 600 / mapBase.n, M = (x, z) => [(x / mapBase.k + mapBase.n / 2) * s, (z / mapBase.k + mapBase.n / 2) * s];
  g.imageSmoothingEnabled = true; g.drawImage(mapBase.c, 0, 0, 600, 600);
  const dot = (x, z, c, r = 6) => { const [a, b] = M(x, z); g.fillStyle = c; g.beginPath(); g.arc(a, b, r, 0, 7); g.fill(); g.strokeStyle = '#1a1a1a'; g.lineWidth = 2; g.stroke(); };
  dot(SPRING.x, SPRING.z, '#3aa8ff', 8); dot(HILL.x, HILL.z, '#8a8478', 5);
  for (const b of S.built) dot(b.x, b.z, { fire: '#ff8a2a', shelter: '#4ac84a', signal: '#e83a3a', collector: '#9ad8ff' }[b.type] || '#fff');
  if (S.raft) dot(S.raft.x, S.raft.z, '#c8a070', 7); for (const c of crates) dot(c.x, c.z, '#a87a40', 5);
  const [px, pz] = M(P.x, P.z); g.save(); g.translate(px, pz); g.rotate(-P.face + Math.PI); g.fillStyle = '#fff'; g.strokeStyle = '#1a1a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -12); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke(); g.restore();
}
function journalPanel() { showPanel('journal', L('Josh 的日記', 'Josh\'s journal'), () => `<div class="pages">${S.journal.map((k) => `<p>${N(JOURNAL[k])}</p>`).join('')}</div>`); }
const helpText = () => PAD.used ? L('控制器：左搖桿 移動 · 右搖桿 視角 · A 跳 · X 採集／互動 · B 使用工具 · Y 背包 · LB/RB 換工具 · LT 衝刺 · R3 吃東西 · 十字鍵↑ 睡覺 · View 地圖 · Start 選單', 'Controller: left stick move · right stick look · A jump · X gather / use · B use tool · Y bag · LB/RB tools · LT sprint · R3 eat · D-pad up sleep · View map · Start menu')
  : matchMedia('(pointer: coarse)').matches ? L('觸控：左邊拖曳移動 · 右邊拖曳轉視角 · 按鈕採集、使用工具、跳、吃、睡、背包、地圖', 'Touch: drag on the left to move · drag on the right to look · buttons to gather, use tools, jump, eat, sleep, open the bag and map')
    : L('WASD 移動 · Shift 衝刺 · 空白鍵 跳 · E 採集／互動 · F 或左鍵 使用工具 · 1–5 換工具 · Q 吃喝 · Z 睡覺 · Tab 背包與製作 · M 地圖 · J 日記 · 拖曳 轉視角', 'WASD move · Shift sprint · Space jump · E gather / use · F or click: use tool · 1–5 tools · Q eat or drink · Z sleep · Tab bag & crafting · M map · J journal · drag to look');
function menuPanel() {
  showPanel('menu', L('選單', 'Menu'), () => `<div class="col">${btn(L('繼續', 'Resume'), closePanel, { cls: 'go' })}${btn(L('日記', 'Journal'), journalPanel)}${btn(sound.musicOn ? L('音樂：開', 'Music: on') : L('音樂：關', 'Music: off'), () => { sound.setMusic(!sound.musicOn); menuPanel(); })}${btn(EN() ? '中文' : 'English', () => { setLang(EN() ? 'zh' : 'en'); menuPanel(); })}${btn(L('重新開始', 'New game'), () => showPanel('menu', L('重新開始？', 'Start over?'), () => `<p class="say">${L('所有進度都會清除。', 'All progress will be lost.')}</p><div class="col">${btn(L('確定', 'Yes'), () => { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } location.reload(); }, { cls: 'red' })}${btn(L('取消', 'Cancel'), menuPanel)}</div>`))}</div><p class="help">${helpText()}</p>`);
}
function doSleep() {
  const r = sleep(G, ctxNow());
  if (!r.ok) { say(r.msg); sound.play('deny'); return; }
  $('fade').classList.add('on'); S_.sleepFade = 1.6;
  for (const e of G.ev) onEvent(e);
  setTimeout(() => toast(L(`睡了 ${Math.round(r.hrs)} 小時，天亮了。`, `Slept ${Math.round(r.hrs)} hours. Morning has come.`)), 900);
  syncCrates(); store();
}

// ---------------------------------------------------------------- events from the rules
function onEvent(e) {
  switch (e.t) {
    case 'journal': journalNote(e.key); break;
    case 'day': syncCrates(); break;
    case 'ship': sound.play('horn'); toast(L('🚢 遠方有船經過！快去點燃信號火（或發射信號彈）！', '🚢 A ship on the horizon! Light the signal fire (or fire a flare)!')); break;
    case 'storm': sound.play('thunder'); break;
    case 'sick': sound.play('hurt'); break;
    case 'out': if (e.type === 'fire') toast(L('營火熄了', 'The campfire has gone out')); break;
    case 'faint': S_.faintT = 3; $('fade').classList.add('on'); sound.play('hurt'); break;
    case 'ending': startEnding(e.kind); break;
  }
}

// ---------------------------------------------------------------- moving Josh about
const MOVE = { walk: 5.5, sprint: 8.5, swim: 3, jump: 7.2, g: 22 };
function moveJosh(dt) {
  let ix = PAD.ix, iz = PAD.iz;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iz += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) iz -= 1; if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  if (touch.id !== null) { ix += touch.x; iz -= touch.y; }
  const len = Math.hypot(ix, iz); if (len > 1) { ix /= len; iz /= len; }
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  const mx = fx * iz + rx * ix, mz = fz * iz + rz * ix, want = Math.min(1, Math.hypot(mx, mz));
  const sprint = (keys.has('ShiftLeft') || keys.has('ShiftRight') || PAD.sprint) && S.energy > 8 && !P.swim;
  const sp = (P.swim ? MOVE.swim : sprint ? MOVE.sprint : MOVE.walk) * (S.energy < 5 ? 0.6 : 1);
  const k = Math.min(1, dt * 10); P.vx += (mx * sp - P.vx) * k; P.vz += (mz * sp - P.vz) * k;
  if (want > 0.1) P.face = Math.atan2(mx, mz);
  P.x += P.vx * dt; P.z += P.vz * dt;
  // trees, rocks and what Josh built
  for (const o of W.things) { if (!o.solid || isFelled(S, o)) continue; const dx = P.x - o.x, dzz = P.z - o.z, d = Math.hypot(dx, dzz), rr = o.solid * (o.s || 1) + 0.35; if (d < rr && d > 1e-4) { P.x = o.x + dx / d * rr; P.z = o.z + dzz / d * rr; } }
  for (const b of S.built) { const rr = b.type === 'shelter' ? 0 : b.type === 'signal' ? 1.3 : 0.9; if (!rr) continue; const dx = P.x - b.x, dzz = P.z - b.z, d = Math.hypot(dx, dzz); if (d < rr && d > 1e-4) { P.x = b.x + dx / d * rr; P.z = b.z + dzz / d * rr; } }
  // far out to sea the current pushes you back
  const dc = Math.hypot(P.x, P.z); if (dc > R * 1.9) { P.x *= R * 1.9 / dc; P.z *= R * 1.9 / dc; if (Math.random() < 0.02) toast(L('海流太強，游不出去了', 'The current is too strong to swim further')); }
  const ground = heightAt(P.x, P.z), deep = ground < -1.1;
  if (deep && P.y <= -0.5) { if (!P.swim) { sound.play('splash'); } P.swim = true; P.y += (-0.75 - P.y) * Math.min(1, dt * 6); P.vy = 0; P.grounded = false; }
  else {
    P.swim = false;
    if (act.has('jump') && P.grounded) { P.vy = MOVE.jump; P.grounded = false; }
    P.vy -= MOVE.g * dt; P.y += P.vy * dt;
    const floor = Math.max(ground, deep ? -0.75 : ground);
    if (P.y <= floor || (P.grounded && P.y - floor < 0.5 && P.vy <= 0)) { P.y = floor; P.vy = 0; P.grounded = true; } else P.grounded = false;
  }
  return { sprint: sprint && want > 0.1, speed: Math.hypot(P.vx, P.vz) };
}

// ---------------------------------------------------------------- the sky through the day
const C = (c) => new THREE.Color(c);
const SKY = { night: C('#0a1430'), dawn: C('#f0a070'), day: C('#7ec8f8'), dusk: C('#f08a5a') };
function skyAt(h, wet) {
  const c = new THREE.Color(); let light;
  if (h < 5 || h >= 20.5) { c.copy(SKY.night); light = 0; }
  else if (h < 7) { const k = (h - 5) / 2; c.copy(SKY.night).lerp(SKY.dawn, Math.min(1, k * 1.5)).lerp(SKY.day, Math.max(0, k * 2 - 1)); light = k; }
  else if (h < 17.5) { c.copy(SKY.day); light = 1; }
  else if (h < 19) { const k = (h - 17.5) / 1.5; c.copy(SKY.day).lerp(SKY.dusk, k); light = 1 - k * 0.5; }
  else { const k = (h - 19) / 1.5; c.copy(SKY.dusk).lerp(SKY.night, k); light = 0.5 * (1 - k); }
  if (wet) { c.lerp(C('#6a7480'), wet === 'storm' ? 0.65 : 0.45); light *= wet === 'storm' ? 0.45 : 0.65; }
  return { c, light };
}
let flash = 0;
function updateSky(dt) {
  const h = hour(S), wx = rainAt(S), { c, light: lt } = skyAt(h, wx);
  if (wx === 'storm' && Math.random() < dt * 0.15) { flash = 0.25; setTimeout(() => sound.play('thunder'), 400 + Math.random() * 900); }
  flash = Math.max(0, flash - dt);
  scene.background = c.clone().lerp(C('#ffffff'), flash * 2); scene.fog.color.copy(c);
  scene.fog.near = wx ? 30 : 80; scene.fog.far = wx === 'storm' ? 160 : wx ? 260 : 420;
  hemi.intensity = 0.18 + lt * 0.8 + flash * 2; sun.intensity = lt * 1.7; moon.intensity = (1 - lt) * 0.35;
  const a = (h - 6) / 12 * Math.PI; sun.position.set(P.x + Math.cos(a) * 60, Math.max(8, Math.sin(a) * 80), P.z + 25); sun.target.position.set(P.x, P.y, P.z);
  moon.position.set(P.x - 40, 60, P.z - 20);
  stars.material.opacity = Math.max(0, 1 - lt * 2) * (wx ? 0.2 : 1);
  ISL.seaMat.color.copy(C('#2a9ad8').lerp(C('#0a2a4a'), 1 - lt));
  ISL.waves.offset.x += dt * 0.01; ISL.waves.offset.y += dt * 0.007;
  rain.visible = !!wx; if (wx) stepRain(rain, dt, camera.position.x, camera.position.y, camera.position.z, wx === 'storm');
  return { wx, lt };
}

// ---------------------------------------------------------------- one frame of play
let saveT = 0;
function play(dt) {
  if (S_.faintT > 0) { S_.faintT -= dt; if (S_.faintT <= 0) { const at = faint(G); P.x = at.x; P.z = at.z; P.y = heightAt(at.x, at.z); $('fade').classList.remove('on'); toast(L('Josh 昏倒了……醒來時已經是早上，身上的食物也丟了一些。', 'Josh blacked out… He woke at dawn, and some of his food was gone.')); syncCrates(); } return; }
  if (S_.sleepFade > 0) { S_.sleepFade -= dt; if (S_.sleepFade <= 0) $('fade').classList.remove('on'); }
  let mv = { sprint: false, speed: 0 };
  if (!S_.panel) {
    if (act.has('bag')) bagPanel(); else if (act.has('map')) mapPanel(); else if (act.has('journal')) journalPanel(); else if (act.has('menu')) menuPanel();
    if (act.has('act')) doAct(); if (act.has('use')) doUse(); if (act.has('quick')) quickEat(); if (act.has('sleep')) doSleep();
    for (let i = 0; i < 5; i++) if (act.has('h' + i)) { const id = S.hot[i]; S.hand = id && S.hand !== id ? id : null; holdTool(); }
    if (act.has('hnext') || act.has('hprev')) { const owned = S.hot.filter(Boolean); if (owned.length) { const i = owned.indexOf(S.hand), n = owned.length; S.hand = owned[((i + (act.has('hnext') ? 1 : -1)) % n + n) % n]; holdTool(); } }
    mv = moveJosh(dt);
  }
  // the clock runs while you play (not while a panel is open)
  if (!S_.panel) {
    G.ev = []; const ctx = { ...ctxNow(), sprint: mv.sprint, swim: P.swim };
    tick(G, dt / SECONDS_PER_HOUR, ctx);
    for (const e of G.ev) onEvent(e);
  }
  near = S_.panel ? near : findNear();
  // crabs scuttle, fish dart, the shark circles anyone who swims too far out
  for (const c of crabs) {
    c.m.visible = c.back <= S.time; if (!c.m.visible) continue;
    c.t -= dt; if (c.t < 0) { c.t = 1 + Math.random() * 3; c.a = Math.random() * 6.28; }
    const d = Math.hypot(P.x - c.x, P.z - c.z), run = d < 3 ? Math.atan2(c.x - P.x, c.z - P.z) : c.a, sp = d < 3 ? 2.6 : 0.8;
    const nx = c.x + Math.sin(run) * sp * dt, nz = c.z + Math.cos(run) * sp * dt;
    if (Math.hypot(nx - c.hx, nz - c.hz) < 5 && heightAt(nx, nz) > 0.2) { c.x = nx; c.z = nz; } else c.a += 2;
    c.m.position.set(c.x, heightAt(c.x, c.z), c.z); c.m.rotation.y = run + Math.PI / 2 + Math.sin(S_.t * 20) * 0.1;
    if (d < 0.7 && Math.random() < dt * 0.5) { S.hp -= 2; sound.play('hurt'); toast(L('被螃蟹夾了一下！', 'A crab pinched you!')); }
  }
  for (const f of fishes) {
    f.m.visible = f.back <= S.time; if (!f.m.visible) continue;
    f.a += dt * (Math.hypot(P.x - f.x, P.z - f.z) < 3 ? 2.2 : 0.6); f.x = f.hx + Math.cos(f.a) * f.r; f.z = f.hz + Math.sin(f.a) * f.r;
    f.m.position.set(f.x, -0.6 + Math.sin(f.a * 3) * 0.1, f.z); f.m.rotation.y = f.a + Math.PI;
  }
  const out = P.swim && Math.hypot(P.x, P.z) > R * 1.25;
  sharkT = out ? sharkT + dt : Math.max(0, sharkT - dt * 2); shark.visible = sharkT > 1.5; biteCd -= dt;
  if (shark.visible) { sharkA += dt * 1.4; const r = Math.max(1.2, 9 - sharkT * 0.9); shark.position.set(P.x + Math.cos(sharkA) * r, -0.2, P.z + Math.sin(sharkA) * r); shark.rotation.y = -sharkA; if (r < 2 && biteCd <= 0) { biteCd = 3; S.hp -= 18; sound.play('hurt'); toast(L('🦈 鯊魚！快游回岸邊！', '🦈 A shark! Swim back to shore!')); } }
  if (out && sharkT > 0.5 && sharkT < 0.6) toast(L('水好深……好像有什麼東西在附近', 'The water is deep here… something is moving nearby'));
  // a ship on the horizon
  const sh = shipNow(S);
  ship.visible = !!sh || S_.ending === 'rescue';
  if (sh) { const k = (hour(S) - sh.hour) / 2.5; ship.position.set(-300 + k * 600, 0, -420); ship.rotation.y = Math.PI / 2; }
  // mesh upkeep, twice a second
  S_.syncT = (S_.syncT || 0) - dt;
  if (S_.syncT <= 0) {
    S_.syncT = 0.5; syncBuilt();
    for (const o of W.things) { const m = thingMeshes.get(o.id); if (!m) continue; const fl = isFelled(S, o); showStock(m, o, stockOf(S, o), fl); const st = stumps.get(o.id); if (st) st.visible = fl; if (fl && (o.kind === 'palm' || o.kind === 'tree')) m.visible = false; }
  }
  // fires: flames, light, smoke
  let fireNear = 0;
  for (const [b, m] of builtMeshes) {
    const u = m.userData;
    if (u.flame) { u.flame.visible = b.lit; u.flame.scale.y = (b.type === 'signal' ? 2.6 : 1) * (0.9 + Math.sin(S_.t * 18 + b.x) * 0.1); u.light.intensity = b.lit ? (b.type === 'signal' ? 4 : 2.2) * (0.85 + Math.random() * 0.3) : 0; }
    if (u.water) { u.water.visible = b.water > 0.05; u.water.position.y = 0.6 + Math.min(1, b.water / 4) * 0.4; }
    if (b.lit && Math.random() < dt * (b.type === 'signal' ? 12 : 3)) { const s = smokePuff(); s.position.set(b.x + (Math.random() - 0.5) * 0.4, heightAt(b.x, b.z) + (b.type === 'signal' ? 3 : 1.2), b.z); s.userData.v = b.type === 'signal' ? 3.5 : 1.5; s.userData.t = 0; s.scale.setScalar(b.type === 'signal' ? 1.4 : 0.6); scene.add(s); smokes.push(s); }
    if (b.lit && b.type === 'fire') fireNear = Math.max(fireNear, 1 - Math.hypot(b.x - P.x, b.z - P.z) / 12);
  }
  for (let i = smokes.length - 1; i >= 0; i--) { const s = smokes[i]; s.userData.t += dt; s.position.y += s.userData.v * dt; s.position.x += dt * 0.6; s.scale.multiplyScalar(1 + dt * 0.5); s.material.opacity = Math.max(0, 0.5 - s.userData.t * 0.08); if (s.userData.t > 6) { scene.remove(s); smokes.splice(i, 1); } }
  // Josh
  josh.position.set(P.x, P.y, P.z); josh.rotation.y = P.face;
  S_.work = Math.max(0, S_.work - dt * 3);
  posePerson(josh, dt, { swim: P.swim, air: !P.grounded && !P.swim, speed: mv.speed, work: S_.work, t: S_.t });
  if (heldTool && heldTool.userData.flame) heldTool.userData.flame.scale.y = 0.45 * (0.9 + Math.sin(S_.t * 20) * 0.1);
  blob.visible = !P.swim; blob.position.set(P.x, heightAt(P.x, P.z) + 0.04, P.z);
  // sounds of the place
  S_.ambT = (S_.ambT || 0) - dt; if (S_.ambT <= 0) { S_.ambT = 0.25; const wx = rainAt(S); sound.setAmbience({ rain: wx === 'storm' ? 1 : wx ? 0.6 : 0, fire: fireNear, night: NIGHT(hour(S)), mood: NIGHT(hour(S)) ? 'night' : 'day' }); }
  saveT += dt; if (saveT > 20) { saveT = 0; store(); }
}

// ---------------------------------------------------------------- the intro: a stormy night at sea
const intro = new THREE.Group(); intro.position.set(900, 0, 900); intro.visible = false; scene.add(intro);
const boat = sailboat(); intro.add(boat);
const sleeper = makePerson({ shirt: '#3a7ac8', pants: '#4a4a5a' }); sleeper.position.set(0, 1, 1.4); boat.add(sleeper); posePerson(sleeper, 0, { lie: true });
const INTRO = [[0, ['那天夜裡，Josh 在自己的小帆船上睡著了……', 'That night, Josh fell asleep on his little sailboat…']], [4.5, ['暴風雨突然來襲，浪越來越大。', 'Out of nowhere a storm rose, and the waves grew huge.']], [8.5, ['一道巨浪打來——船整個翻了過去！', 'A giant wave struck, and the boat flipped right over!']], [11.5, ['……', '…']], [13.5, ['醒來的時候，Josh 躺在一片陌生的沙灘上。', 'When Josh woke, he was lying on a beach he had never seen.']]];
function begin() {
  if (S_.mode !== 'title') return;
  sound.start(); $('title').hidden = true;
  if (loaded) return startPlay(false);
  S_.mode = 'intro'; S_.introT = 0; intro.visible = true; $('skip').hidden = false;
}
function skipIntro() { if (S_.mode === 'intro') { S_.introT = 99; } }
function introStep(dt) {
  const t = (S_.introT += dt);
  if (t > 16) { intro.visible = false; rain.visible = false; S_.flashDone = true; startPlay(true); return; }
  const storm = Math.min(1, Math.max(0, (t - 3.5) / 4));
  boat.rotation.z = Math.sin(t * 1.2) * (0.05 + storm * 0.3); boat.rotation.x = Math.sin(t * 0.9) * (0.03 + storm * 0.15); boat.position.y = Math.sin(t * 1.5) * (0.2 + storm * 1.2);
  if (t > 8.5) { const k = Math.min(1, (t - 8.5) / 0.9); boat.rotation.z = k * Math.PI; boat.position.y = -k * 1.5; }
  if (t > 9.3 && !S_.flashDone) { S_.flashDone = true; $('fade').classList.add('white'); sound.play('thunder'); setTimeout(() => { $('fade').classList.remove('white'); if (S_.mode === 'intro') $('fade').classList.add('on'); }, 250); }
  scene.background = new THREE.Color('#0a1020').lerp(new THREE.Color('#1a1a28'), storm); scene.fog.color.set('#0a1020'); scene.fog.near = 10; scene.fog.far = 90;
  hemi.intensity = 0.25 + (Math.random() < storm * 0.02 ? 2 : 0); sun.intensity = 0; moon.intensity = 0.3;
  if (Math.random() < storm * 0.01) sound.play('thunder');
  rain.visible = t > 3; if (rain.visible) stepRain(rain, dt, camera.position.x, camera.position.y, camera.position.z, storm > 0.5);
  sound.setAmbience({ rain: t > 3 ? storm : 0, mood: 'night', night: true });
  const line = [...INTRO].reverse().find(([at]) => t >= at); $('story').textContent = line ? N(line[1]) : ''; $('story').classList.toggle('on', !!line);
  camera.position.set(intro.position.x + 9, 4 + storm * 1.5, intro.position.z + 9); camera.lookAt(intro.position.x, 0.8, intro.position.z);
  ISL.waves.offset.x += dt * (0.02 + storm * 0.06);
}
function startPlay(fresh) {
  S_.mode = 'play'; $('hud').hidden = false; $('skip').hidden = true; $('story').classList.remove('on'); $('fade').classList.remove('on');
  if (fresh) { S_.wakeT = 2.2; journalNote('wake'); }
  syncCrates(); syncBuilt(); cam.yaw = Math.atan2(P.x - WRECK.x, P.z - WRECK.z) + 0.5;
}

// ---------------------------------------------------------------- the endings and home
const home = homeScene(); home.position.set(-900, 300, -900); home.visible = false; scene.add(home);
const family = [makePerson({ shirt: '#c84a6a', pants: '#3a3a4a', hair: '#8a5a2a', dress: true }), makePerson({ shirt: '#4a8a4a', pants: '#3a3a5a', hair: '#3a2a1a' }), makePerson({ shirt: '#f0c040', pants: '#5a4ac8', hair: '#8a5a2a', scale: 0.55, dress: true })];
family.forEach((p, i) => { p.position.set(-1.5 + i * 1.4, 0, -1); home.add(p); });
const dog = dogMesh(); dog.position.set(0.8, 0, 0.6); home.add(dog);
const homeJosh = makePerson({ shirt: '#3a7ac8', pants: '#4a4a5a' }); homeJosh.position.set(0, 0, 4); home.add(homeJosh);
const lighthouse = new THREE.Group(); { const t = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, 14, 12), new THREE.MeshStandardMaterial({ color: '#f0f0f0' })); t.position.y = 7; const s = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.3, 1.5, 12), new THREE.MeshStandardMaterial({ color: '#d83a3a' })); s.position.y = 10; const l = new THREE.PointLight('#fff0a0', 3, 80); l.position.y = 15; const top = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff0a0' })); top.position.y = 15; lighthouse.add(t, s, l, top); }
lighthouse.visible = false; scene.add(lighthouse);
const voyageRaft = raftMesh(); voyageRaft.visible = false; scene.add(voyageRaft); const sailor = makePerson({ shirt: '#3a7ac8', pants: '#4a4a5a' }); sailor.position.set(-0.6, 0.45, 0.4); voyageRaft.add(sailor);
function startEnding(kind) {
  if (S_.mode === 'ending') return;
  S_.mode = 'ending'; S_.ending = kind; S_.endT = 0; closePanel(); $('hud').hidden = true; store();
  clearTimeout(toast.t); $('toast').classList.remove('on'); $('note').classList.remove('on');
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  sound.play(kind === 'rescue' ? 'horn' : 'win');
}
function endingStep(dt) {
  const t = (S_.endT += dt), kind = S_.ending;
  if (t < 9) {
    if (kind === 'rescue') {
      // the ship turns in towards the island and stops offshore; Josh waves from the beach
      ship.visible = true; ship.position.set(-120 + Math.min(1, t / 7) * 60, 0, -R * 1.9); ship.rotation.y = Math.PI / 2 - Math.min(1, t / 7) * 0.5;
      josh.position.set(P.x, P.y, P.z); josh.rotation.y = Math.atan2(ship.position.x - P.x, ship.position.z - P.z); posePerson(josh, dt, { speed: 0, wave: true, t });
      camera.position.set(P.x - 6, P.y + 4, P.z + 8); camera.lookAt(ship.position.x * 0.3 + P.x * 0.7, 3, ship.position.z * 0.3 + P.z * 0.7);
      scene.background = new THREE.Color('#7ec8f8'); scene.fog.color.set('#bfe0f8'); scene.fog.near = 80; scene.fog.far = 500; hemi.intensity = 1; sun.intensity = 1.6; rain.visible = false;
    } else {
      // two days at sea, then the lighthouse
      voyageRaft.visible = true; lighthouse.visible = t > 5; const x = 1500 + t * 4; voyageRaft.position.set(x, Math.sin(t * 1.5) * 0.3, 1500); voyageRaft.rotation.z = Math.sin(t) * 0.05; lighthouse.position.set(x + 70, 0, 1440);
      posePerson(sailor, dt, { sit: true }); const dawn = Math.min(1, t / 8);
      scene.background = new THREE.Color('#1a2a5a').lerp(new THREE.Color('#f0a070'), dawn); scene.fog.color.copy(scene.background); scene.fog.near = 30; scene.fog.far = 300; hemi.intensity = 0.4 + dawn * 0.5; sun.intensity = dawn; sun.position.set(x + 100, 30, 1400); sun.target.position.set(x, 0, 1500); rain.visible = false;
      camera.position.set(x - 9, 4, 1510); camera.lookAt(x + 10, 1, 1495);
    }
    const end = ENDINGS[kind]; $('story').innerHTML = `<b>${N([end[0], end[1]])}</b>${N([end[2], end[3]])}`; $('story').classList.add('on');
    sound.setAmbience({ rain: 0, mood: 'home', night: false });
  } else {
    // home: warm firelight, family and the dog
    if (!home.visible) { home.visible = true; voyageRaft.visible = lighthouse.visible = false; ship.visible = false; $('fade').classList.remove('on'); $('story').classList.remove('on'); }
    scene.background = new THREE.Color('#1a1008'); scene.fog.near = 50; scene.fog.far = 200; scene.fog.color.set('#1a1008'); hemi.intensity = 1.15; sun.intensity = 0; moon.intensity = 0;
    const k = Math.min(1, (t - 9) / 3);
    homeJosh.position.z = 4 - k * 3; homeJosh.rotation.y = Math.PI; posePerson(homeJosh, dt, { speed: k < 1 ? 3 : 0, wave: k >= 1, t });
    family.forEach((p) => { p.rotation.y = 0; posePerson(p, dt, { speed: 0, wave: k > 0.5, t: t + p.position.x }); });
    dog.position.z = 0.6 + Math.abs(Math.sin(t * 6)) * 0.1; dog.position.y = Math.abs(Math.sin(t * 6)) * 0.3; dog.userData.tail.rotation.y = Math.sin(t * 20) * 0.6;
    home.userData.flame.scale.y = 0.9 + Math.sin(t * 15) * 0.1; home.userData.light.intensity = 2.6 + Math.random() * 0.6;
    // (the camera stays inside the room, drifting gently in front of the family and the fire)
    const a = Math.sin(t * 0.15) * 0.6; camera.position.set(home.position.x + a * 3, home.position.y + 2.6, home.position.z + 6.2); camera.lookAt(home.position.x, home.position.y + 1.1, home.position.z - 1.5);
    const end = ENDINGS.home;
    if (!S_.homeShown && t > 15) {
      S_.homeShown = true;
      $('story').classList.remove('on');
      $('panel').classList.add('endmode');
      showPanel('end', N([end[0], end[1]]), () => `<p class="say">${N([end[2], end[3]])}</p><p class="stats">${L(`在島上活了 ${day(S)} 天`, `Survived ${day(S)} ${day(S) === 1 ? 'day' : 'days'} on the island`)} · ${kind === 'rescue' ? L('靠信號火獲救', 'rescued by signal fire') : L('自己划木筏回家', 'sailed home by raft')}${S.deaths ? L(` · 昏倒 ${S.deaths} 次`, ` · fainted ${S.deaths} times`) : ''}</p>${btn(L('再玩一次', 'Play again'), () => location.reload(), { cls: 'go' })}`);
    }
    sound.setAmbience({ rain: 0, fire: 0.6, mood: 'home', night: true });
  }
}

// ---------------------------------------------------------------- the frame
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; S_.t += dt;
  pollPad(dt);
  if (S_.mode === 'intro') introStep(dt);
  else if (S_.mode === 'ending') endingStep(dt);
  else {
    if (S_.mode === 'play') play(dt);
    updateSky(dt);
    if (S_.mode === 'title') { const a = S_.t * 0.05; camera.position.set(Math.sin(a) * 110, 38, Math.cos(a) * 110); camera.lookAt(0, 4, 0); }
    else {
      // waking up on the beach: lying there a moment, then standing
      if (S_.wakeT > 0) { S_.wakeT -= dt; posePerson(josh, dt, { lie: true }); josh.position.y = P.y; }
      const target = new THREE.Vector3(P.x, P.y + 1.5, P.z), cp = Math.cos(cam.pitch);
      camera.position.copy(target).add(new THREE.Vector3(Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), Math.cos(cam.yaw) * cp).multiplyScalar(cam.dist));
      camera.position.y = Math.max(camera.position.y, heightAt(camera.position.x, camera.position.z) + 0.6, 0.3); camera.lookAt(target);
      hudT += dt; if (hudT > 0.12) { hudT = 0; hud(); }
    }
  }
  if (!S_.noRender) renderer.render(scene, camera);
  act.clear();
  requestAnimationFrame(frame);
}
function staticText() {
  document.documentElement.lang = EN() ? 'en' : 'zh-Hant';
  $('t-sub').textContent = L('暴風雨的夜裡，Josh 的船翻了。他醒來時，躺在一座無人島的沙灘上。找水、找食物、生火、蓋小屋——然後想辦法回到溫暖的家。', 'One stormy night, Josh\'s boat capsized. He woke on the beach of a deserted island. Find water and food, make fire, build a shelter — and find a way back to his warm home.');
  $('t-play').textContent = loaded ? L(`繼續（第 ${day(S)} 天）`, `Continue (day ${day(S)})`) : L('開始', 'Begin');
  $('t-lang').textContent = EN() ? '中文' : 'English'; $('t-help').textContent = helpText(); $('skip').textContent = L('跳過 ▸', 'Skip ▸');
  const tips = { 'b-act': L('採集', 'Gather'), 'b-use': L('工具', 'Tool'), 'b-eat': L('吃喝', 'Eat'), 'b-sleep': L('睡覺', 'Sleep'), 'b-bag': L('背包', 'Bag'), 'b-map': L('地圖', 'Map') };
  for (const [id, t] of Object.entries(tips)) $(id).title = t;
  $('lbl-hp').textContent = L('生命', 'Health'); $('lbl-hunger').textContent = L('飽足', 'Food'); $('lbl-thirst').textContent = L('口渴', 'Water'); $('lbl-energy').textContent = L('體力', 'Energy'); $('lbl-warmth').textContent = L('體溫', 'Warmth');
}
function setLang(l) { lang = l; try { localStorage.setItem('driftwood.lang', lang); } catch (e) { /* ignore */ } staticText(); }
$('t-play').onclick = begin; $('t-lang').onclick = () => setLang(EN() ? 'zh' : 'en'); $('skip').onclick = skipIntro;
staticText(); syncBuilt();
requestAnimationFrame(frame);
window.__dh = { S_, P, get S() { return S; }, G, keys, act, frame: (n) => frame(n), begin, skipIntro, startPlay, startEnding, bagPanel, mapPanel, journalPanel, builtPanel, raftPanel, doCraft, onEvent, syncBuilt, syncCrates };
