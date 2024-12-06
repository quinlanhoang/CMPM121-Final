import "./style.css";

/*
 * Utility
 */

// Variadic tree type
// (e.g. all of the following are NTree<number>:
//    1,
//    [2, 3],
//    [4, [5, 6], 7])
// Currently we only need this to write a definition of flatten() that makes sense.
type NTree<T> = T | NTree<T>[];

// Converts a variadic tree into a flat array
// (e.g. [[1, [2, 3]], [[4, 5], 6], [7, [8], 9]] => [1, 2, 3, 4, 5, 6, 7, 8, 9])
function flatten<T>(tree: NTree<T>): T[] {
  if (tree instanceof Array) {
    const result: T[] = [];
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

function randomItem<T>(from: T[]): T {
  return from[Math.floor(Math.random() * from.length)];
}

function u8ArrayGetNumber(array: Uint8Array, options: {
  offset: number;
  width?: number;
  mask?: number;
  shift?: number;
}) {
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

function u8ArraySetNumber(array: Uint8Array, options: {
  offset: number;
  value: number;
  width?: number;
  mask?: number;
  shift?: number;
}) {
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

function u8ArrayGetEnum<T>(array: Uint8Array, values: T[], options: {
  offset: number;
  width?: number;
  mask?: number;
  shift?: number;
}) {
  return values[u8ArrayGetNumber(array, options)];
}

function u8ArraySetEnum<T>(array: Uint8Array, values: T[], options: {
  offset: number;
  value: T;
  width?: number;
  mask?: number;
  shift?: number;
}) {
  u8ArraySetNumber(array, { ...options, value: values.indexOf(options.value) });
}

// JS has the following two functions already, but TS apparently doesn't.
function u8ArrayToHex(array: Uint8Array): string {
  let result = "";
  for (const byte of array) {
    if (byte < 0x10) {
      result += "0";
    }
    result += byte.toString(0x10);
  }
  return result;
}

function u8ArraySetFromHex(array: Uint8Array, hex: string) {
  for (let i = 0; i < hex.length/2; i++) {
    array[i] = parseInt(hex.slice(2*i, 2*(i + 1)), 0x10);
  }
}

/*
 * DOM elements
 */

const canvas = document.getElementById("game-grid") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const dayCounterDisplay = document.getElementById("day-counter")!;
const typeDisplay = document.getElementById("plant-type")!;
const growthLevelDisplay = document.getElementById("plant-growth-level")!;
const waterDisplay = document.getElementById("plant-water")!;
const sunDisplay = document.getElementById("plant-sun")!;
const canGrowDisplay = document.getElementById("plant-can-grow")!;
const nextDayButton = document.getElementById("next-day-button")!;
const sowButton = document.getElementById("sow-button")!;
const reapButton = document.getElementById("reap-button")!;
const inventoryContainer = document.getElementById("inventory-container")!;
const plantHelpToolTip = document.getElementById("plant-help-tool-tip")!;
const saveSlotInput = document.getElementById("save-slot") as HTMLInputElement;
const saveButton = document.getElementById("save-button")!;
const loadButton = document.getElementById("load-button")!;
const eraseSaveButton = document.getElementById("erase-save-button")!;
const saveLoadStatus = document.getElementById("save-load-status")!;

/*
 * Types
 */

// defining plant type enum for easy reference across the application
enum PlantType {
  Circle = "Circle",
  Triangle = "Triangle",
  Square = "Square",
}

type PlantGrowth = 1 | 2 | 3;

interface Plant {
  type: PlantType;
  growth: PlantGrowth;
}

interface PlantGrowthResources {
  sun: number;
  water: number;
}

interface Point {
  x: number;
  y: number;
}

interface GridPoint {
  row: number;
  col: number;
}

interface Cell extends GridPoint, PlantGrowthResources {
  plant: Plant | null;
}

/*
 * Constants
 */

const ROWS = 10;
const COLS = 12;

// Pseudoconstants (will hardly ever change / changes should only affect presentation, not logic)
let CELL_SIZE = 0;
let CELL_PADDING = 0;
let GRID_PADDING = 0;

const plantGridOffsetsThatMustBeFree: Record<PlantType, GridPoint[]> = (() => {
  // Get rectangle of grid offsets from -1 to 1
  const allGridOffsets: GridPoint[] = flatten(
    [-1, 0, 1].map((row) => [-1, 0, 1].map((col) => ({ row, col }))),
  );
  // Define predicates for which of those offsets must be free
  const predicates: Record<PlantType, (p: GridPoint) => boolean> = {
    [PlantType.Circle]: (p) => p.row != 0 && p.col != 0, // Diagonal neighbors must be free
    [PlantType.Triangle]: (p) => (p.row == 0) != (p.col == 0), // Cardinal neighbors must be free
    [PlantType.Square]: (p) => !(p.row == 0 && p.col == 0), // All neighbors must be free
  };
  // Dictionary of offsets that must be free =
  //    result of filtering rectangle of grid offsets against those predicates
  const result: Partial<Record<PlantType, GridPoint[]>> = {};
  for (const plantType of Object.keys(predicates) as PlantType[]) {
    result[plantType] = allGridOffsets.filter(predicates[plantType]);
  }
  return result as Record<PlantType, GridPoint[]>;
})();

const plantGrowthResourceRequirements: Record<number, PlantGrowthResources> = {
  [1]: { sun: 50, water: 50 },
  [2]: { sun: 75, water: 75 },
};

const plantTypesByNumber: (PlantType | null)[] = [
  null,
  PlantType.Circle,
  PlantType.Triangle,
  PlantType.Square,
];

/*
 * Global state
 */

// This is the only guaranteed way I could find
// to get a "single contiguous byte array" in JavaScript
// as required by F1 assignment details.
// It's going to make things ugly,
// but that's because JavaScript isn't designed
// for guaranteeing data continuity.
// It would be much more straightforward in a language like C.
const memory = new Uint8Array(0x170); // 368-byte address space

// The ugliness of it all will be fully contained
// within the definition of this variable,
// which will use getters and setters
// to insulate the rest of the code from the pointer arithmetic.
const state: {
  saveSlot: number,
  player: GridPoint;
  selectedInventoryPlant: PlantType | null;
  day: number;
  inventory: { [key in PlantType]: number };
  grid(row: number, col: number): Cell;
} = {
  get saveSlot() {
    return parseInt(saveSlotInput.value);
  },
  set saveSlot(value) {
    saveSlotInput.value = value.toString();
  },
  player: {
    get row() {
      return u8ArrayGetNumber(memory, {
        offset: 0x0000,
        mask: 0b11110000,
        shift: 4,
      });
    },
    set row(value) {
      u8ArraySetNumber(memory, {
        offset: 0x0000,
        value,
        mask: 0b11110000,
        shift: 4,
      });
    },
    get col() {
      return u8ArrayGetNumber(memory, {
        offset: 0x0000,
        mask: 0b00001111,
      });
    },
    set col(value) {
      u8ArraySetNumber(memory, {
        offset: 0x0000,
        value,
        mask: 0b00001111,
      });
    },
  },
  get selectedInventoryPlant() {
    return u8ArrayGetEnum(memory, plantTypesByNumber, {
      offset: 0x0001,
    });
  },
  set selectedInventoryPlant(value) {
    u8ArraySetEnum(memory, plantTypesByNumber, {
      offset: 0x0001,
      value,
    });
  },
  get day() {
    return u8ArrayGetNumber(memory, {
      offset: 0x0002,
    });
  },
  set day(value) {
    u8ArraySetNumber(memory, {
      offset: 0x0002,
      value,
    });
  },
  inventory: {
    get Circle() {
      return u8ArrayGetNumber(memory, {
        offset: 0x0003,
      });
    },
    set Circle(value) {
      u8ArraySetNumber(memory, {
        offset: 0x0003,
        value,
      });
    },
    get Triangle() {
      return u8ArrayGetNumber(memory, {
        offset: 0x0004,
      });
    },
    set Triangle(value) {
      u8ArraySetNumber(memory, {
        offset: 0x0004,
        value,
      });
    },
    get Square() {
      return u8ArrayGetNumber(memory, {
        offset: 0x0005,
      });
    },
    set Square(value) {
      u8ArraySetNumber(memory, {
        offset: 0x0005,
        value,
      });
    },
  },
  grid(row, col) {
    const offset = 0x0006 + (row * COLS + col) * 0x0003;
    const cell: Cell = {
      row,
      col,
      get sun() {
        return u8ArrayGetNumber(memory, {
          offset,
        });
      },
      set sun(value) {
        u8ArraySetNumber(memory, {
          offset,
          value,
        });
      },
      get water() {
        return u8ArrayGetNumber(memory, {
          offset: offset + 0x0001,
        });
      },
      set water(value) {
        u8ArraySetNumber(memory, {
          offset: offset + 0x0001,
          value,
        });
      },
      get plant() {
        if (
          u8ArrayGetNumber(memory, {
            offset: offset + 0x0002,
            mask: 0b11110000,
            shift: 4,
          }) == 0
        ) {
          return null;
        } else {
          const plant: Plant = {
            get type() {
              return u8ArrayGetEnum(memory, plantTypesByNumber, {
                offset: offset + 0x0002,
                mask: 0b11110000,
                shift: 4,
              })!;
            },
            set type(value) {
              u8ArraySetEnum(memory, plantTypesByNumber, {
                offset: offset + 0x0002,
                value,
                mask: 0b00001111,
                shift: 4,
              });
            },
            get growth() {
              return u8ArrayGetNumber(memory, {
                offset: offset + 0x0002,
                mask: 0b00001111,
              }) as PlantGrowth;
            },
            set growth(value) {
              u8ArraySetNumber(memory, {
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
          u8ArraySetEnum(memory, plantTypesByNumber, {
            offset: offset + 0x02,
            value: value.type,
            mask: 0b11110000,
            shift: 4,
          });
          u8ArraySetNumber(memory, {
            offset: offset + 0x02,
            value: value.growth,
            mask: 0b00001111,
          });
        } else {
          u8ArraySetNumber(memory, {
            offset: offset + 0x02,
            value: 0,
          });
        }
      },
    };
    return cell;
  },
};

function saveGame(slot?: number) {
  const saveKey = `saveSlot${slot || state.saveSlot}`;
  const hexString = u8ArrayToHex(memory);
  localStorage.setItem(saveKey, hexString);
  if (localStorage.getItem(saveKey) === hexString) {
    reportSaveSuccess();
  } else {
    reportSaveFail();
  }
}

function loadGame(slot?: number) {
  const saveKey = `saveSlot${slot || state.saveSlot}`;
  const hexString = localStorage.getItem(saveKey);
  if (hexString) {
    u8ArraySetFromHex(memory, hexString);
    updateDisplay();
    reportLoadSuccess();
  } else {
    reportLoadFail();
  }
}

function eraseGame(slot?: number) {
  const saveKey = `saveSlot${slot || state.saveSlot}`;
  if (localStorage.getItem(saveKey)) {
    localStorage.removeItem(saveKey);
    if (localStorage.getItem(saveKey)) {
      reportEraseFail();
    } else {
      reportEraseSuccess();
    }
  } else {
    reportEraseRedundant();
  }
}

function commitState() {
  saveGame(-1);
}

/*
 * UI
 */

// calculates the size of canvas dynamically based on window size
function recalculateDimensions() {
  const MIN_PADDING = 10;
  const MAX_PADDING = 30;

  // dynamically calculate cell and padding sizes
  const maxSize = Math.min(
    globalThis.innerWidth * 0.6,
    globalThis.innerHeight * 0.8,
  );
  CELL_SIZE = Math.floor(maxSize / Math.max(ROWS, COLS)) * 0.8;
  CELL_PADDING = Math.floor(CELL_SIZE * 0.2);
  GRID_PADDING = Math.min(MAX_PADDING, Math.max(MIN_PADDING, CELL_PADDING * 2));

  // update canvas dimensions
  canvas.width = COLS * (CELL_SIZE + CELL_PADDING) + GRID_PADDING * 2;
  canvas.height = ROWS * (CELL_SIZE + CELL_PADDING) + GRID_PADDING * 2;

  // redraw the grid and player
  draw();
}

// main function to draw the entire game
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawPlayer();
}

// Canvas offset of upper-lefthand corner of grid point
function gridCellULCorner(row: number, col: number): Point {
  return {
    x: GRID_PADDING + col * (CELL_SIZE + CELL_PADDING),
    y: GRID_PADDING + row * (CELL_SIZE + CELL_PADDING),
  };
}

// Two-dimensional index of grid cell (if any) which contains given canvas offset
function canvasPointToGridPoint(x: number, y: number): GridPoint | null {
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

// draws the grid and the plants inside it
function drawGrid() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const { x, y } = gridCellULCorner(row, col);
      const cell = getCell(row, col)!;

      // set background color based on plant type
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
          break; // default dirt
      }
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

      ctx.strokeStyle = "#000000"; // grid border
      ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

      // draw specific plant shapes
      switch (cell.plant?.type) {
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

// draws a red circle plant
function drawCircle(x: number, y: number) {
  ctx.fillStyle = "#ff6347";
  ctx.beginPath();
  ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE / 4, 0, Math.PI * 2);
  ctx.fill();
}

// draws an orange triangle plant
function drawTriangle(x: number, y: number) {
  ctx.fillStyle = "#ffa500";
  ctx.beginPath();
  ctx.moveTo(x + CELL_SIZE / 2, y + CELL_SIZE / 6);
  ctx.lineTo(x + CELL_SIZE / 6, y + CELL_SIZE * 0.75);
  ctx.lineTo(x + CELL_SIZE * 0.75, y + CELL_SIZE * 0.75);
  ctx.closePath();
  ctx.fill();
}

// draws a blue square plant
function drawSquare(x: number, y: number) {
  ctx.fillStyle = "#4682b4";
  ctx.fillRect(
    x + CELL_SIZE / 4,
    y + CELL_SIZE / 4,
    CELL_SIZE / 2,
    CELL_SIZE / 2,
  );
}

// draws the player
function drawPlayer() {
  let { x, y } = gridCellULCorner(state.player.row, state.player.col);
  x += CELL_SIZE / 2;
  y += CELL_SIZE / 2;

  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(x, y, CELL_SIZE / 4, 0, Math.PI * 2);
  ctx.fill();
}

// updates the inventory list displayed in the right sidebar
function updateInventoryUI() {
  inventoryContainer.innerHTML = ""; // clear container
  (Object.keys(state.inventory) as PlantType[]).forEach((plantType) => {
    const li = document.createElement("li");
    li.textContent = `${plantType}: ${state.inventory[plantType]}`;
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

// updates the tooltip in the plant help section dynamically
function updatePlantHelp(cell: Cell) {
  plantHelpToolTip.textContent = "";
  // describe type
  switch (cell.plant?.type) {
    case PlantType.Circle:
      plantHelpToolTip.textContent +=
        "circle plants cannot grow if diagonal plots are occupied.\n";
      break;
    case PlantType.Triangle:
      plantHelpToolTip.textContent +=
        "triangle plants cannot grow if adjacent plots are occupied.\n";
      break;
    case PlantType.Square:
      plantHelpToolTip.textContent +=
        "square plants cannot grow if surrounding plots are occupied.\n";
      break;
  }
  // describe growth level
  switch (cell.plant?.growth) {
    case 1:
      plantHelpToolTip.textContent +=
        "level 1 plants require at least 50 water and 50 sun.\n";
      break;
    case 2:
      plantHelpToolTip.textContent +=
        "level 2 plants require at least 75 water and 75 sun.\n";
      break;
    case 3:
      plantHelpToolTip.textContent +=
        "this plant has reached its growth limit and must be harvested.\n";
      break;
  }
  // describe resource availability
  plantHelpToolTip.textContent +=
    `currently, this spot has ${cell.water} water and ${cell.sun} sun.\n`;
  // describe whether plant will grow
  if (plantCanGrow(cell)) {
    plantHelpToolTip.textContent += "this plant will grow today!\n";
  } else if (cell.plant) {
    plantHelpToolTip.textContent += "this plant will not grow today.\n";
  } else {
    plantHelpToolTip.textContent += "no plant here.\n";
  }
}

function updatePlantSummary(cell: Cell) {
  typeDisplay.textContent = cell.plant?.type || "None";
  growthLevelDisplay.textContent = `${cell.plant?.growth || 0}`;
  waterDisplay.textContent = `${cell.water}`;
  sunDisplay.textContent = `${cell.sun}`;
  if (plantCanGrow(cell)) {
    canGrowDisplay.textContent = "yes";
    canGrowDisplay.className = "success";
  } else {
    canGrowDisplay.textContent = "no";
    canGrowDisplay.className = "fail";
  }
}

function handleGridClicked(x: number, y: number) {
  const gridPoint = canvasPointToGridPoint(x, y);
  if (gridPoint && gridPointsAdjacent(state.player, gridPoint)) {
    movePlayer(
      gridPoint.col - state.player.col,
      gridPoint.row - state.player.row,
    );
  }
}

function handleKey(key: string) {
  if (key === "ArrowUp") movePlayer(0, -1);
  if (key === "ArrowDown") movePlayer(0, 1);
  if (key === "ArrowLeft") movePlayer(-1, 0);
  if (key === "ArrowRight") movePlayer(1, 0);
  if (key === "r") reapPlant();
  if (key === "s") sowPlant();
  if (key === "n") nextDay();
  if (key === "1") selectInventoryPlant(PlantType.Circle);
  if (key === "2") selectInventoryPlant(PlantType.Triangle);
  if (key === "3") selectInventoryPlant(PlantType.Square);
}

function updateDayCounter() {
  dayCounterDisplay.innerHTML = `Day ${state.day}`;
}

function updateDisplay() {
  updateInventoryUI();
  updateDayCounter();
  const cell = getCell(state.player.row, state.player.col);
  if (cell) {
    updatePlantSummary(cell);
    updatePlantHelp(cell);
  }
  draw();
  if (gameWon()) {
    alert("You win! You have prepared the requested shipment of 100 crops.");
    location.reload();
  }
}

function reportLoadFail() {
  saveLoadStatus.className = "fail";
  saveLoadStatus.innerHTML =
    "There does not seem to be a saved game in this slot.";
}

function reportLoadSuccess() {
  saveLoadStatus.className = "success";
  saveLoadStatus.innerHTML = "Game loaded.";
}

function reportSaveFail() {
  saveLoadStatus.className = "fail";
  saveLoadStatus.innerHTML =
    "Could not save the game. Check if the page has localStorage permission.";
}

function reportSaveSuccess() {
  saveLoadStatus.className = "success";
  saveLoadStatus.innerHTML = "Game saved.";
}

function askToEraseGame() {
  if (confirm(`Really erase save slot ${state.saveSlot}?`)) {
    eraseGame();
  }
}

function reportEraseFail() {
  saveLoadStatus.className = "fail";
  saveLoadStatus.innerHTML =
    "Could not erase the saved game. Check if the page has localStorage permission.";
}

function reportEraseRedundant() {
  saveLoadStatus.className = "fail";
  saveLoadStatus.innerHTML = "There is no saved game here to erase.";
}

function reportEraseSuccess() {
  saveLoadStatus.className = "success";
  saveLoadStatus.innerHTML = "Game erased.";
}

/*
 * Application logic
 */

function gridPointInBounds(row: number, col: number): boolean {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

function gridPointsAdjacent(a: GridPoint, b: GridPoint): boolean {
  return (
    (Math.abs(a.row - b.row) == 1 && a.col == b.col) ||
    (Math.abs(a.col - b.col) == 1 && a.row == b.row)
  );
}

function getCell(row: number, col: number): Cell | null {
  if (gridPointInBounds(row, col)) {
    return state.grid(row, col);
  } else {
    return null;
  }
}

// returns a random plant type
function randomPlantType(): PlantType {
  return randomItem(Object.keys(PlantType) as PlantType[]);
}

function selectInventoryPlant(plantType: PlantType) {
  state.selectedInventoryPlant = plantType;
  updateDisplay();
}

// sows a selected plant in the current cell if empty
function sowPlant() {
  const cell = getCell(state.player.row, state.player.col);
  // skip if:
  if (
    !cell || // cell out of bounds
    !state.selectedInventoryPlant || // no seeds selected
    cell.plant !== null || // cell not empty
    state.inventory[state.selectedInventoryPlant] <= 0 // no seeds available
  ) {
    return;
  }
  cell.plant = {
    type: state.selectedInventoryPlant,
    growth: 1,
  };
  state.inventory[state.selectedInventoryPlant]--;
  updateDisplay();
  commitState();
}

// reaps the plant from the current cell and adds it to the inventory
function reapPlant() {
  const cell = getCell(state.player.row, state.player.col);
  if (cell && cell.plant !== null) {
    state.inventory[cell.plant.type] += cell.plant.growth;
    cell.plant = null;
    updateDisplay();
    commitState();
  }
}

function plantHasRoomToGrow(cell: Cell): boolean {
  return !!cell.plant &&
    plantGridOffsetsThatMustBeFree[cell.plant.type].every((p) =>
      !(getCell(cell.row + p.row, cell.col + p.col)?.plant)
    );
}

function plantHasResourcesToGrow(cell: Cell): boolean {
  return (!!cell.plant &&
    cell.plant.growth in plantGrowthResourceRequirements) &&
    cell.sun >= plantGrowthResourceRequirements[cell.plant.growth].sun &&
    cell.water >= plantGrowthResourceRequirements[cell.plant.growth].water;
}

function plantCanGrow(cell: Cell): boolean {
  return plantHasRoomToGrow(cell) && plantHasResourcesToGrow(cell);
}

function tryGrowPlant(cell: Cell): boolean {
  if (plantCanGrow(cell)) {
    switch (cell.plant!.growth) {
      case 1:
        cell.water -= 50;
        break;
      case 2:
        cell.water -= 75;
        break;
    }
    cell.plant!.growth++;
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

// moves the player and updates ui details of the cell
function movePlayer(cols: number, rows: number) {
  const newCol = state.player.col + cols;
  const newRow = state.player.row + rows;
  const cell = getCell(newRow, newCol);
  if (cell) {
    state.player.col = newCol;
    state.player.row = newRow;
    updateDisplay();
    commitState();
  }
}

function distributeNaturalResources() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = state.grid(row, col);
      cell.water = Math.min(
        cell.water + Math.floor(Math.random() * 21) + 5,
        100,
      ); // random water
      cell.sun = Math.min(Math.floor(Math.random() * 100), 100); // random sunlight
    }
  }
}

// simulates the next day by adding water and sunlight to plants
function nextDay() {
  growPlants(); // intentionally done *before* updating cell resources for next turn
  state.day++;
  distributeNaturalResources();
  updateDisplay();
  commitState();
}

function gameWon(): boolean {
  return state.inventory.Circle + state.inventory.Square +
      state.inventory.Triangle >= 100;
}

/*
 * Initialization
 */

// initializes the grid with random plants and empty cells
function initializeGrid() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = state.grid(row, col);
      cell.sun = 0;
      cell.water = 0;
      cell.plant = (Math.random() < 0.02)
        ? { // 2% chance to randomly place a plant
          type: randomPlantType(),
          growth: 1,
        }
        : null;
    }
  }
  // Distribute first day's resources onto grid
  distributeNaturalResources();
}

// initializes all input events
function initializeEvents() {
  globalThis.addEventListener("keydown", (e) => handleKey(e.key));
  addEventListener("resize", recalculateDimensions);
  sowButton.addEventListener("click", sowPlant);
  reapButton.addEventListener("click", reapPlant);
  nextDayButton.addEventListener("click", nextDay);
  saveButton.addEventListener("click", () => saveGame());
  loadButton.addEventListener("click", () => loadGame());
  eraseSaveButton.addEventListener("click", askToEraseGame);
  canvas.addEventListener(
    "click",
    (e) => handleGridClicked(e.offsetX, e.offsetY),
  );
}

function grantInitialSeeds() {
  for (const plantType of Object.keys(PlantType) as PlantType[]) {
    state.inventory[plantType] = 1;
  }
}

function initializeDayCount() {
  state.day = 1;
}

function initializeGame() {
  initializeGrid();
  recalculateDimensions();
  initializeEvents();
  grantInitialSeeds();
  initializeDayCount();
  updateDisplay();
}

initializeGame();
