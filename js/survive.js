// DRIFTWOOD HOME — the rules of staying alive: the clock and the weather, Josh's body, gathering, crafting and building,
// fire and cooking, crates and ships, sleep, and the two ways home. No DOM (node tests play it).
import { ITEMS, RECIPES, RATE, WARM, CRATES, SHIPS, SHIP_HOURS, VOYAGE, NIGHT, newState } from './data.js';
import { heightAt, layout, makeRng, HILL, START } from './world.js';

export const day = (S) => Math.floor(S.time / 24) + 1;
export const hour = (S) => S.time % 24;
export function newGame(saved) {
  const S = saved ? { ...newState(), ...saved } : newState();
  return { S, W: layout(11), ev: [] };
}
// ---------------------------------------------------------------- the inventory
export const count = (S, id) => S.inv[id] || 0;
export const add = (S, id, n = 1) => { S.inv[id] = count(S, id) + n; if (ITEMS[id] && ITEMS[id].tool && !S.hot.includes(id)) { const i = S.hot.indexOf(null); if (i >= 0) S.hot[i] = id; else S.hot.push(id); } };
export const take = (S, id, n = 1) => { if (count(S, id) < n) return false; S.inv[id] -= n; if (!S.inv[id]) delete S.inv[id]; return true; };
const has = (S, needs) => Object.entries(needs).every(([k, n]) => count(S, k) >= n);
const note = (G, key) => { if (!G.S.journal.includes(key)) { G.S.journal.push(key); G.ev.push({ t: 'journal', key }); } };

// ---------------------------------------------------------------- what is left on a tree, a bush, a rock
export function stockOf(S, o) {
  if (o.max == null) return 0;
  if (S.felled && S.felled[o.id] != null && S.time - S.felled[o.id] < 72) return 0;
  const rec = S.gathered[o.id]; if (!rec) return o.max;
  return Math.min(o.max, rec.n + Math.floor((S.time - rec.t) / o.regrow));
}
export const isFelled = (S, o) => !!(S.felled && S.felled[o.id] != null && S.time - S.felled[o.id] < 72);
function takeStock(S, o, k = 1) { const n = stockOf(S, o); S.gathered[o.id] = { n: Math.max(0, n - k), t: S.time }; }
// gather from a thing in the world with what is in Josh's hand; returns { got: { item: n }, msg } or { msg } when nothing comes of it
export function gather(G, o) {
  const S = G.S, hand = S.hand, got = {}, give = (id, n) => { got[id] = (got[id] || 0) + n; add(S, id, n); };
  if (isFelled(S, o)) return { msg: ['這裡什麼都沒有了', 'Nothing left here'] };
  const n = stockOf(S, o);
  switch (o.kind) {
    case 'palm':
      if (hand === 'axe') { give('wood', 2); give('leaf', 2); S.felled = S.felled || {}; S.felled[o.id] = S.time; G.ev.push({ t: 'chop', x: o.x, z: o.z }); break; }
      if (n > 0) { give('coconut', 1); takeStock(S, o); }
      give('leaf', hand === 'knife' ? 2 : 1); break;
    case 'tree':
      if (hand === 'axe') { give('wood', o.logs || 3); S.felled = S.felled || {}; S.felled[o.id] = S.time; G.ev.push({ t: 'chop', x: o.x, z: o.z }); break; }
      if (n <= 0) return { msg: ['樹枝撿完了，用斧頭可以砍成木頭', 'No more sticks; an axe would give logs'] };
      give('stick', 1); takeStock(S, o); break;
    case 'banana': if (n <= 0) return { msg: ['香蕉還沒長出來', 'No ripe bananas yet'] }; give('banana', 1); takeStock(S, o); break;
    case 'berry': if (n <= 0) return { msg: ['莓果都摘光了', 'All picked'] }; give('berries', 2); takeStock(S, o); break;
    case 'grass': if (n <= 0) return { msg: ['草還沒長回來', 'It has not grown back yet'] }; give('fiber', hand === 'knife' ? 3 : 2); takeStock(S, o); break;
    case 'branches': if (n <= 0) return { msg: ['樹枝撿完了', 'All gathered'] }; give('stick', 2); takeStock(S, o); break;
    case 'rock': if (n <= 0) return { msg: ['沒有可以撿的石頭了', 'No loose stones left'] }; give('stone', 1); takeStock(S, o); break;
    case 'flint': if (n <= 0) return { msg: ['燧石敲光了', 'No flint left here'] }; give('flint', 1); takeStock(S, o); break;
    case 'wreck':
      if (n <= 0) return { msg: ['船已經翻爛了，什麼都沒剩', 'The boat is wrecked; nothing more to find'] };
      give('cloth', 1); give('rope', 1); give('bottle', 1); takeStock(S, o); note(G, 'crate'); break;
    case 'spring': {
      const b = count(S, 'bottle');
      if (b > 0) { take(S, 'bottle', b); give('water', b); G.ev.push({ t: 'fill' }); }
      else { S.thirst = Math.min(100, S.thirst + 30); G.ev.push({ t: 'drink' }); }
      note(G, 'water'); break;
    }
    default: return { msg: ['沒什麼可拿的', 'Nothing to take'] };
  }
  S.time += 0.12; S.energy = Math.max(0, S.energy - 0.6);
  G.ev.push({ t: 'gather', got });
  return { got };
}
// crates on the beach: each morning one or two wash up (some things come for sure on certain days)
export function cratesFor(G, d) {
  const S = G.S, r = makeRng(d * 977 + 13), list = [], sure = CRATES.sure[d] || [];
  const n = d === 1 ? 1 : 1 + (r() < 0.5 ? 1 : 0);
  for (let i = 0; i < Math.max(n, sure.length ? 1 : 0); i++) {
    const [x, z] = G.W.beach[Math.floor(r() * G.W.beach.length)];
    const items = i === 0 ? [...sure] : [];
    while (items.length < 2) items.push(CRATES.random[Math.floor(r() * CRATES.random.length)]);
    list.push({ id: `${d}:${i}`, x, z, items, open: !!(S.crates[`${d}:${i}`]) });
  }
  return list;
}
export function openCrate(G, c) {
  const S = G.S; if (S.crates[c.id]) return null;
  S.crates[c.id] = true; c.open = true; const got = {};
  for (const it of c.items) { add(S, it); got[it] = (got[it] || 0) + 1; }
  note(G, 'crate'); if (got.photo) note(G, 'photo'); if (got.compass) note(G, 'compass');
  G.ev.push({ t: 'crate', got }); return { got };
}
// the crabs on the beach and the fish in the shallows: a spear (or a knife, for crabs) catches them
export function catchAnimal(G, kind) {
  const S = G.S;
  if (kind === 'crab' && (S.hand === 'spear' || S.hand === 'knife')) { add(S, 'crab'); G.ev.push({ t: 'catch', kind }); return true; }
  if (kind === 'fish' && S.hand === 'spear') { add(S, 'fish'); G.ev.push({ t: 'catch', kind }); return true; }
  return false;
}

// ---------------------------------------------------------------- making things
export const recipe = (id) => RECIPES.find((r) => r.id === id);
export function canCraft(G, id, ctx = {}) {
  const S = G.S, rc = recipe(id); if (!rc) return { ok: false };
  const missing = Object.entries(rc.needs).filter(([k, n]) => count(S, k) < n).map(([k, n]) => [k, n - count(S, k)]);
  if (missing.length) return { ok: false, missing };
  if (rc.near === 'fire' && !ctx.nearFire) return { ok: false, why: ['要在燒著的營火旁邊做', 'Make it beside a lit campfire'] };
  if (rc.onto === 'raft' && (!S.raft || !ctx.nearRaft)) return { ok: false, why: ['要在木筏旁邊做', 'Make it beside the raft'] };
  if (rc.onto === 'raft' && S.raft[id]) return { ok: false, why: ['木筏已經有了', 'The raft already has one'] };
  if (id === 'raft' && S.raft) return { ok: false, why: ['已經有一艘木筏了', 'You already have a raft'] };
  return { ok: true };
}
// where a building may go
export function placeOk(G, id, x, z) {
  const rc = recipe(id), y = heightAt(x, z);
  if (rc.hill) return Math.hypot(x - HILL.x, z - HILL.z) < 7 ? { ok: true } : { ok: false, why: ['信號火堆要蓋在山頂上', 'The signal fire must go on the hilltop'] };
  if (rc.shore) return y > -0.6 && y < 1.2 ? { ok: true } : { ok: false, why: ['木筏要蓋在海邊的沙灘上', 'The raft must be built on the beach by the water'] };
  if (y < 0.4) return { ok: false, why: ['這裡太濕了', 'Too wet here'] };
  if (G.S.built.some((b) => Math.hypot(b.x - x, b.z - z) < 2.6)) return { ok: false, why: ['離別的東西太近了', 'Too close to something else'] };
  return { ok: true };
}
export function craft(G, id, ctx = {}) {
  const S = G.S, rc = recipe(id), c = canCraft(G, id, ctx); if (!c.ok) return c;
  if (rc.place) { const p = placeOk(G, id, ctx.x, ctx.z); if (!p.ok) return p; }
  for (const [k, n] of Object.entries(rc.needs)) take(S, k, n);
  S.time += 0.25;
  if (rc.place) {
    const b = { type: id, x: ctx.x, z: ctx.z, fuel: 0, lit: false, water: 0 };
    if (id === 'raft') { S.raft = { x: ctx.x, z: ctx.z, sail: false, oar: false }; note(G, 'raft'); }
    else S.built.push(b);
    if (id === 'shelter') note(G, 'shelter'); if (id === 'signal') note(G, 'signal');
    G.ev.push({ t: 'build', id, x: ctx.x, z: ctx.z });
  } else if (rc.onto === 'raft') { S.raft[id] = true; G.ev.push({ t: 'build', id }); }
  else { add(S, id); if (id === 'knife') note(G, 'knife'); G.ev.push({ t: 'craft', id }); }
  return { ok: true };
}

// ---------------------------------------------------------------- fire
// lighting needs flint and the knife to strike it on, or a lit torch (from another fire), or the flare
export function canLight(S) { return (count(S, 'flint') > 0 && count(S, 'knife') > 0) || (S.hand === 'torch' && count(S, 'torch') > 0); }
export function light(G, b) {
  const S = G.S;
  if (b.lit) return { msg: ['已經燒起來了', 'It is already burning'] };
  if (!canLight(S)) return { msg: ['需要燧石和石刀才能點火（或拿著點燃的火把）', 'You need flint and a knife to light it (or a burning torch)'] };
  b.lit = true; b.fuel = b.type === 'signal' ? 3 : Math.max(b.fuel, 3);
  if (b.type === 'fire') note(G, 'fire');
  G.ev.push({ t: 'light', type: b.type }); return { ok: true };
}
export function feed(G, b) {
  const S = G.S;
  for (const [id, h] of [['wood', 3], ['stick', 1], ['leaf', 0.5]]) if (take(S, id)) { b.fuel = Math.min(12, b.fuel + h); G.ev.push({ t: 'feed' }); return { ok: true, used: id }; }
  return { msg: ['沒有可以燒的東西（樹枝、木頭、葉子）', 'Nothing to burn (sticks, logs, leaves)'] };
}
export function cook(G) {
  const S = G.S; let n = 0;
  for (const id of ['fish', 'crab']) while (take(S, id)) { add(S, ITEMS[id].cooks); n++; }
  if (n) { S.time += 0.2 * n; G.ev.push({ t: 'cook', n }); }
  return n;
}
export const firesNear = (S, x, z, r = 4) => S.built.filter((b) => b.type === 'fire' && b.lit && Math.hypot(b.x - x, b.z - z) < r);

// ---------------------------------------------------------------- eating and drinking
export function consume(G, id) {
  const S = G.S, it = ITEMS[id]; if (!it || !(it.food || it.drink) || !count(S, id)) return { msg: ['沒有這個', 'You have none'] };
  if (it.needs && !count(S, it.needs)) return { msg: ['要用石頭敲開椰子', 'You need a stone to crack the coconut'] };
  take(S, id); if (it.gives) add(S, it.gives);
  S.hunger = Math.min(100, S.hunger + (it.food || 0)); S.thirst = Math.min(100, S.thirst + (it.drink || 0));
  // raw meat: a fair chance of a stomach ache
  if (it.raw && makeRng(Math.floor(S.time * 10))() < 0.5) { S.sick = 4; note(G, 'sick'); G.ev.push({ t: 'sick' }); }
  G.ev.push({ t: 'eat', id }); return { ok: true };
}
// the rain catcher: fill the empty bottles
export function collectRain(G, b) {
  const S = G.S, n = Math.min(Math.floor(b.water), count(S, 'bottle'));
  if (!n) return { msg: b.water < 1 ? ['還沒接到雨水', 'No rainwater yet'] : ['沒有空瓶子', 'No empty bottles'] };
  take(S, 'bottle', n); add(S, 'water', n); b.water -= n; G.ev.push({ t: 'fill' }); return { ok: true };
}

// ---------------------------------------------------------------- weather and ships
// storms on some nights, and now and then a shower
export function rainAt(S, t = S.time) {
  const d = Math.floor(t / 24) + 1, h = t % 24, r = makeRng(d * 31 + 7);
  if ((d === 3 && (h >= 20)) || (d === 4 && h < 2) || (d === 6 && h >= 17 && h < 23) || (d % 4 === 1 && d > 4 && h >= 2 && h < 6)) return 'storm';
  const s = r() * 24; if (r() < 0.4 && h >= s && h < s + 2.5) return 'rain';
  return null;
}
export function shipNow(S) { const d = day(S), h = hour(S); return SHIPS.find((s) => s.day === d && h >= s.hour && h < s.hour + SHIP_HOURS) || null; }

// ---------------------------------------------------------------- one slice of time
// ctx: { nearFire, inShelter, sprint, swim, torch, sleeping }
export function tick(G, hrs, ctx = {}) {
  const S = G.S, before = S.time, d0 = day(S);
  S.time += hrs;
  const night = NIGHT(hour(S)), wx = rainAt(S);
  // the body
  const k = ctx.sleeping ? 0.6 : 1;
  S.hunger = Math.max(0, S.hunger - RATE.hunger * hrs * k * (S.sick > 0 ? 1.4 : 1));
  S.thirst = Math.max(0, S.thirst - RATE.thirst * hrs * k);
  if (ctx.sleeping) S.energy = Math.min(100, S.energy + (ctx.inShelter ? RATE.sleepShelter : RATE.sleepGround) * hrs);
  else S.energy = Math.max(0, S.energy - (RATE.energy + (ctx.sprint ? RATE.sprintEnergy : 0) + (ctx.swim ? 4 : 0)) * hrs);
  if (ctx.swim) S.wet = 1; else S.wet = Math.max(0, S.wet - hrs * (ctx.nearFire ? 2 : 0.5));
  let warm = night ? WARM.night : WARM.day;
  if (wx && !ctx.inShelter) warm += WARM.rain * (wx === 'storm' ? 1.3 : 1);
  if (S.wet > 0) warm += WARM.wet;
  if (ctx.inShelter) warm += WARM.shelter;
  if (ctx.torch) warm += WARM.torch;
  if (ctx.nearFire) warm = Math.max(warm, WARM.fire);
  S.warmth += (warm - S.warmth) * Math.min(1, hrs * 1.2);
  let dmg = 0;
  if (S.hunger <= 0) dmg += RATE.starve; if (S.thirst <= 0) dmg += RATE.parched; if (S.warmth < 20) dmg += RATE.freeze; if (S.energy <= 0) dmg += RATE.exhausted;
  if (S.sick > 0) { dmg += RATE.sick; S.sick = Math.max(0, S.sick - hrs); }
  if (dmg) S.hp -= dmg * hrs; else if (S.hunger > 35 && S.thirst > 35 && S.warmth > 35) S.hp = Math.min(100, S.hp + RATE.heal * hrs * (ctx.sleeping ? 2 : 1));
  // fires burn down (faster in the rain); the rain catcher fills
  for (const b of S.built) {
    if (b.lit) { b.fuel -= hrs * (wx ? 1.6 : 1); if (b.fuel <= 0) { b.fuel = 0; b.lit = false; G.ev.push({ t: 'out', type: b.type }); } }
    if (b.type === 'collector' && wx) b.water = Math.min(4, b.water + hrs * (wx === 'storm' ? 1.5 : 0.8));
  }
  // a new day: crates on the beach
  if (day(S) !== d0) G.ev.push({ t: 'day', day: day(S) });
  if (NIGHT(hour(S)) && !NIGHT(before % 24)) note(G, 'night');
  if (wx === 'storm' && rainAt(S, before) !== 'storm') { note(G, 'storm'); G.ev.push({ t: 'storm' }); }
  // a ship on the horizon: a lit signal fire (or a flare) brings it in
  const ship = shipNow(S);
  if (ship && !S.seen[ship.day]) { S.seen[ship.day] = true; note(G, 'ship'); G.ev.push({ t: 'ship' }); }
  if (ship && !S.ending && S.built.some((b) => b.type === 'signal' && b.lit)) { S.ending = 'rescue'; G.ev.push({ t: 'ending', kind: 'rescue' }); }
  if (S.hp <= 0 && !S.ending) { S.hp = 0; G.ev.push({ t: 'faint' }); }
  return G.ev;
}
export function fireFlare(G) {
  const S = G.S; if (!count(S, 'flare')) return { msg: ['沒有信號彈', 'No flare'] };
  take(S, 'flare'); G.ev.push({ t: 'flare' });
  if (shipNow(S)) { S.ending = 'rescue'; G.ev.push({ t: 'ending', kind: 'rescue' }); return { ok: true }; }
  return { msg: ['信號彈飛上天……可是沒有船看見。', 'The flare arcs into the sky… but there is no ship to see it.'] };
}
// sleep until morning (or eight hours); in a shelter it is warm and safe, and it saves
export function sleep(G, ctx) {
  const S = G.S, h = hour(S);
  if (!NIGHT(h) && S.energy > 60) return { msg: ['現在還不睏', 'You are not sleepy yet'] };
  const hrs = h >= 19.5 ? 24 - h + 7 : h < 7 ? 7 - h : 8;
  G.ev = []; for (let t = 0; t < hrs; t += 0.5) tick(G, Math.min(0.5, hrs - t), { ...ctx, sleeping: true });
  G.ev.push({ t: 'slept', hrs }); return { ok: true, hrs };
}
// fainting: Josh comes to at his shelter (or on the beach) the next morning, weak and having lost his food
export function faint(G) {
  const S = G.S, h = hour(S); S.time += (h < 7 ? 7 - h : 31 - h);
  S.hp = 45; S.hunger = Math.max(S.hunger, 35); S.thirst = Math.max(S.thirst, 35); S.energy = 60; S.warmth = 60; S.sick = 0; S.deaths++;
  for (const id of ['crabc', 'fishc', 'berries', 'banana', 'coconut', 'crab', 'fish']) if (S.inv[id]) S.inv[id] = Math.floor(S.inv[id] / 2);
  const sh = S.built.find((b) => b.type === 'shelter');
  return sh ? { x: sh.x + 1.5, z: sh.z + 1.5 } : { x: START.x, z: START.z };
}
// the voyage home: what is still missing
export function voyageMissing(G) {
  const S = G.S, miss = [];
  if (!S.raft) miss.push('raft'); else { if (!S.raft.sail) miss.push('sail'); if (!S.raft.oar) miss.push('oar'); }
  for (const [k, n] of Object.entries(VOYAGE.items)) if (count(S, k) < n) miss.push(k);
  if (count(S, 'water') < VOYAGE.water) miss.push('water');
  const food = Object.entries(S.inv).reduce((s, [k, n]) => s + (ITEMS[k] && ITEMS[k].food && !ITEMS[k].raw ? n : 0), 0);
  if (food < VOYAGE.food) miss.push('food');
  return miss;
}
export function setSail(G) {
  if (voyageMissing(G).length) return { ok: false };
  const S = G.S; take(S, 'water', VOYAGE.water); let f = VOYAGE.food;
  for (const k of Object.keys(S.inv)) while (f > 0 && ITEMS[k] && ITEMS[k].food && !ITEMS[k].raw && take(S, k)) f--;
  S.ending = 'raft'; G.ev.push({ t: 'ending', kind: 'raft' }); return { ok: true };
}
