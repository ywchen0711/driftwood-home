// node tools/test.mjs — the island has what Josh needs, the body behaves, and a careful player can get home both ways
import { ITEMS, RECIPES, CRATES, SHIPS, newState } from '../js/data.js';
import { heightAt, layout, HILL, SPRING, START, WRECK } from '../js/world.js';
import { newGame, tick, gather, craft, canCraft, light, feed, cook, consume, stockOf, isFelled, cratesFor, openCrate, sleep, voyageMissing, setSail, firesNear, count, take, add, day, hour, catchAnimal, fireFlare } from '../js/survive.js';

let fails = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; };

// ---- the data
ok('every recipe uses real items', RECIPES.every((r) => Object.keys(r.needs).every((k) => ITEMS[k])));
ok('every crate item is real', [...Object.values(CRATES.sure).flat(), ...CRATES.random].every((k) => ITEMS[k]));
ok('everything needed for a raft can come from the island or the crates', ['nails', 'tarp', 'compass', 'map'].every((k) => Object.values(CRATES.sure).flat().includes(k)));
// ---- the island
{
  const W = layout(11), kinds = {}; for (const t of W.things) kinds[t.kind] = (kinds[t.kind] || 0) + 1;
  ok('the island has palms, trees, rocks, flint, grass, berries and bananas', ['palm', 'tree', 'rock', 'flint', 'grass', 'berry', 'banana', 'branches'].every((k) => kinds[k] >= 5), JSON.stringify(kinds));
  ok('Josh wakes on dry land by the wreck', heightAt(START.x, START.z) > 0.3 && Math.hypot(START.x - WRECK.x, START.z - WRECK.z) < 14);
  ok('the spring is on land, and the hilltop is the highest place', heightAt(SPRING.x, SPRING.z) > 0.3 && W.top.y > 15, `top ${W.top.y.toFixed(1)}`);
  ok('crates can wash up on plenty of beach', W.beach.length > 20 && W.shallows.length > 8, `${W.beach.length} beach spots, ${W.shallows.length} shallows`);
  ok('everything stands on land', W.things.every((t) => t.kind === 'wreck' || t.y > 0.3));
}
// ---- the body
{
  const G = newGame(); for (let i = 0; i < 24 * 4 * 4; i++) tick(G, 0.25, {});
  ok('with nothing to eat or drink, Josh does not last four days', G.S.hp <= 0, `hp ${G.S.hp.toFixed(0)}`);
  const H = newGame(); for (let i = 0; i < 24 * 4; i++) { tick(H, 0.25, { nearFire: true }); H.S.hunger = H.S.thirst = 80; }
  ok('fed, watered and by a fire, he gets healthier', H.S.hp >= 100 && H.S.warmth > 85);
  const C = newGame(); C.S.time = 22; for (let i = 0; i < 24; i++) tick(C, 0.25, {}); ok('a night in the open gets cold', C.S.warmth < 45, `warmth ${C.S.warmth.toFixed(0)}`);
  const E = newGame(); E.S.inv.crab = 6; let sick = 0; for (let i = 0; i < 6; i++) { E.S.time += 0.37; consume(E, 'crab'); if (E.S.sick > 0) sick++; E.S.sick = 0; }
  ok('raw crab can make you sick', sick > 0 && sick < 6, `${sick} of 6`);
  const K = newGame(); K.S.inv = { fish: 2, stick: 5, stone: 4, flint: 1, knife: 1 }; craft(K, 'fire', { x: 0, z: 10 }); light(K, K.S.built[0]); const n = cook(K);
  ok('a lit campfire cooks fish', n === 2 && count(K.S, 'fishc') === 2);
}

// ---- a careful player: gathers, crafts, builds, eats and sleeps, and goes home one of two ways
function player(way) {
  const G = newGame(), S = G.S, W = G.W; let pos = { x: START.x, z: START.z }, steps = 0;
  const log = [];
  const ctx = () => ({ nearFire: firesNear(S, pos.x, pos.z).length > 0, inShelter: S.built.some((b) => b.type === 'shelter' && Math.hypot(b.x - pos.x, b.z - pos.z) < 3) });
  const pass = (hrs) => { for (let t = 0; t < hrs && !S.ending; t += 0.25) { G.ev = []; tick(G, Math.min(0.25, hrs - t), ctx()); if (S.hp <= 0) throw new Error(`fainted on day ${day(S)} at ${hour(S).toFixed(1)}: ${JSON.stringify({ hu: S.hunger | 0, th: S.thirst | 0, wa: S.warmth | 0, en: S.energy | 0 })}`); } };
  const go = (x, z) => { pass(Math.hypot(x - pos.x, z - pos.z) / 60); pos = { x, z }; };
  const at = (o) => go(o.x + 1, o.z + 1);
  const shelter = () => S.built.find((b) => b.type === 'shelter'), fire = () => S.built.find((b) => b.type === 'fire'), signal = () => S.built.find((b) => b.type === 'signal');
  const SOURCES = { stick: ['branches', 'tree'], stone: ['rock'], flint: ['flint'], fiber: ['grass'], leaf: ['palm'], coconut: ['palm'], banana: ['banana'], berries: ['berry'] };
  // the closest thing of these kinds that still has something on it
  const nearest = (kinds, chop) => W.things.filter((o) => kinds.includes(o.kind) && !isFelled(S, o) && (chop || stockOf(S, o) > 0 || o.kind === 'palm')).sort((a, b) => Math.hypot(a.x - pos.x, a.z - pos.z) - Math.hypot(b.x - pos.x, b.z - pos.z))[0];
  const hold = (tool) => { S.hand = count(S, tool) ? tool : null; };
  let depth = 0;
  function get(item, n) {
    depth++; try { return get1(item, n); } finally { depth--; }
  }
  function get1(item, n) {
    let guard = 0;
    while (count(S, item) < n && guard++ < 200) {
      if (depth === 1) needs();
      const rc = RECIPES.find((r) => r.id === item && !r.place && !r.onto);
      if (rc) { for (const [k, m] of Object.entries(rc.needs)) get(k, m * (n - count(S, item))); craft(G, item, ctx()); continue; }
      if (item === 'wood') { get('axe', 1); hold('axe'); const o = nearest(['tree', 'palm'], true); at(o); gather(G, o); continue; }
      if (item === 'water') { get('bottle', Math.min(n, 3)); at({ x: SPRING.x, z: SPRING.z }); hold(null); gather(G, W.things.find((o) => o.kind === 'spring')); continue; }
      if (SOURCES[item]) { hold(item === 'fiber' || item === 'leaf' ? 'knife' : null); const o = nearest(SOURCES[item]); if (!o) { pass(2); continue; } at(o); gather(G, o); continue; }
      // things that only come in crates: wait for them (looking after yourself meanwhile)
      needs(); pass(2);
    }
    if (count(S, item) < n) throw new Error(`could not get ${n} ${item}`);
  }
  // the morning round: open the crates on the beach; drink, eat, keep warm
  let lastCrateDay = 0;
  function daily() {
    if (day(S) !== lastCrateDay && hour(S) >= 6) { lastCrateDay = day(S); for (const c of cratesFor(G, day(S))) if (!c.open) { go(c.x, c.z); openCrate(G, c); } }
  }
  function needs() {
    daily();
    if (S.thirst < 45) { if (count(S, 'water')) consume(G, 'water'); else { at({ x: SPRING.x, z: SPRING.z }); hold(null); gather(G, W.things.find((o) => o.kind === 'spring')); } }
    if (S.hunger < 50) {
      if (fire() && (count(S, 'fish') || count(S, 'crab'))) { at(fire()); if (!fire().lit) light(G, fire()); cook(G); }
      const food = ['fishc', 'crabc', 'banana', 'coconut', 'berries'].find((k) => count(S, k) && (k !== 'coconut' || count(S, 'stone')));
      if (food) consume(G, food);
      else if (count(S, 'spear') && fire()) { const c = W.crabs[0]; go(c.x, c.z); hold('spear'); catchAnimal(G, 'crab'); catchAnimal(G, 'crab'); pass(0.5); at(fire()); if (!fire().lit) light(G, fire()); cook(G); consume(G, 'crabc'); }
      else { const o = nearest(['banana', 'berry', 'palm'].filter((k) => W.things.some((t) => t.kind === k && stockOf(S, t) > 0))); if (o) { hold(null); at(o); gather(G, o); } else pass(1); }
    }
    // nights: by the fire, or in the shelter
    const h = hour(S);
    if (h >= 19.5 || h < 5) {
      const sh = shelter(), f = fire();
      if (f) { at(f); if (!f.lit && count(S, 'flint') && count(S, 'knife')) light(G, f); while (f.fuel < 9 && (count(S, 'wood') || count(S, 'stick'))) feed(G, f); }
      if (sh) at(sh);
      const r = sleep(G, ctx()); if (!r.ok) pass(1);
      if (S.hp <= 0) throw new Error(`fainted in the night of day ${day(S)}`);
    }
  }
  const build = (id, x, z) => { const rc = RECIPES.find((r) => r.id === id); for (let k2 = 0; k2 < 6 && Object.entries(rc.needs).some(([k, n]) => count(S, k) < n); k2++) for (const [k, n] of Object.entries(rc.needs)) get(k, n); go(x, z); const r = craft(G, id, { ...ctx(), x, z, nearRaft: true }); if (!r.ok) throw new Error(`could not build ${id}: ${JSON.stringify(r)}`); log.push(`${id} d${day(S)}`); };
  // the plan
  const home = { x: -30, z: 18 };
  const plan = [
    () => get('knife', 1), () => get('axe', 1), () => get('flint', 1),
    () => build('fire', home.x, home.z), () => { at(fire()); light(G, fire()); },
    () => get('spear', 1), () => build('shelter', home.x + 4, home.z),
  ];
  if (way === 'rescue') plan.push(() => build('signal', HILL.x + 1, HILL.z + 1));
  else plan.push(() => { const b = W.beach.slice().sort((a, b2) => Math.hypot(a[0] - home.x, a[1] - home.z) - Math.hypot(b2[0] - home.x, b2[1] - home.z))[0]; build('raft', b[0], b[1]); },
    () => build('oar', S.raft.x, S.raft.z), () => build('sail', S.raft.x, S.raft.z),
    () => { get('compass', 1); get('map', 1); }, () => get('water', 3),
    () => { while (['fishc', 'crabc', 'banana', 'coconut', 'berries'].reduce((s, k) => s + count(S, k), 0) < 4) { const o = nearest(['banana', 'palm', 'berry']); hold(null); at(o); gather(G, o); needs(); } },
    () => { needs(); const r = setSail(G); if (!r.ok) throw new Error('could not sail: ' + voyageMissing(G).join(', ')); });
  let i = 0;
  try {
    while (!S.ending && steps++ < 4000) {
      needs();
      if (i < plan.length) { plan[i](); i++; continue; }
      // waiting for a ship by the signal fire
      if (way === 'rescue') { const sh = SHIPS.find((s) => s.day === day(S) && hour(S) >= s.hour - 1 && hour(S) < s.hour + 2); if (sh) { const sg = signal(); at(sg); get('flint', 1); if (hour(S) < sh.hour) pass(sh.hour - hour(S) + 0.1); light(G, sg); pass(0.5); } else pass(1); }
    }
  } catch (e) { return { ok: false, why: e.message, day: day(S), log }; }
  return { ok: S.ending === way, day: day(S), hour: hour(S), deaths: S.deaths, log, S };
}
for (const way of ['rescue', 'raft']) {
  const r = player(way);
  ok(`a careful player gets home by ${way === 'rescue' ? 'signal fire and a passing ship' : 'raft'}`, r.ok && r.deaths === 0, r.ok ? `on day ${r.day} (${r.log.join(', ')})` : r.why + ` (${r.log.join(', ')})`);
}
// ---- the flare
{
  const G = newGame(); add(G.S, 'flare'); G.S.time = (SHIPS[0].day - 1) * 24 + SHIPS[0].hour + 0.5; const r = fireFlare(G);
  ok('a flare fired while a ship is in sight brings rescue', r.ok && G.S.ending === 'rescue');
}
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
