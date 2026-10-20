// DRIFTWOOD HOME — the data: items, food, recipes, buildings, how fast Josh gets hungry, what washes ashore, and the
// pages of his journal. Names are [中文, English]. No DOM.

// ---------------------------------------------------------------- time
export const START_HOUR = 7;            // Josh wakes on the beach at seven in the morning of day 1
export const SECONDS_PER_HOUR = 12;     // real seconds in one game hour (a day is about five minutes)
export const NIGHT = (h) => h < 6 || h >= 19.5;

// ---------------------------------------------------------------- items
// food: hunger / thirst restored (raw meat can make you sick), tool: what it does
const I = (zh, en, icon, extra = {}) => ({ name: [zh, en], icon, ...extra });
export const ITEMS = {
  stick:    I('樹枝', 'Stick', '🥢'),
  wood:     I('木頭', 'Log', '🪵'),
  stone:    I('石頭', 'Stone', '🪨'),
  flint:    I('燧石', 'Flint', '💠'),
  fiber:    I('植物纖維', 'Fibre', '🌾'),
  leaf:     I('棕櫚葉', 'Palm leaf', '🌿'),
  rope:     I('繩子', 'Rope', '🪢'),
  cloth:    I('布', 'Cloth', '🧣'),
  tarp:     I('防水布', 'Tarp', '⛺'),
  nails:    I('釘子', 'Nails', '📌'),
  bottle:   I('空瓶子', 'Empty bottle', '🧴'),
  water:    I('一瓶清水', 'Bottle of water', '💧', { drink: 35, gives: 'bottle' }),
  coconut:  I('椰子', 'Coconut', '🥥', { food: 12, drink: 18, needs: 'stone' }),
  berries:  I('野莓', 'Berries', '🫐', { food: 7, drink: 3 }),
  banana:   I('香蕉', 'Banana', '🍌', { food: 14 }),
  crab:     I('生螃蟹', 'Raw crab', '🦀', { food: 6, raw: true, cooks: 'crabc' }),
  crabc:    I('烤螃蟹', 'Roast crab', '🍤', { food: 24 }),
  fish:     I('生魚', 'Raw fish', '🐟', { food: 8, raw: true, cooks: 'fishc' }),
  fishc:    I('烤魚', 'Grilled fish', '🍢', { food: 30 }),
  knife:    I('石刀', 'Stone knife', '🔪', { tool: 'knife' }),
  axe:      I('石斧', 'Stone axe', '🪓', { tool: 'axe' }),
  spear:    I('魚叉', 'Spear', '🔱', { tool: 'spear' }),
  torch:    I('火把', 'Torch', '🔥', { tool: 'torch' }),
  compass:  I('指南針', 'Compass', '🧭'),
  map:      I('海圖', 'Sea chart', '🗺️'),
  flare:    I('信號彈', 'Flare gun', '🎆'),
  photo:    I('家人的照片', 'Family photo', '🖼️'),
};
// the item guide: what each thing is for, and where it comes from
export const ITEM_INFO = {
  stick:   [['撿地上的樹枝堆，或在叢林樹旁按 E', 'Stick piles on the ground, or press E at a jungle tree'], ['營火、工具、火把、雨水收集器、船帆；也能當柴燒（1 小時）', 'Campfires, tools, torches, the rain catcher, the sail; burns for 1 hour']],
  wood:    [['手拿石斧，對叢林樹或棕櫚樹按 E 或 F 砍倒', 'Hold the stone axe and press E or F at a jungle tree or palm'], ['避難小屋、信號火堆、木筏、船槳；最好的柴（3 小時）', 'The shelter, signal fire, raft and oar; the best fuel (3 hours)']],
  stone:   [['海灘和草地上的石頭', 'Loose stones on the beach and in the grass'], ['石刀、石斧、魚叉、營火；吃椰子時要用石頭敲開', 'Knife, axe, spear, campfire; you also need one to crack coconuts']],
  flint:   [['山坡上的深色岩石', 'The dark rocks on the hillside'], ['和石刀一起用來點火（不會用掉）', 'With the knife, strikes sparks to light fires (it is not used up)']],
  fiber:   [['草叢按 E（拿著石刀能拿更多）', 'Grass clumps (more if you hold the knife)'], ['繩子、工具的綁繩、火把', 'Rope, tool bindings, torches']],
  leaf:    [['棕櫚樹按 E（拿著石刀一次兩片）', 'Palm trees (two at a time with the knife)'], ['雨水收集器、避難小屋屋頂、信號火堆；也能燒', 'The rain catcher, the shelter roof, the signal fire; it also burns']],
  rope:    [['用 3 份纖維做，漂流箱裡也有', 'Made from 3 fibre; also found in crates'], ['避難小屋、木筏、船帆', 'The shelter, the raft and the sail']],
  cloth:   [['翻覆的船和漂流箱', 'The capsized boat and the crates'], ['目前沒有用途，留著當紀念', 'No use yet: a keepsake from the boat']],
  tarp:    [['第 3 天之後的漂流箱', 'A crate from day 3 on'], ['做木筏的船帆', 'The raft’s sail']],
  nails:   [['漂流箱（第 3 天起）', 'Crates (from day 3)'], ['蓋木筏', 'Building the raft']],
  bottle:  [['翻覆的船、漂流箱', 'The capsized boat and the crates'], ['在泉水或雨水收集器裝水，帶著走', 'Fill it at the spring or the rain catcher to carry water']],
  water:   [['用空瓶在泉水或雨水收集器裝', 'Fill an empty bottle at the spring or the rain catcher'], ['喝了解渴（+35），出海要帶 3 瓶', 'Drink for +35 water; take 3 bottles on the voyage']],
  coconut: [['棕櫚樹按 E 搖下來（每天會再長）', 'Shake a palm with E (they grow back each day)'], ['吃喝都補（食物 +12、水 +18），要有石頭才能敲開', 'Food +12 and water +18; you need a stone to crack it']],
  berries: [['野莓叢', 'Berry bushes'], ['食物 +7、水 +3', 'Food +7, water +3']],
  banana:  [['香蕉樹', 'Banana plants'], ['食物 +14', 'Food +14']],
  crab:    [['拿刀或魚叉，在海灘上的螃蟹旁按 E', 'With a knife or spear, press E by a crab on the beach'], ['生吃可能拉肚子，放在營火上烤熟', 'Eaten raw it may make you sick; cook it at a fire']],
  crabc:   [['在燒著的營火烤生螃蟹', 'Cook a raw crab at a lit campfire'], ['食物 +24', 'Food +24']],
  fish:    [['拿著魚叉在淺水游泳，靠近魚按 E 或 F', 'Swim in the shallows holding the spear, and press E or F near a fish'], ['生吃可能拉肚子，放在營火上烤熟', 'Eaten raw it may make you sick; cook it at a fire']],
  fishc:   [['在燒著的營火烤生魚', 'Cook a raw fish at a lit campfire'], ['食物 +30，最飽的食物', 'Food +30: the most filling food']],
  knife:   [['製作：石頭 2、纖維 1', 'Make: 2 stone, 1 fibre'], ['點火（配燧石）、多拿纖維和葉子、抓螃蟹', 'Lighting fires (with flint), more fibre and leaves, catching crabs']],
  axe:     [['製作：樹枝 2、石頭 2、纖維 2', 'Make: 2 sticks, 2 stone, 2 fibre'], ['砍樹得到木頭', 'Chopping trees for logs']],
  spear:   [['製作：樹枝 2、石頭 1、纖維 1', 'Make: 2 sticks, 1 stone, 1 fibre'], ['抓螃蟹、在淺水叉魚', 'Catching crabs, and fish in the shallows']],
  torch:   [['在燒著的營火旁製作：樹枝 1、纖維 1', 'Make beside a lit fire: 1 stick, 1 fibre'], ['拿在手上照明、稍微取暖，也能點燃信號火', 'Light and a little warmth in your hand; it can light the signal fire']],
  compass: [['第 5 天的漂流箱', 'The crate on day 5'], ['自己划木筏回家的必要裝備', 'Needed to sail home by raft']],
  map:     [['第 6 天的漂流箱', 'The crate on day 6'], ['自己划木筏回家的必要裝備', 'Needed to sail home by raft']],
  flare:   [['第 8 天的漂流箱', 'The crate on day 8'], ['有船經過時發射，立刻獲救', 'Fire it while a ship is passing to be rescued at once']],
  photo:   [['第 4 天的漂流箱', 'The crate on day 4'], ['家人的照片——提醒自己為什麼要回家', 'Your family: a reminder of why you must get home']],
};
export const FOOD_IDS = Object.keys(ITEMS).filter((k) => ITEMS[k].food || ITEMS[k].drink);
export const TOOLS = ['knife', 'axe', 'spear', 'torch'];

// ---------------------------------------------------------------- crafting: things to carry, and things to build
// needs: { item: count }; place: built in the world in front of Josh; near: must be next to a lit fire
export const RECIPES = [
  { id: 'knife', name: ['石刀', 'Stone knife'], needs: { stone: 2, fiber: 1 }, note: ['割葉子、剖椰子，打燧石生火', 'Cuts leaves, opens coconuts, strikes flint for fire'] },
  { id: 'axe', name: ['石斧', 'Stone axe'], needs: { stick: 2, stone: 2, fiber: 2 }, note: ['砍樹得到木頭', 'Chop trees for logs'] },
  { id: 'spear', name: ['魚叉', 'Spear'], needs: { stick: 2, stone: 1, fiber: 1 }, note: ['抓螃蟹、在淺水叉魚', 'Catch crabs, and fish in the shallows'] },
  { id: 'rope', name: ['繩子', 'Rope'], needs: { fiber: 3 }, note: ['用纖維搓成', 'Twisted from fibre'] },
  { id: 'torch', name: ['火把', 'Torch'], needs: { stick: 1, fiber: 1 }, near: 'fire', note: ['夜裡照路，也能點燃信號火', 'Light at night; it can also light the signal fire'] },
  { id: 'fire', name: ['營火', 'Campfire'], needs: { stick: 5, stone: 4 }, place: true, note: ['取暖、烤食物；用燧石和石刀點火', 'Warmth and cooking; light it with flint and a knife'] },
  { id: 'collector', name: ['雨水收集器', 'Rain catcher'], needs: { stick: 4, leaf: 4 }, place: true, note: ['下雨時接水，可以裝瓶', 'Catches rain to fill bottles'] },
  { id: 'shelter', name: ['避難小屋', 'Lean-to shelter'], needs: { wood: 6, leaf: 8, rope: 2 }, place: true, note: ['在裡面睡覺最暖、恢復最快，也會存檔', 'Sleep here: warmest and most restful, and it saves'] },
  { id: 'signal', name: ['信號火堆', 'Signal fire'], needs: { wood: 8, leaf: 6 }, place: true, hill: true, note: ['要蓋在山頂；看到船經過時點燃', 'Build it on the hilltop; light it when a ship passes'] },
  { id: 'raft', name: ['木筏', 'Raft'], needs: { wood: 12, rope: 6, nails: 1 }, place: true, shore: true, note: ['要蓋在海邊', 'Build it at the water\'s edge'] },
  { id: 'sail', name: ['船帆', 'Sail'], needs: { tarp: 1, stick: 2, rope: 1 }, onto: 'raft', note: ['裝在木筏上', 'Fitted to the raft'] },
  { id: 'oar', name: ['船槳', 'Oar'], needs: { wood: 2 }, onto: 'raft', note: ['裝在木筏上', 'Fitted to the raft'] },
];
// what a voyage home needs on board
export const VOYAGE = { items: { compass: 1, map: 1 }, water: 3, food: 3 };

// ---------------------------------------------------------------- the body: per game hour
export const RATE = { hunger: 4, thirst: 5, energy: 3.2, sprintEnergy: 10, sleepShelter: 16, sleepGround: 8, starve: 7, parched: 9, freeze: 6, exhausted: 4, heal: 2.5, sick: 12 };
// warmth drifts towards how warm it is around Josh
export const WARM = { day: 72, night: 34, rain: -16, wet: -14, fire: 92, shelter: 14, torch: 8 };

// ---------------------------------------------------------------- what washes ashore: crates on the beach each morning
// (some things are sure to come by a certain day, so both ways home are always possible)
export const CRATES = {
  sure: { 1: ['bottle', 'cloth'], 2: ['rope', 'bottle'], 3: ['tarp', 'nails'], 4: ['photo', 'cloth'], 5: ['compass', 'rope'], 6: ['map', 'nails'], 8: ['flare'] },
  random: ['cloth', 'rope', 'bottle', 'nails', 'coconut', 'banana', 'rope', 'cloth'],
};
// ships pass on these days, between these hours, and stay in sight this long (hours)
export const SHIPS = [{ day: 4, hour: 10 }, { day: 7, hour: 14 }, { day: 10, hour: 9 }, { day: 13, hour: 15 }, { day: 16, hour: 11 }];
export const SHIP_HOURS = 2.5;

// ---------------------------------------------------------------- the journal
export const JOURNAL = {
  wake: ['我在一片沙灘上醒來。船呢？昨晚的暴風雨把船整個翻了過來……我得先找水和吃的。', 'I woke up on a beach. Where is the boat? Last night the storm flipped it right over… First I need water and food.'],
  water: ['山腳下有一口泉水！至少不會渴死了。', 'There is a spring at the foot of the hill! At least I will not die of thirst.'],
  knife: ['用石頭和纖維做了一把粗糙的刀。有工具，心裡踏實多了。', 'Made a rough knife from stones and fibre. Having a tool makes me feel steadier.'],
  fire: ['火！我生起火了。火光讓這座島沒那麼可怕。', 'Fire! I got a fire going. The light makes this island a little less frightening.'],
  night: ['天黑了，好冷。我好想家，想念壁爐和熱湯。', 'Night has come and it is cold. I miss home: the fireplace, a bowl of hot soup.'],
  shelter: ['蓋好一間小屋。今晚可以好好睡一覺。', 'Built a little shelter. Tonight I can sleep properly.'],
  crate: ['海浪沖上來一個箱子，是我船上的東西！也許每天都會有東西漂過來。', 'The waves brought a crate ashore: things from my boat! Maybe more will drift in every day.'],
  photo: ['箱子裡有一張家人的照片，被海水泡皺了。我一定要回去。', 'In the crate, a photo of my family, crinkled by the sea. I have to get back to them.'],
  ship: ['遠方有一艘船！要是山頂有信號火就好了……', 'A ship on the horizon! If only there were a signal fire on the hilltop…'],
  signal: ['山頂的信號火堆蓋好了。下次看到船，我就點燃它。', 'The signal fire on the hilltop is ready. Next time I see a ship, I will light it.'],
  compass: ['找到我的指南針了。只要再有海圖，也許能自己划回家。', 'Found my compass. With a chart, maybe I could sail home myself.'],
  raft: ['木筏完成了。帶上水和食物、指南針和海圖，就能出發。', 'The raft is finished. With water and food, the compass and the chart, I can set out.'],
  storm: ['暴風雨來了。得找地方躲雨、讓火別熄掉。', 'A storm is coming. I need cover, and to keep the fire alive.'],
  sick: ['吃了生的東西，肚子好痛……以後還是烤熟再吃。', 'Ate something raw and my stomach hurts… Better cook things from now on.'],
};
export const ENDINGS = {
  rescue: ['獲救', 'Rescued', '船上的人看到了濃煙，放下小艇划過來。「你還好嗎？我們帶你回家。」', 'The crew saw the smoke and rowed a boat ashore. “Are you all right? We are taking you home.”'],
  raft: ['自己划回家', 'Sailed home', '跟著指南針和海圖，Josh 在海上漂了兩天兩夜，終於看到了熟悉的燈塔。', 'Following the compass and the chart, Josh sailed two days and two nights, until at last he saw the lighthouse he knew.'],
  home: ['家', 'Home', '門一打開，壁爐的火正暖，狗衝過來撲進他懷裡，家人哭著笑著抱住他。Josh 回家了。', 'The door opens on a warm fire. The dog leaps into his arms, and his family, laughing and crying, hold him tight. Josh is home.'],
};
export const newState = () => ({ v: 1, time: START_HOUR, hp: 100, hunger: 80, thirst: 60, energy: 85, warmth: 70, sick: 0, wet: 0,
  inv: {}, hot: [null, null, null, null, null], hand: null, built: [], raft: null, journal: ['wake'], seen: {}, crates: {}, gathered: {}, signalLit: false, ending: null, deaths: 0 });
