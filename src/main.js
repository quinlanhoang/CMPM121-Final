if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/src/sw.js");
}

/*
 * Enums
 */

let Weather;
(function (Weather) {
  Weather["Sunny"] = "Sunny";
  Weather["Rainy"] = "Rainy";
  Weather["Normal"] = "Normal";
})(Weather || (Weather = {}));

let PlantType;
(function (PlantType) {
  PlantType["Circle"] = "Circle";
  PlantType["Triangle"] = "Triangle";
  PlantType["Square"] = "Square";
})(PlantType || (PlantType = {}));

/*
 * Util
 */

function flatten(tree) {
  if (tree instanceof Array) {
    const result = [];
    for (const item of tree) {
      for (const subitem of flatten(item)) {
        result.push(subitem);
      }
    }
    return result;
  } else {
    return [tree];
  }
}

function randomItem(from) {
  return from[Math.floor(Math.random() * from.length)];
}

function u8ArrayGetNumber(array, options) {
  let result = 0;
  if (options.width) {
    for (let i = 0; i < options.width; i++) {
      result <<= 8;
      result += array[options.offset + i];
    }
  } else if (options.mask) {
    result = array[options.offset] & options.mask;
    if (options.shift) {
      result >>= options.shift;
    }
  } else {
    result = array[options.offset];
  }
  return result;
}

function u8ArraySetNumber(array, options) {
  let value = options.value;
  if (options.width) {
    for (let i = options.width - 1; i >= 0; i--) {
      array[options.offset + i] = value & 0xff;
      value >>= 8;
    }
  } else if (options.mask) {
    array[options.offset] &= ~options.mask;
    if (options.shift) {
      value <<= options.shift;
    }
    array[options.offset] |= value & options.mask;
  } else {
    array[options.offset] = value;
  }
}

function u8ArrayGetEnum(array, values, options) {
  return values[u8ArrayGetNumber(array, options)];
}

function u8ArraySetEnum(array, values, options) {
  u8ArraySetNumber(
    array,
    Object.assign(Object.assign({}, options), {
      value: values.indexOf(options.value),
    }),
  );
}

function u8ArrayToHex(array) {
  let result = "";
  for (const byte of array) {
    if (byte < 0x10) {
      result += "0";
    }
    result += byte.toString(0x10);
  }
  return result;
}

function u8ArraySetFromHex(array, hex) {
  for (let i = 0; i < hex.length / 2; i++) {
    array[i] = parseInt(hex.slice(2 * i, 2 * (i + 1)), 0x10);
  }
}

function u8ArrayDuplicate(array) {
  const copy = new Uint8Array(array.length);
  for (let i = 0; i < array.length; i++) {
    copy[i] = array[i];
  }
  return copy;
}

/*
 * DOM elements
 */

const canvas = document.getElementById("game-grid");
const ctx = canvas.getContext("2d");
const titleDisplay = document.getElementById("title");
const gameHeading = document.getElementById("game-heading");
const gameStatus = document.getElementById("game-status");
const dayCounterDisplay = document.getElementById("day-counter");
const plantDetailsHeading = document.getElementById("plant-details-heading");
const typeDisplay = document.getElementById("plant-type");
const growthLevelDisplay = document.getElementById("plant-growth-level");
const waterDisplay = document.getElementById("plant-water");
const sunDisplay = document.getElementById("plant-sun");
const canGrowDisplay = document.getElementById("plant-can-grow");
const reapButton = document.getElementById("reap-button");
const sowButton = document.getElementById("sow-button");
const nextDayButton = document.getElementById("next-day-button");
const optionsHeading = document.getElementById("options-heading");
const localeLabel = document.getElementById("locale-label");
const localeSelection = document.getElementById("locale");
const saveSlotLabel = document.getElementById("save-slot-label");
const saveSlotInput = document.getElementById("save-slot");
const saveButton = document.getElementById("save-button");
const loadButton = document.getElementById("load-button");
const eraseSaveButton = document.getElementById("erase-save-button");
const newGameButton = document.getElementById("new-game-button");
const saveLoadStatus = document.getElementById("save-load-status");
const undoButton = document.getElementById("undo-button");
const redoButton = document.getElementById("redo-button");
const inventoryContainer = document.getElementById("inventory-container");
const inventoryHeading = document.getElementById("inventory-heading");
const plantHelpHeading = document.getElementById("plant-help-heading");
const plantHelpToolTip = document.getElementById("plant-help-tool-tip");

/*
 * Localization
 */

const locales = [];

function addLocale(locale) {
  locales.push(locale);
  localeSelection.innerHTML = "";
  for (let i = 0; i < locales.length; i++) {
    localeSelection.innerHTML += `<option value="${i}">${
      locales[i].lang
    }</option>`;
  }
}

addLocale({
  lang: "English",
  gameTitle: "Grid Farmer",
  weathers: {
    [Weather.Normal]: "Normal",
    [Weather.Sunny]: "Sunny",
    [Weather.Rainy]: "Rainy",
  },
  weatherIcons: {
    [Weather.Sunny]: "🌞",
    [Weather.Rainy]: "🌧️",
    [Weather.Normal]: "🌤️",
  },
  plantTypes: {
    [null]: "None",
    [PlantType.Circle]: "Circle",
    [PlantType.Triangle]: "Triangle",
    [PlantType.Square]: "Square",
  },
  plantGrowthLevels: {
    [null]: "N/A",
    1: "1",
    2: "2",
    3: "3",
  },
  [true]: "yes",
  [false]: "no",
  dayCounter: (day, weather) =>
    `Day ${day} ${translate("weatherIcons", weather)}`,
  plantDetailsHeading: "Plant Details",
  plantTypeSummary: (type) => `Type: ${translate("plantTypes", type)}`,
  plantGrowthSummary: (growth) =>
    `Growth Level: ${translate("plantGrowthLevels", growth)}`,
  cellWaterSummary: (water) => `Water: ${water}/100`,
  cellSunSummary: (sun) => `Sun: ${sun}/100`,
  canGrowSummary: (yn) => `Can Grow: ${translate(yn)}`,
  reapButton: "Reap",
  sowButton: "Sow",
  nextDayButton: "Next Day",
  optionsHeading: "Options",
  localeLabel: "Locale",
  saveSlotLabel: "Save slot",
  saveButton: "Save",
  loadButton: "Load",
  eraseSaveButton: "Erase",
  newGameButton: "New Game",
  undoButton: "Undo",
  redoButton: "Redo",
  inventoryHeading: "Inventory",
  inventoryItemButton: (item, quantity) =>
    `${translate("plantTypes", item)}: ${quantity}`,
  plantHelpHeading: "Plant Help",
  weatherDescriptions: {
    [Weather.Normal]: "It's a normal day.",
    [Weather.Sunny]:
      "It's a sunny day! Your plants are soaking up extra sunlight.",
    [Weather.Rainy]: "It's a rainy day! Your plants are getting extra water.",
  },
  plantTypeDescriptions: {
    [null]: "No plant here.",
    [PlantType.Circle]:
      "Circle plants cannot grow if diagonally adjacent plots are occupied.",
    [PlantType.Triangle]:
      "Triangle plants cannot grow if cardinally adjacent plots are occupied.",
    [PlantType.Square]:
      "Square plants cannot grow if any surrounding plots are occupied.",
  },
  plantGrowthDescriptions: {
    1: "Level 1 plants require at least 50 water and 50 sun.",
    2: "Level 2 plants require at least 75 water and 75 sun.",
    3: "This plant has reached its growth limit and must be harvested.",
  },
  cellResourcesDescription: (water, sun) =>
    `This spot has ${water} water and ${sun} sun.`,
  willGrowDescription: "This plant will grow today!",
  willNotGrowDescription: "This plant will not grow today.",
  intro:
    "You are the black dot. Click on an adjacent grid cell to move to it.<br />" +
    'To sow a seed, click on it in your inventory, and then click "Sow."<br />' +
    'To reap a crop, move to the same grid cell as it, and click "Reap."<br />' +
    "You have been asked to prepare a shipment of 100 crops.<br />" +
    "Your goal is to gather that many crops into your inventory to get them ready to ship.",
  moveSuccess: (row, col) => `Moved to cell ${row},${col}.`,
  moveFail: "Can't move there.",
  reapSuccess: (type, growth) =>
    `Reaped lv${translate("plantGrowthLevels", growth)} ${
      translate("plantTypes", type)
    } plant.`,
  reapSuccessOOB: "Reaped some plant somewhere somehow. " +
    "The fact that we don't know what kind of plant was reaped is a bug.",
  reapFail: "No crop on this cell.",
  sowSuccess: (type) => `Planted a ${translate("plantTypes", type)} plant.`,
  sowFailOOB: "Can't sow while out of bounds. " +
    "You should not be out of bounds. This is a bug.",
  sowFailNoSelection: "You haven't selected anything to sow. " +
    "(Hint: click on a seed type in your inventory.)",
  sowFailOccupied: "There is already a plant here. " +
    "(Hint: try reaping it instead.)",
  sowFailNoSeeds: (type) =>
    `You have no ${translate("plantTypes", type)} seeds at this time.`,
  sowFailLogicError: "You should have been able to sow. " +
    "The fact that you could not is a bug, " +
    "or the fail message function is outdated.",
  nextDay: "Advanced to the next day.",
  win: "You win! You have prepared the requested shipment of 100 crops.",
  newGame: "Playing on a new game (not yet saved or loaded).",
  loadSuccess: "Game loaded.",
  loadFail: "There does not seem to be a saved game in this slot.",
  saveSuccess: "Game saved.",
  saveFail:
    "Could not save the game. Check if the page has localStorage permission.",
  askToEraseGame: (slot) => `Really erase save slot ${slot}?`,
  eraseSuccess: "Game erased.",
  eraseFail:
    "Could not erase the saved game. Check if the page has localStorage permission.",
  eraseRedundant: "There is no saved game here to erase.",
  undoSuccess: "Reverted to previous game state.",
  undoFail: "This is the first game state.",
  redoSuccess: "Restored future game state.",
  redoFail: "This is the last game state.",
});

addLocale({
  lang: "中文翻譯得不好",
  gameTitle: "網格農夫",
  weathers: {
    [Weather.Normal]: "多雲",
    [Weather.Sunny]: "陽光明媚",
    [Weather.Rainy]: "下雨天",
  },
  weatherIcons: {
    [Weather.Sunny]: "🌞",
    [Weather.Rainy]: "🌧️",
    [Weather.Normal]: "🌤️",
  },
  plantTypes: {
    [null]: "無植物",
    [PlantType.Circle]: "圓圈",
    [PlantType.Triangle]: "三角形",
    [PlantType.Square]: "方塊",
  },
  plantGrowthLevels: {
    [null]: "不適用",
    1: "1",
    2: "2",
    3: "3",
  },
  [true]: "是的",
  [false]: "不",
  dayCounter: (day, weather) =>
    `第 ${day} 天 ${translate("weatherIcons", weather)}`,
  plantDetailsHeading: "植物細節",
  plantTypeSummary: (type) => `植物類型: ${translate("plantTypes", type)}`,
  plantGrowthSummary: (growth) =>
    `植物生長水平: ${translate("plantGrowthLevels", growth)}`,
  cellWaterSummary: (water) => `水分: ${water}/100`,
  cellSunSummary: (sun) => `陽光: ${sun}/100`,
  canGrowSummary: (yn) => `能否成長: ${translate(yn)}`,
  reapButton: "收割",
  sowButton: "播種",
  nextDayButton: "去第二天",
  optionsHeading: "配置",
  localeLabel: "語言環境",
  saveSlotLabel: "保存槽",
  saveButton: "保存遊戲",
  loadButton: "載入遊戲",
  eraseSaveButton: "刪除",
  newGameButton: "重新開始",
  undoButton: "撤銷",
  redoButton: "重做",
  inventoryHeading: "存貨",
  inventoryItemButton: (item, quantity) =>
    `${translate("plantTypes", item)}: ${quantity}`,
  plantHelpHeading: "植物細節",
  weatherDescriptions: {
    [Weather.Normal]: "今天天氣正常.",
    [Weather.Sunny]: "這是一個陽光明媚的日子! 你的植物正在吸收額外的陽光.",
    [Weather.Rainy]: "這是一個下雨天! 你的植物正在獲得額外的水.",
  },
  plantTypeDescriptions: {
    [null]: "這裡沒有農作物.",
    [PlantType.Circle]: "如果對角相鄰的地塊被佔據, 圓形植物就無法生長.",
    [PlantType.Triangle]: "如果基本上相鄰的地塊都被佔用, 三角形植物就無法生長.",
    [PlantType.Square]: "如果周圍的土地被佔用, 方形植物就無法生長.",
  },
  plantGrowthDescriptions: {
    1: "1 級植物至少需要 50 水和 50 陽光.",
    2: "2 級植物至少需要 75 水和 75 陽光.",
    3: "該植物已達到生長極限, 必須收穫.",
  },
  cellResourcesDescription: (water, sun) =>
    `這個地方有 ${water} 水和 ${sun} 陽光.`,
  willGrowDescription: "這種植物今天就會生長!",
  willNotGrowDescription: "這種植物今天不會生長.",
  intro: "你就是那個黑點. 按一下相鄰的網格單元即可移動到該單元格.<br />" +
    "要播種種子, 請在庫存中按一下它, 然後按一下「播種」.<br />" +
    "要收割作物, 請移動到與其相同的網格單元格, 然後按一下「收割」.<br />" +
    "您被要求準備一批 100 種農作物.<br />" +
    "您的目標是將足夠的農作物收集到您的庫存中, 以便準備好出貨.",
  moveSuccess: (row, col) => `移至儲存格 ${row},${col}.`,
  moveFail: "那裡不能動.",
  reapSuccess: (type, growth) =>
    `收穫 ${translate("plantGrowthLevels", growth)} 級${
      translate("plantTypes", type)
    }植物.`,
  reapSuccessOOB:
    "以某種方式在某處收穫了一些植物. 事實上，我們不知道收穫的是哪一種植物，這是一個小故障.",
  reapFail: "這裡沒有農作物.",
  sowSuccess: (type) => `種植了${translate("plantTypes", type)}植物.`,
  sowFailOOB: "超出範圍時無法播種. 你不應該出界. 這是一個故障.",
  sowFailNoSelection: "您還沒有選擇要播種的種子. (提示: 點擊庫存中的種子類型.)",
  sowFailOccupied: "這裡已經有莊稼了. (提示: 試著收穫它.)",
  sowFailNoSeeds: (type) =>
    `您目前沒有${translate("plantTypes", type)}形式的種子.`,
  sowFailLogicError:
    "你應該能夠種下種子. 事實上, 您不能這樣做是一個故障, 或者失敗訊息功能已經過時.",
  nextDay: "日子過去了.",
  win: "你贏了! 您已準備好所要求的 100 種農作物的發貨.",
  newGame: "正在玩新遊戲 (尚未儲存或載入).",
  loadSuccess: "遊戲已載入.",
  loadFail: "該插槽中似乎沒有已儲存的遊戲.",
  saveSuccess: "遊戲已儲存.",
  saveFail: "無法保存遊戲. 檢查頁面是否有localStorage權限.",
  askToEraseGame: (slot) => `真的刪除保存槽${slot}嗎?`,
  eraseSuccess: "儲存資料已刪除.",
  eraseFail: "無法刪除已儲存的遊戲. 檢查頁面是否有localStorage權限.",
  eraseRedundant: "此插槽不包含要清除的保存資料.",
  undoSuccess: "恢復到之前的遊戲狀態.",
  undoFail: "無法撤銷第一個遊戲狀態.",
  redoSuccess: "恢復了後來的遊戲狀態.",
  redoFail: "無法快轉超出最近的遊戲狀態.",
});

addLocale({
  lang: "ترجمة سيئة للعربية",
  gameTitle: "مزارع الشبكة",
  weathers: {
    [Weather.Normal]: "غائم",
    [Weather.Sunny]: "مشمس",
    [Weather.Rainy]: "ممطر",
  },
  weatherIcons: {
    [Weather.Sunny]: "🌞",
    [Weather.Rainy]: "🌧️",
    [Weather.Normal]: "🌤️",
  },
  plantTypes: {
    [null]: "لا يوجد محصول",
    [PlantType.Circle]: "دائرة",
    [PlantType.Triangle]: "مثلث",
    [PlantType.Square]: "مربع",
  },
  plantGrowthLevels: {
    [null]: "غير قابل للتطبيق",
    1: "1",
    2: "2",
    3: "3",
  },
  [true]: "نعم",
  [false]: "لا",
  dayCounter: (day, weather) =>
    `${translate("weatherIcons", weather)} ${day} اليوم `,
  plantDetailsHeading: "تفاصيل المحصول",
  plantTypeSummary: (type) => `النوع: ${translate("plantTypes", type)}`,
  plantGrowthSummary: (growth) =>
    `مستوى النمو: ${translate("plantGrowthLevels", growth)}`,
  cellWaterSummary: (water) => `الماء: ${water}/100`,
  cellSunSummary: (sun) => `الشمس: ${sun}/100`,
  canGrowSummary: (yn) => `يمكن أن تنمو: ${translate(yn)}`,
  reapButton: "محصول",
  sowButton: "زرع البذور",
  nextDayButton: "اليوم التالي",
  optionsHeading: "إعدادات",
  localeLabel: "لغة",
  saveSlotLabel: "حفظ البيانات الفتحة",
  saveButton: "احفظ بياناتك",
  loadButton: "تحميل البيانات المحفوظة",
  eraseSaveButton: "حذف البيانات",
  newGameButton: "ابدأ من جديد",
  undoButton: "التراجع",
  redoButton: "تقدم سريع",
  inventoryHeading: "المخزون",
  inventoryItemButton: (item, quantity) =>
    `${translate("plantTypes", item)}: ${quantity}`,
  plantHelpHeading: "تفاصيل المحصول",
  weatherDescriptions: {
    [Weather.Normal]: "الطقس اليوم طبيعي.",
    [Weather.Sunny]: "إنه يوم مشمس! نباتاتك تمتص المزيد من ضوء الشمس.",
    [Weather.Rainy]: "إنه يوم ممطر! نباتاتك تحصل على كمية إضافية من الماء.",
  },
  plantTypeDescriptions: {
    [null]: "لا يوجد نبات هنا.",
    [PlantType.Circle]:
      "لا يمكن للنباتات الدائرية أن تنمو إذا كانت الأراضي المجاورة مشغولة قطريًا.",
    [PlantType.Triangle]:
      "لا يمكن للنباتات المثلثية أن تنمو إذا كانت الأراضي المجاورة أفقياً أو رأسياً مشغولة.",
    [PlantType.Square]:
      "لا يمكن للنباتات المربعة أن تنمو إذا كانت أي قطعة أرض محيطة بها مشغولة.",
  },
  plantGrowthDescriptions: {
    1: "تتطلب نباتات المستوى 1 ما لا يقل عن 50 ماء و50 شمسًا.",
    2: "تتطلب نباتات المستوى 2 ما لا يقل عن 75 ماء و75 شمسًا.",
    3: "لقد وصل هذا النبات إلى الحد الأقصى لنموه ويجب حصاده.",
  },
  cellResourcesDescription: (water, sun) =>
    `يحتوي هذا المكان على ${water} ماء و ${sun} شمس.`,
  willGrowDescription: "هذا النبات سوف ينمو اليوم!",
  willNotGrowDescription: "هذا النبات لن ينمو اليوم",
  intro:
    "أنت النقطة السوداء. انقر على خلية الشبكة المجاورة للانتقال إليها.<br />" +
    'لزرع بذرة، انقر عليها في مخزونك، ثم انقر فوق "زرع".<br />' +
    'لحصاد المحصول، انتقل إلى نفس خلية الشبكة التي يوجد بها المحصول، وانقر فوق "حصاد".<br />' +
    "لقد طلب منك تحضير شحنة مكونة من 100 محصول.<br />" +
    "هدفك هو جمع أكبر عدد ممكن من المحاصيل في مخزونك لتكون جاهزة للشحن.",
  moveSuccess: (row, col) => `تم النقل إلى الخلية ${row},${col}.`,
  moveFail: "لا يمكن التحرك هناك.",
  reapSuccess: (type, growth) =>
    `حصد نبات ${translate("plantTypes", type)} المستوى ${
      translate("plantGrowthLevels", growth)
    }.`,
  reapSuccessOOB:
    "لقد حصدت بعض النباتات في مكان ما بطريقة ما. إن حقيقة أننا لا نعرف نوع النبات الذي تم حصاده هي خلل.",
  reapFail: "لا يوجد محصول هنا.",
  sowSuccess: (type) => `زرعت نباتًا من نوع ${translate("plantTypes", type)}.`,
  sowFailOOB:
    "لا يمكنك زرع البذور أثناء وجودك خارج الحدود. يجب أن لا تكون خارج الحدود. هذا خلل.",
  sowFailNoSelection:
    "لم تقم باختيار بذرة لزرعها. (تلميح: انقر على نوع البذرة في مخزونك.)",
  sowFailOccupied: "يوجد بالفعل نبات هنا. (تلميح: حاول حصاده بدلاً من ذلك.)",
  sowFailNoSeeds: (type) =>
    `ليس لديك أي بذور ${translate("plantTypes", type)} في هذا الوقت.`,
  sowFailLogicError:
    "كان من المفترض أن تتمكن من زرع البذرة. والحقيقة أنك لم تتمكن من ذلك هي خلل، أو أن وظيفة رسالة الفشل أصبحت قديمة.",
  nextDay: "لقد وصل اليوم التالي.",
  win: "لقد فزت! لقد قمت بإعداد الشحنة المطلوبة المكونة من 100 محصول.",
  newGame: "اللعب في لعبة جديدة (لم يتم حفظها أو تحميلها بعد).",
  loadSuccess: "تم تحميل اللعبة.",
  loadFail: "يبدو أنه لا توجد لعبة محفوظة في هذه الفتحة.",
  saveSuccess: "تم حفظ اللعبة.",
  saveFail:
    "لم نتمكن من حفظ اللعبة. تحقق مما إذا كانت الصفحة تتمتع بأذونات التخزين المحلي.",
  askToEraseGame: (slot) => `هل تريد حقًا مسح فتحة الحفظ ${slot}؟`,
  eraseSuccess: "تم مسح البيانات.",
  eraseFail:
    "تعذر مسح اللعبة المحفوظة. تحقق مما إذا كانت الصفحة تتمتع بأذونات التخزين المحلي.",
  eraseRedundant: "لا يوجد هنا لعبة محفوظة لمسحها.",
  undoSuccess: "تم التراجع عن الإجراء الأخير.",
  undoFail: "لا يمكنك التراجع عن حالة اللعبة الأولي.",
  redoSuccess: "إعادة التوجيه السريع إلى حالة اللعبة اللاحقة.",
  redoFail: "لا يمكنك التقديم السريع بعد حالة اللعبة الأخيرة.",
});

function translate(key, ...args) {
  const locale = locales[parseInt(localeSelection.value)];
  let translation = locale[key] || key;
  if (typeof translation === "function") {
    translation = translation(...args);
  } else if (typeof translation === "object") {
    for (const subkey of args) {
      translation = translation[subkey];
    }
  }
  return translation;
}

/*
 * Constants and constant-like globals
 */

const ROWS = 10;
const COLS = 12;
const MEMORY_SIZE = 0x170;

let CELL_SIZE = 0;
let CELL_PADDING = 0;
let GRID_PADDING = 0;

/*
 * State management
 */

const undoStack = [new Uint8Array(MEMORY_SIZE)];
const redoStack = [];

const state = {
  get saveSlot() {
    return parseInt(saveSlotInput.value);
  },
  set saveSlot(value) {
    saveSlotInput.value = value.toString();
  },
  player: {
    get row() {
      return u8ArrayGetNumber(lastMemory(), {
        offset: 0x0000,
        mask: 0b11110000,
        shift: 4,
      });
    },
    set row(value) {
      u8ArraySetNumber(lastMemory(), {
        offset: 0x0000,
        value,
        mask: 0b11110000,
        shift: 4,
      });
    },
    get col() {
      return u8ArrayGetNumber(lastMemory(), {
        offset: 0x0000,
        mask: 0b00001111,
      });
    },
    set col(value) {
      u8ArraySetNumber(lastMemory(), {
        offset: 0x0000,
        value,
        mask: 0b00001111,
      });
    },
  },
  get weather() {
    return u8ArrayGetEnum(lastMemory(), weathersByNumber, {
      offset: 0x0001,
      mask: 0b00001100,
      shift: 2,
    });
  },
  set weather(value) {
    u8ArraySetEnum(lastMemory(), weathersByNumber, {
      offset: 0x0001,
      value,
      mask: 0b00001100,
      shift: 2,
    });
  },
  get selectedInventoryPlant() {
    return u8ArrayGetEnum(lastMemory(), plantTypesByNumber, {
      offset: 0x0001,
      mask: 0b00000011,
    });
  },
  set selectedInventoryPlant(value) {
    u8ArraySetEnum(lastMemory(), plantTypesByNumber, {
      offset: 0x0001,
      value,
      mask: 0b00000011,
    });
  },
  get day() {
    return u8ArrayGetNumber(lastMemory(), {
      offset: 0x0002,
    });
  },
  set day(value) {
    u8ArraySetNumber(lastMemory(), {
      offset: 0x0002,
      value,
    });
  },
  inventory: {
    get Circle() {
      return u8ArrayGetNumber(lastMemory(), {
        offset: 0x0003,
      });
    },
    set Circle(value) {
      u8ArraySetNumber(lastMemory(), {
        offset: 0x0003,
        value,
      });
    },
    get Triangle() {
      return u8ArrayGetNumber(lastMemory(), {
        offset: 0x0004,
      });
    },
    set Triangle(value) {
      u8ArraySetNumber(lastMemory(), {
        offset: 0x0004,
        value,
      });
    },
    get Square() {
      return u8ArrayGetNumber(lastMemory(), {
        offset: 0x0005,
      });
    },
    set Square(value) {
      u8ArraySetNumber(lastMemory(), {
        offset: 0x0005,
        value,
      });
    },
  },
  grid(row, col) {
    const offset = 0x0006 + (row * COLS + col) * 0x0003;
    const cell = {
      row,
      col,
      get sun() {
        return u8ArrayGetNumber(lastMemory(), {
          offset,
        });
      },
      set sun(value) {
        u8ArraySetNumber(lastMemory(), {
          offset,
          value,
        });
      },
      get water() {
        return u8ArrayGetNumber(lastMemory(), {
          offset: offset + 0x0001,
        });
      },
      set water(value) {
        u8ArraySetNumber(lastMemory(), {
          offset: offset + 0x0001,
          value,
        });
      },
      get plant() {
        if (
          u8ArrayGetNumber(lastMemory(), {
            offset: offset + 0x0002,
            mask: 0b11110000,
            shift: 4,
          }) == 0
        ) {
          return null;
        } else {
          const plant = {
            get type() {
              return u8ArrayGetEnum(lastMemory(), plantTypesByNumber, {
                offset: offset + 0x0002,
                mask: 0b11110000,
                shift: 4,
              });
            },
            set type(value) {
              u8ArraySetEnum(lastMemory(), plantTypesByNumber, {
                offset: offset + 0x0002,
                value,
                mask: 0b00001111,
                shift: 4,
              });
            },
            get growth() {
              return u8ArrayGetNumber(lastMemory(), {
                offset: offset + 0x0002,
                mask: 0b00001111,
              });
            },
            set growth(value) {
              u8ArraySetNumber(lastMemory(), {
                offset: offset + 0x0002,
                value,
                mask: 0b00001111,
              });
            },
          };
          return plant;
        }
      },
      set plant(value) {
        if (value) {
          u8ArraySetEnum(lastMemory(), plantTypesByNumber, {
            offset: offset + 0x02,
            value: value.type,
            mask: 0b11110000,
            shift: 4,
          });
          u8ArraySetNumber(lastMemory(), {
            offset: offset + 0x02,
            value: value.growth,
            mask: 0b00001111,
          });
        } else {
          u8ArraySetNumber(lastMemory(), {
            offset: offset + 0x02,
            value: 0,
          });
        }
      },
    };
    return cell;
  },
};

function lastMemory() {
  return undoStack[undoStack.length - 1];
}

function beginUndoStep() {
  redoStack.length = 0;
  undoStack.push(u8ArrayDuplicate(lastMemory()));
}

function undo() {
  if (undoStack.length > 1) {
    redoStack.push(undoStack[undoStack.length - 1]);
    undoStack.pop();
    updateDisplay();
    reportUndoSuccess();
    return true;
  } else {
    reportUndoFail();
    return false;
  }
}

function redo() {
  if (redoStack.length > 0) {
    undoStack.push(redoStack[redoStack.length - 1]);
    redoStack.pop();
    updateDisplay();
    reportRedoSuccess();
    return true;
  } else {
    reportRedoFail();
    return false;
  }
}

function serializeStateStacks() {
  return JSON.stringify({
    redoStack: redoStack.map(u8ArrayToHex),
    undoStack: undoStack.map(u8ArrayToHex),
  });
}

function deserializeStateStacks(serialized) {
  const data = JSON.parse(serialized);
  for (
    const transaction of [
      { from: data.undoStack, to: undoStack },
      { from: data.redoStack, to: redoStack },
    ]
  ) {
    transaction.to.length = 0;
    for (const hex of transaction.from) {
      const array = new Uint8Array(MEMORY_SIZE);
      u8ArraySetFromHex(array, hex);
      transaction.to.push(array);
    }
  }
  updateDisplay();
}

function saveGame(slot) {
  const saveKey = `saveSlot${slot || state.saveSlot}`;
  const saveData = serializeStateStacks();
  localStorage.setItem(saveKey, saveData);
  if (localStorage.getItem(saveKey) === saveData) {
    reportSaveSuccess();
    return true;
  } else {
    reportSaveFail();
    return false;
  }
}

function loadGame(slot) {
  const saveKey = `saveSlot${slot || state.saveSlot}`;
  const saveData = localStorage.getItem(saveKey);
  if (saveData) {
    deserializeStateStacks(saveData);
    reportLoadSuccess();
    updateDisplay();
    showTutorialMessage();
    return true;
  } else {
    if (!isAutosaveSlot(slot)) {
      reportLoadFail();
    }
    return false;
  }
}

function eraseGame(slot) {
  const saveKey = `saveSlot${slot || state.saveSlot}`;
  const autoSaveKey = `saveSlot-1`; // Autosave key

  if (localStorage.getItem(saveKey) || localStorage.getItem(autoSaveKey)) {
    localStorage.removeItem(saveKey);
    localStorage.removeItem(autoSaveKey);

    if (localStorage.getItem(saveKey) || localStorage.getItem(autoSaveKey)) {
      reportEraseFail();
      return false;
    } else {
      reportEraseSuccess();
      return true;
    }
  } else {
    reportEraseRedundant();
    return false;
  }
}

function isAutosaveSlot(slot) {
  return !!slot && slot < 0;
}

function autosave() {
  return saveGame(-1);
}

function loadAutosave() {
  return loadGame(-1);
}

function commitState() {
  autosave();
  detectAndReportWin();
}

/*
 * Application logic
 */

const plantGridOffsetsThatMustBeFree = (() => {
  const allGridOffsets = flatten(
    [-1, 0, 1].map((row) => [-1, 0, 1].map((col) => ({ row, col }))),
  );
  const predicates = {
    [PlantType.Circle]: (p) => p.row != 0 && p.col != 0,
    [PlantType.Triangle]: (p) => (p.row == 0) != (p.col == 0),
    [PlantType.Square]: (p) => !(p.row == 0 && p.col == 0),
  };
  const result = {};
  for (const plantType of Object.keys(predicates)) {
    result[plantType] = allGridOffsets.filter(predicates[plantType]);
  }
  return result;
})();

const plantGrowthResourceRequirements = {
  [1]: { sun: 50, water: 50 },
  [2]: { sun: 75, water: 75 },
};

const plantTypesByNumber = [
  null,
  PlantType.Circle,
  PlantType.Triangle,
  PlantType.Square,
];

const weathersByNumber = [
  Weather.Normal,
  Weather.Sunny,
  Weather.Rainy,
];

function applyWeatherEffects() {
  switch (state.weather) {
    case Weather.Sunny:
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const cell = state.grid(row, col);
          cell.sun = Math.min(cell.sun + 20, 100);
        }
      }
      break;
    case Weather.Rainy:
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const cell = state.grid(row, col);
          cell.water = Math.min(cell.water + 20, 100);
        }
      }
      break;
    case Weather.Normal:
      break;
  }
}

function determineWeather() {
  const weatherOptions = [Weather.Sunny, Weather.Rainy, Weather.Normal];
  return randomItem(weatherOptions);
}

function gridPointInBounds(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

function gridPointsAdjacent(a, b) {
  return ((Math.abs(a.row - b.row) == 1 && a.col == b.col) ||
    (Math.abs(a.col - b.col) == 1 && a.row == b.row));
}

function getCell(row, col) {
  if (gridPointInBounds(row, col)) {
    return state.grid(row, col);
  } else {
    return null;
  }
}

function randomPlantType() {
  return randomItem(Object.keys(PlantType));
}

function selectInventoryPlant(plantType) {
  state.selectedInventoryPlant = plantType;
  updateDisplay();
}

function sowPlant() {
  const cell = getCell(state.player.row, state.player.col);
  if (
    !cell ||
    !state.selectedInventoryPlant ||
    cell.plant !== null ||
    state.inventory[state.selectedInventoryPlant] <= 0
  ) {
    showSowFail();
  } else {
    showSowSuccess();
    beginUndoStep();
    cell.plant = {
      type: state.selectedInventoryPlant,
      growth: 1,
    };
    state.inventory[state.selectedInventoryPlant]--;
    updateDisplay();
    commitState();
  }
}

function reapPlant() {
  const cell = getCell(state.player.row, state.player.col);
  if (cell && cell.plant !== null) {
    showReapSuccess();
    beginUndoStep();
    state.inventory[cell.plant.type] += cell.plant.growth;
    cell.plant = null;
    updateDisplay();
    commitState();
  } else {
    showReapFail();
  }
}

function plantHasRoomToGrow(cell) {
  return !!cell.plant &&
    plantGridOffsetsThatMustBeFree[cell.plant.type].every((p) => {
      let _a;
      return !((_a = getCell(cell.row + p.row, cell.col + p.col)) === null ||
          _a === void 0
        ? void 0
        : _a.plant);
    });
}

function plantHasResourcesToGrow(cell) {
  return !!cell.plant &&
    cell.plant.growth in plantGrowthResourceRequirements &&
    cell.sun >= plantGrowthResourceRequirements[cell.plant.growth].sun &&
    cell.water >= plantGrowthResourceRequirements[cell.plant.growth].water;
}

function plantCanGrow(cell) {
  return plantHasRoomToGrow(cell) && plantHasResourcesToGrow(cell);
}

function tryGrowPlant(cell) {
  if (plantCanGrow(cell)) {
    switch (cell.plant.growth) {
      case 1:
        cell.water -= 50;
        break;
      case 2:
        cell.water -= 75;
        break;
    }
    cell.plant.growth++;
    return true;
  } else {
    return false;
  }
}

function growPlants() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      tryGrowPlant(state.grid(row, col));
    }
  }
}

function movePlayer(cols, rows) {
  const newCol = state.player.col + cols;
  const newRow = state.player.row + rows;
  const cell = getCell(newRow, newCol);
  if (cell) {
    beginUndoStep();
    state.player.col = newCol;
    state.player.row = newRow;
    updateDisplay();
    showMoveSuccess();
    commitState();
  } else {
    showMoveFail();
  }
}

function distributeNaturalResources() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = state.grid(row, col);
      cell.water = Math.min(
        cell.water + Math.floor(Math.random() * 21) + 5,
        100,
      );
      cell.sun = Math.min(Math.floor(Math.random() * 100), 100);
    }
  }
}

function nextDay() {
  beginUndoStep();
  state.weather = determineWeather();
  applyWeatherEffects();
  growPlants();
  state.day++;
  distributeNaturalResources();
  updateDisplay();
  commitState();
  reportNextDay();
  updateDayCounter();
}

function gameWon() {
  return state.inventory.Circle + state.inventory.Square +
      state.inventory.Triangle >= 100;
}

/*
 * UI
 */

function recalculateDimensions() {
  const MIN_PADDING = 10;
  const MAX_PADDING = 30;

  let maxSize;
  if (globalThis.innerWidth > globalThis.innerHeight) {
    maxSize = Math.min(
      globalThis.innerWidth * 0.6,
      globalThis.innerHeight * 0.8,
    );
  } else {
    maxSize = Math.min(
      globalThis.innerWidth,
      globalThis.innerHeight * 0.6,
    );
  }

  CELL_SIZE = Math.floor(maxSize / Math.max(ROWS, COLS)) * 0.8;
  CELL_PADDING = Math.floor(CELL_SIZE * 0.2);
  GRID_PADDING = Math.min(MAX_PADDING, Math.max(MIN_PADDING, CELL_PADDING * 2));

  canvas.width = COLS * (CELL_SIZE + CELL_PADDING) + GRID_PADDING * 2;
  canvas.height = ROWS * (CELL_SIZE + CELL_PADDING) + GRID_PADDING * 2;

  if (state) {
    draw();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawPlayer();
}

function gridCellULCorner(row, col) {
  return {
    x: GRID_PADDING + col * (CELL_SIZE + CELL_PADDING),
    y: GRID_PADDING + row * (CELL_SIZE + CELL_PADDING),
  };
}

function canvasPointToGridPoint(x, y) {
  const result = {
    col: Math.floor((x - GRID_PADDING) / (CELL_SIZE + CELL_PADDING)),
    row: Math.floor((y - GRID_PADDING) / (CELL_SIZE + CELL_PADDING)),
  };
  if (!gridPointInBounds(result.row, result.col)) {
    return null;
  } else {
    const ulCorner = gridCellULCorner(result.row, result.col);
    if (
      x - ulCorner.x <= CELL_SIZE &&
      y - ulCorner.y <= CELL_SIZE
    ) {
      return result;
    } else {
      return null;
    }
  }
}

function drawGrid() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const { x, y } = gridCellULCorner(row, col);
      const cell = getCell(row, col);

      if (!cell) {
        console.warn(`Invalid cell at ${row}, ${col}`);
        continue;
      }

      switch (cell.plant?.growth) {
        case 1:
          ctx.fillStyle = "#3a5f0b";
          break;
        case 2:
          ctx.fillStyle = "#2e4b06";
          break;
        case 3:
          ctx.fillStyle = "#1e3202";
          break;
        default:
          ctx.fillStyle = "#d2b48c";
          break;
      }
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = "#000000";
      ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

      if (cell.plant) {
        switch (cell.plant.type) {
          case PlantType.Circle:
            drawCircle(x, y);
            break;
          case PlantType.Triangle:
            drawTriangle(x, y);
            break;
          case PlantType.Square:
            drawSquare(x, y);
            break;
        }
      }
    }
  }
}

function drawCircle(x, y) {
  ctx.fillStyle = "#ff6347";
  ctx.beginPath();
  ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE / 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawTriangle(x, y) {
  ctx.fillStyle = "#ffa500";
  ctx.beginPath();
  ctx.moveTo(x + CELL_SIZE / 2, y + CELL_SIZE / 6);
  ctx.lineTo(x + CELL_SIZE / 6, y + CELL_SIZE * 0.75);
  ctx.lineTo(x + CELL_SIZE * 0.75, y + CELL_SIZE * 0.75);
  ctx.closePath();
  ctx.fill();
}

function drawSquare(x, y) {
  ctx.fillStyle = "#4682b4";
  ctx.fillRect(
    x + CELL_SIZE / 4,
    y + CELL_SIZE / 4,
    CELL_SIZE / 2,
    CELL_SIZE / 2,
  );
}

function drawPlayer() {
  let { x, y } = gridCellULCorner(state.player.row, state.player.col);
  x += CELL_SIZE / 2;
  y += CELL_SIZE / 2;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(x, y, CELL_SIZE / 4, 0, Math.PI * 2);
  ctx.fill();
}

function updateInventoryUI() {
  inventoryContainer.innerHTML = "";
  Object.keys(state.inventory).forEach((plantType) => {
    const li = document.createElement("li");
    li.textContent = translate(
      "inventoryItemButton",
      plantType,
      state.inventory[plantType],
    );
    li.onclick = () => {
      state.selectedInventoryPlant = plantType;
      updateInventoryUI();
    };
    if (plantType === state.selectedInventoryPlant) {
      li.classList.add("selected");
    }
    inventoryContainer.appendChild(li);
  });
}

function updatePlantHelp(cell) {
  const weatherMessage = translate("weatherDescriptions", state.weather);
  let plantMessage = translate(
    "plantTypeDescriptions",
    cell.plant?.type || null,
  );
  if (cell.plant) {
    plantMessage += " " +
      translate("plantGrowthDescriptions", cell.plant.growth);
  }
  plantMessage += " " +
    translate("cellResourcesDescription", cell.water, cell.sun);
  if (cell.plant) {
    plantMessage += " " +
      translate("plantGrowthDescriptions", cell.plant.growth);
    if (plantCanGrow(cell)) {
      plantMessage += " " + translate("willGrowDescription");
    } else {
      plantMessage += " " + translate("willNotGrowDescription");
    }
  }
  plantHelpToolTip.textContent = `${weatherMessage} ${plantMessage}`;
}

function updatePlantSummary(cell) {
  typeDisplay.textContent = translate(
    "plantTypeSummary",
    cell.plant?.type || null,
  );
  growthLevelDisplay.textContent = translate(
    "plantGrowthSummary",
    cell.plant?.growth || null,
  );
  waterDisplay.textContent = translate("cellWaterSummary", cell.water);
  sunDisplay.textContent = translate("cellSunSummary", cell.sun);
  const canGrow = plantCanGrow(cell);
  canGrowDisplay.textContent = translate("canGrowSummary", canGrow);
  canGrowDisplay.className = canGrow ? "success" : "fail";
}

function handleGridClicked(x, y) {
  const gridPoint = canvasPointToGridPoint(x, y);
  if (gridPoint && gridPointsAdjacent(state.player, gridPoint)) {
    movePlayer(
      gridPoint.col - state.player.col,
      gridPoint.row - state.player.row,
    );
  }
}

function handleKey(key) {
  if (key === "ArrowUp") {
    movePlayer(0, -1);
  }
  if (key === "ArrowDown") {
    movePlayer(0, 1);
  }
  if (key === "ArrowLeft") {
    movePlayer(-1, 0);
  }
  if (key === "ArrowRight") {
    movePlayer(1, 0);
  }
  if (key === "r") {
    reapPlant();
  }
  if (key === "s") {
    sowPlant();
  }
  if (key === "n") {
    nextDay();
  }
  if (key === "1") {
    selectInventoryPlant(PlantType.Circle);
  }
  if (key === "2") {
    selectInventoryPlant(PlantType.Triangle);
  }
  if (key === "3") {
    selectInventoryPlant(PlantType.Square);
  }
  if (key === "z") {
    undo();
  }
  if (key === "y") {
    redo();
  }
}

function updateDayCounter() {
  dayCounterDisplay.innerHTML = translate(
    "dayCounter",
    state.day,
    state.weather,
  );
}

function detectAndReportWin() {
  if (gameWon()) {
    undo();
    const hadAlreadyWon = gameWon();
    redo();
    if (!hadAlreadyWon) {
      alert(translate("win"));
    }
  }
}

function updateDisplay() {
  recalculateDimensions();
  updateInventoryUI();
  updateDayCounter();
  const cell = getCell(state.player.row, state.player.col);
  if (cell) {
    updatePlantSummary(cell);
    updatePlantHelp(cell);
  }
  translateLabels();
  draw();
}

function saveLoadNeutralMessage(what) {
  saveLoadStatus.className = "";
  saveLoadStatus.innerHTML = what;
}

function saveLoadFailMessage(what) {
  saveLoadStatus.className = "fail";
  saveLoadStatus.innerHTML = what;
}

function saveLoadSuccessMessage(what) {
  saveLoadStatus.className = "success";
  saveLoadStatus.innerHTML = what;
}

function neutralMessage(what) {
  gameStatus.className = "";
  gameStatus.innerHTML = what;
}

function successMessage(what) {
  gameStatus.className = "success";
  gameStatus.innerHTML = what;
}

function failMessage(what) {
  gameStatus.className = "fail";
  gameStatus.innerHTML = what;
}

function reportLoadFail() {
  saveLoadFailMessage(translate("loadFail"));
}

function reportLoadSuccess() {
  saveLoadSuccessMessage(translate("loadSuccess"));
}

function reportSaveFail() {
  saveLoadFailMessage(translate("saveFail"));
}

function reportSaveSuccess() {
  saveLoadSuccessMessage(translate("saveSuccess"));
}

function askToEraseGame() {
  if (confirm(translate("askToEraseGame", state.saveSlot))) {
    eraseGame();
  }
}

function reportEraseFail() {
  saveLoadFailMessage(translate("eraseFail"));
}

function reportEraseRedundant() {
  saveLoadFailMessage(translate("eraseRedundant"));
}

function reportEraseSuccess() {
  saveLoadSuccessMessage(translate("eraseSuccess"));
}

function reportUndoSuccess() {
  successMessage(translate("undoSuccess"));
}

function reportUndoFail() {
  failMessage(translate("undoFail"));
}

function reportRedoSuccess() {
  successMessage(translate("redoSuccess"));
}

function reportRedoFail() {
  failMessage(translate("redoFail"));
}

function showTutorialMessage() {
  neutralMessage(translate("intro"));
}

function showMoveFail() {
  failMessage(translate("moveFail"));
}

function showMoveSuccess() {
  successMessage(translate("moveSuccess", state.player.row, state.player.col));
}

function showReapFail() {
  failMessage(translate("reapFail"));
}

function showReapSuccess() {
  const cell = getCell(state.player.row, state.player.col);
  if (cell && cell.plant) {
    successMessage(
      translate("reapSuccess", cell.plant.type, cell.plant.growth),
    );
  } else {
    failMessage(translate("reapSuccessOOB"));
  }
}

function showSowFail() {
  const cell = getCell(state.player.row, state.player.col);
  if (!cell) {
    failMessage(translate("sowFailOOB"));
  } else if (!state.selectedInventoryPlant) {
    failMessage(translate("sowFailNoSelection"));
  } else if (cell.plant) {
    failMessage(translate("sowFailOccupied"));
  } else if (state.inventory[state.selectedInventoryPlant] <= 0) {
    failMessage(translate("sowFailNoSeeds", state.selectedInventoryPlant));
  } else {
    failMessage(translate("sowFailLogicError"));
  }
}

function showSowSuccess() {
  successMessage(translate("sowSuccess", state.selectedInventoryPlant));
}

function reportNewGame() {
  saveLoadNeutralMessage(translate("newGame"));
}

function reportNextDay() {
  successMessage(translate("nextDay"));
}

function translateLabels() {
  titleDisplay.textContent = translate("gameTitle");
  gameHeading.textContent = translate("gameTitle");
  plantDetailsHeading.textContent = translate("plantDetailsHeading");
  optionsHeading.textContent = translate("optionsHeading");
  localeLabel.textContent = translate("localeLabel");
  saveSlotLabel.textContent = translate("saveSlotLabel");
  inventoryHeading.textContent = translate("inventoryHeading");
  plantHelpHeading.textContent = translate("plantHelpHeading");
  reapButton.textContent = translate("reapButton");
  sowButton.textContent = translate("sowButton");
  nextDayButton.textContent = translate("nextDayButton");
  saveButton.textContent = translate("saveButton");
  loadButton.textContent = translate("loadButton");
  newGameButton.textContent = translate("newGameButton");
  eraseSaveButton.textContent = translate("eraseSaveButton");
  undoButton.textContent = translate("undoButton");
  redoButton.textContent = translate("redoButton");
}

function updateDisplayAfterChangingLocale() {
  updateDisplay();
  showTutorialMessage();
  saveLoadSuccessMessage(translate("lang"));
}

/*
 * Initialization
 */

function initializeGrid() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = state.grid(row, col);
      cell.sun = 0;
      cell.water = 0;
      cell.plant = (Math.random() < 0.02)
        ? {
          type: randomPlantType(),
          growth: 1,
        }
        : null;
    }
  }
  distributeNaturalResources();
}

function initializeEvents() {
  globalThis.addEventListener("keydown", (e) => handleKey(e.key));
  addEventListener("resize", recalculateDimensions);
  sowButton.addEventListener("click", sowPlant);
  reapButton.addEventListener("click", reapPlant);
  nextDayButton.addEventListener("click", nextDay);
  saveButton.addEventListener("click", () => saveGame());
  loadButton.addEventListener("click", () => loadGame());
  eraseSaveButton.addEventListener("click", askToEraseGame);
  newGameButton.addEventListener("click", initializeGame);
  undoButton.addEventListener("click", undo);
  redoButton.addEventListener("click", redo);
  canvas.addEventListener(
    "click",
    (e) => handleGridClicked(e.offsetX, e.offsetY),
  );
  localeSelection.addEventListener("change", updateDisplayAfterChangingLocale);
}

function grantInitialSeeds() {
  for (const plantType of Object.keys(PlantType)) {
    state.inventory[plantType] = 1;
  }
}

function initializeDayCount() {
  state.day = 1;
}

function initializePlayerPosition() {
  state.player.row = 0;
  state.player.col = 0;
}

function resetStateStacks() {
  undoStack.length = 1;
  redoStack.length = 0;
}

function initializeGame() {
  initializeGrid();
  grantInitialSeeds();
  initializeDayCount();
  initializePlayerPosition();
  resetStateStacks();
  autosave();
  updateDisplay();
  reportNewGame();
  showTutorialMessage();
}

function initializeApp() {
  initializeEvents();
  const hasAutosave = localStorage.getItem("saveSlot-1");
  if (hasAutosave) {
    loadAutosave();
  } else {
    initializeGame();
  }
}

initializeApp();
