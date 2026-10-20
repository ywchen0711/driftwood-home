# 漂流島 · Driftwood Home

A 3D survival game for the browser. One stormy night Josh falls asleep on his little sailboat, a wave flips it over, and he wakes on the beach of a deserted island. Find water and food, make fire, build a shelter, and find a way back to his warm home.

暴風雨的夜裡，Josh 在小帆船上睡著了，一道巨浪把船整個翻了過去。他醒來時躺在一座無人島的沙灘上。找水、找食物、生火、蓋小屋，想辦法回到溫暖的家。

**Play:** https://ywchen0711.github.io/driftwood-home/

## Surviving

- **Five needs:** health, food, water, energy and warmth. Hunger and thirst run down through the day, nights are cold, rain and storms chill you, and raw meat can make you sick. If health runs out Josh faints and wakes the next morning, weaker and missing some food.
- **Days and weather:** a day lasts about five minutes. There are dawns and dusks, starry nights, showers and thunderstorms.
- **The island:** palms (coconuts and leaves), jungle trees (sticks, and logs with an axe), bananas, berries, grass for fibre, stones, flint on the hillside, a freshwater spring, crabs on the beach, fish in the shallows, and sharks past the reef. Crates from the wreck wash ashore every morning.
- **Crafting:** a stone knife, stone axe, spear, rope and torch. Build a campfire (light it with flint and the knife, cook fish and crab, keep warm), a rain catcher, and a lean-to shelter where sleep is warmest and the game saves.
- **Josh's journal** fills in as things happen.
- **In-game help:** H opens a full guide (goal, the five needs, what to do on day one, every recipe, both ways home, controls and tips), and I opens the item guide with every item, where it comes from and what it is for. The guide opens by itself the first time.

## Two ways home

1. **Be rescued:** build a signal fire on the hilltop. Ships pass now and then; light it while one is in sight. A flare from a crate works too.
2. **Sail home:** build a raft and fit a sail and an oar. Take the compass and the sea chart that wash ashore, three bottles of water and three meals, and set out.

Either way ends at home, by the fire, with family and the dog.

## Controls

| | Keyboard and mouse | Controller | Touch |
|---|---|---|---|
| Move / sprint | WASD / Shift | Left stick / LT | Drag on the left |
| Camera | Drag, wheel | Right stick | Drag on the right |
| Jump | Space | A | ⤒ |
| Gather / use | E | X | ✋ |
| Use the tool in hand | F or click | B | 🪓 |
| Tools | 1–5 | LB / RB | Hotbar |
| Eat or drink / sleep | Q / Z | R3 / D-pad up | 🍽️ / 💤 |
| Bag & crafting / map / journal / menu | Tab / M / J / Esc | Y / View / — / Start | 🎒 / 🗺️ / ☰ |
| Item guide (every item: where to find it, what it is for) | I | In the menu | In the menu |
| How to play (goal, needs, day one, recipes, ways home, controls, tips) | H | In the menu | ❓ |

## Code

Plain ES modules and [three.js](https://threejs.org/) from a CDN, with no build step. All sound is synthesized with Web Audio. Add `?fx=low` to the address to turn shadows off.

- `js/data.js`: items, food, recipes, rates, what washes ashore, ships, the journal and the endings
- `js/world.js`: the island's shape and where everything is
- `js/survive.js`: the rules: time and weather, the body, gathering, crafting, building, fire, cooking, crates, ships, sleep and the voyage (no DOM)
- `js/scene.js`: meshes for the island, sky, plants, buildings, Josh and his family, animals, the ship and home
- `js/main.js`: the intro, play, the HUD and panels, and the endings
- `tools/test.mjs`: `npm test` checks the data and the island, how the body behaves, and plays two careful survivors who get home by signal fire and by raft
