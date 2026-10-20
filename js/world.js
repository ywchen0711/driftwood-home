// DRIFTWOOD HOME — the island: its shape and where everything is (palms, jungle, rocks, the spring, the hill, the wreck,
// the beach where crates wash up). No DOM.
export function makeRng(seed) {
  return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const R = 64;                       // the island's radius
export const SEA_FLOOR = -9;
export const HILL = { x: 14, z: -14, h: 20, r: 26 };
export const SPRING = { x: 0, z: 2, r: 3.2 };
export const WRECK = { x: -52, z: 30 };    // the upturned boat, half in the water
export const START = { x: -44, z: 25 };    // where Josh wakes up
// height of the ground: a wobbly round island with a beach, rolling jungle, and a hill to the north-east
export function heightAt(x, z) {
  const d = Math.hypot(x, z), ang = Math.atan2(z, x);
  const shore = R * (1 + 0.1 * Math.sin(ang * 3 + 1) + 0.06 * Math.sin(ang * 7 + 2));
  const e = d / shore;
  if (e > 1.6) return SEA_FLOOR;
  let h;
  if (e < 0.8) h = 1.4 + (1 - e / 0.8) * 3 + (noise(x * 0.07, z * 0.07) - 0.5) * 2.2 * (1 - e);
  else if (e < 1) h = 1.4 * (1 - (e - 0.8) / 0.2) + 0.2;          // the beach
  else h = 0.2 - (e - 1) * 14;                                      // the shallows and the reef drop
  // the hill
  const hd = Math.hypot(x - HILL.x, z - HILL.z) / HILL.r;
  if (hd < 1) h += HILL.h * Math.pow(Math.cos(hd * Math.PI / 2), 1.6);
  // a flat dip round the spring
  const sd = Math.hypot(x - SPRING.x, z - SPRING.z);
  if (sd < SPRING.r * 2) h = Math.min(h, h * 0.5 + 1.6 * 0.5 + (sd < SPRING.r ? -0.6 : 0));
  return Math.max(SEA_FLOOR, h);
}
export const isBeach = (x, z) => { const h = heightAt(x, z); return h > 0.25 && h < 1.5; };
export const shoreDist = (x, z) => { const d = Math.hypot(x, z); return d / R; };

// ---------------------------------------------------------------- what grows and lies where
// each thing: { id, kind, x, z, y, s (size), stock (how much is there now), max, regrow (hours), solid (radius) }
export function layout(seed = 11) {
  const r = makeRng(seed), out = [], used = [];
  const free = (x, z, pad) => !used.some(([ux, uz, ur]) => Math.hypot(ux - x, uz - z) < ur + pad) && Math.hypot(x - SPRING.x, z - SPRING.z) > SPRING.r + 2 && Math.hypot(x - START.x, z - START.z) > 4;
  const put = (kind, x, z, extra = {}) => { const o = { id: out.length, kind, x, z, y: heightAt(x, z), s: 0.8 + r() * 0.5, ...extra }; out.push(o); used.push([x, z, extra.solid || 0.8]); return o; };
  const tries = (n, kind, want, extra) => { let made = 0; for (let i = 0; i < n * 30 && made < n; i++) { const a = r() * Math.PI * 2, d = r() * R * 1.05, x = Math.cos(a) * d, z = Math.sin(a) * d; if (!want(x, z) || !free(x, z, extra.pad || 1.5)) continue; put(kind, x, z, typeof extra.make === 'function' ? extra.make() : {}); made++; } return made; };
  const h = (x, z) => heightAt(x, z);
  // palms along the beach and just inside it: coconuts and leaves; with an axe, logs
  tries(34, 'palm', (x, z) => h(x, z) > 0.6 && h(x, z) < 3.2, { pad: 2.5, make: () => ({ stock: 2, max: 2, regrow: 20, solid: 0.6, leaves: 2 }) });
  // the jungle: sticks to pick up; with an axe, logs
  tries(46, 'tree', (x, z) => h(x, z) > 2.2 && h(x, z) < 12 && Math.hypot(x - HILL.x, z - HILL.z) > 8, { pad: 3, make: () => ({ stock: 2, max: 2, regrow: 16, solid: 0.8, logs: 3 }) });
  tries(9, 'banana', (x, z) => h(x, z) > 1.8 && h(x, z) < 6, { pad: 2.5, make: () => ({ stock: 2, max: 2, regrow: 30 }) });
  tries(12, 'berry', (x, z) => h(x, z) > 1.8 && h(x, z) < 8, { pad: 2, make: () => ({ stock: 3, max: 3, regrow: 24 }) });
  tries(28, 'grass', (x, z) => h(x, z) > 1.5 && h(x, z) < 9, { pad: 1.5, make: () => ({ stock: 2, max: 2, regrow: 12 }) });
  tries(24, 'branches', (x, z) => h(x, z) > 0.8 && h(x, z) < 10, { pad: 1.5, make: () => ({ stock: 2, max: 2, regrow: 14 }) });
  tries(26, 'rock', (x, z) => h(x, z) > 0.5 && h(x, z) < 14, { pad: 1.5, make: () => ({ stock: 2, max: 2, regrow: 36 }) });
  // flint only on the hillside
  tries(9, 'flint', (x, z) => Math.hypot(x - HILL.x, z - HILL.z) < HILL.r * 0.7 && h(x, z) > 6, { pad: 2, make: () => ({ stock: 1, max: 1, regrow: 48, solid: 0.7 }) });
  // places: the spring, the hilltop, the wreck
  out.push({ id: out.length, kind: 'spring', x: SPRING.x, z: SPRING.z, y: heightAt(SPRING.x, SPRING.z), s: 1 });
  out.push({ id: out.length, kind: 'wreck', x: WRECK.x, z: WRECK.z, y: heightAt(WRECK.x, WRECK.z), s: 1, stock: 1, max: 1, regrow: 0, solid: 2.4 });
  // crabs scuttle along the beach; fish swim in the shallows
  const crabs = [], fishes = [], beach = [], shallows = [];
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    for (let d = R * 0.7; d < R * 1.5; d += 0.5) {
      const x = Math.cos(a) * d, z = Math.sin(a) * d, y = h(x, z);
      if (y > 0.35 && y < 1.1 && !beach.some(([bx, bz]) => Math.hypot(bx - x, bz - z) < 6)) beach.push([x, z]);
      if (y < -0.6 && y > -2.6 && !shallows.some(([bx, bz]) => Math.hypot(bx - x, bz - z) < 9)) shallows.push([x, z]);
    }
  }
  for (let i = 0; i < 8; i++) { const [x, z] = beach[Math.floor(r() * beach.length)]; crabs.push({ x, z, hx: x, hz: z }); }
  for (let i = 0; i < 10; i++) { const [x, z] = shallows[Math.floor(r() * shallows.length)]; fishes.push({ x, z, hx: x, hz: z }); }
  const top = { x: HILL.x, z: HILL.z, y: heightAt(HILL.x, HILL.z) };
  const colliders = out.filter((o) => o.solid).map((o) => [o.x, o.z, o.solid]);
  return { things: out, crabs, fishes, beach, shallows, top, colliders };
}
