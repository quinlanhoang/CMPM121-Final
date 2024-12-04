import "./style.css";

// dom elements
const canvas = document.getElementById("game-grid") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const typeDisplay = document.getElementById("plant-type") as HTMLElement;
const waterDisplay = document.getElementById("plant-water") as HTMLElement;
const sunDisplay = document.getElementById("plant-sun") as HTMLElement;
const nextDayButton = document.getElementById("next-day-button") as HTMLElement;
const sowButton = document.getElementById("sow-button") as HTMLElement;
const reapButton = document.getElementById("reap-button") as HTMLElement;
const inventoryContainer = document.getElementById("inventory-container")!;
const plantHelp = document.getElementById("plant-help") as HTMLElement;
const plantHelpToolTip = document.getElementById("plant-help-tool-tip")!;

// defining plant type enum for easy reference across the application
enum PlantType {
  None = "None",
  Circle = "Circle",
  Triangle = "Triangle",
  Square = "Square",
}

// definition of a grid cell and its properties
interface Cell {
  sun: number; 
  water: number;
  growth: number; // 0 = barren; 1-3 = plant growth stages
  plant: PlantType; 
}

// global state variables
const ROWS = 10; 
const COLS = 12; 
let CELL_SIZE = 0; 
let CELL_PADDING = 0;
let GRID_PADDING = 0; 
const player = { x: 0, y: 0 }; // player’s current position in the grid
let selectedInventoryPlant: PlantType | null = null; // plant selected for sowing

const inventory: { [key in PlantType]: number } = {
  [PlantType.Circle]: 0,
  [PlantType.Triangle]: 0,
  [PlantType.Square]: 0,
};

let grid: Cell[][] = []; 

// initializes the grid with random plants and empty cells
function initializeGrid() {
  grid = [];
  for (let row = 0; row < ROWS; row++) {
    const newRow: Cell[] = [];
    for (let col = 0; col < COLS; col++) {
      if (Math.random() < 0.3) {
        // 30% chance to randomly place a plant
        newRow.push({
          sun: 0,
          water: 0,
          growth: 1,
          plant: randomPlantType(),
        });
      } else {
        // empty cell
        newRow.push({
          sun: 0,
          water: 0,
          growth: 0,
          plant: PlantType.None,
        });
      }
    }
    grid.push(newRow);
  }
}

// returns a random plant type
function randomPlantType(): PlantType {
  const rand = Math.random();
  if (rand < 0.33) return PlantType.Circle;
  if (rand < 0.66) return PlantType.Triangle;
  return PlantType.Square;
}

// calculates the size of canvas dynamically based on window size
function recalculateDimensions() {
  const MIN_PADDING = 10;
  const MAX_PADDING = 30;

  // dynamically calculate cell and padding sizes
  const maxSize = Math.min(globalThis.innerWidth * 0.6, globalThis.innerHeight * 0.8);
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

// draws the grid and the plants inside it
function drawGrid() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = GRID_PADDING + col * (CELL_SIZE + CELL_PADDING);
      const y = GRID_PADDING + row * (CELL_SIZE + CELL_PADDING);
      const cell = grid[row][col];

      // set background color based on plant type
      ctx.fillStyle = "#d2b48c"; // default dirt
      if (cell.plant !== PlantType.None) {
        if (cell.growth === 1) ctx.fillStyle = "#3a5f0b";
        if (cell.growth === 2) ctx.fillStyle = "#2e4b06";
        if (cell.growth === 3) ctx.fillStyle = "#1e3202";
      }
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

      ctx.strokeStyle = "#000000"; // grid border
      ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

      // draw specific plant shapes
      if (cell.plant === PlantType.Circle) drawCircle(x, y);
      if (cell.plant === PlantType.Triangle) drawTriangle(x, y);
      if (cell.plant === PlantType.Square) drawSquare(x, y);
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
  ctx.fillRect(x + CELL_SIZE / 4, y + CELL_SIZE / 4, CELL_SIZE / 2, CELL_SIZE / 2);
}

// draws the player 
function drawPlayer() {
  const x = GRID_PADDING + player.x * (CELL_SIZE + CELL_PADDING) + CELL_SIZE / 2;
  const y = GRID_PADDING + player.y * (CELL_SIZE + CELL_PADDING) + CELL_SIZE / 2;

  ctx.fillStyle = "#000000"; 
  ctx.beginPath();
  ctx.arc(x, y, CELL_SIZE / 4, 0, Math.PI * 2);
  ctx.fill();
}

// sows a selected plant in the current cell if empty
function sowPlant() {
  const cell = grid[player.y][player.x];
  if (!selectedInventoryPlant || cell.plant !== PlantType.None) return;

  cell.plant = selectedInventoryPlant;
  inventory[selectedInventoryPlant]--;
  updateInventoryUI();
  draw();
}

// reaps the plant from the current cell and adds it to the inventory
function reapPlant() {
  const cell = grid[player.y][player.x];
  if (cell.plant !== PlantType.None) {
    inventory[cell.plant]++;
    cell.plant = PlantType.None;
    updateInventoryUI();
    draw();
  }
}

// updates the inventory list displayed in the right sidebar
function updateInventoryUI() {
  inventoryContainer.innerHTML = ""; // clear container
  Object.keys(inventory).forEach(plantType => {
    const li = document.createElement("li");
    li.textContent = `${plantType}: ${inventory[plantType as PlantType]}`;
    li.onclick = () => selectPlantType(plantType as PlantType);

    if (plantType === selectedInventoryPlant) li.classList.add("selected");

    inventoryContainer.appendChild(li);
  });
}

// updates the tooltip in the plant help section dynamically
function updatePlantHelp(cell: Cell) {
  if (cell.plant === PlantType.Circle) {
    plantHelpToolTip.textContent = "circle plants cannot grow if diagonal plots are occupied.";
  } else if (cell.plant === PlantType.Triangle) {
    plantHelpToolTip.textContent = "triangle plants cannot grow if adjacent plots are occupied.";
  } else if (cell.plant === PlantType.Square) {
    plantHelpToolTip.textContent = "square plants cannot grow if surrounding plots are occupied.";
  } else {
    plantHelpToolTip.textContent = "no plants here.";
  }
}

// moves the player and updates ui details of the cell
function movePlayer(dx: number, dy: number) {
  const newX = player.x + dx;
  const newY = player.y + dy;
  if (newX >= 0 && newX < COLS && newY >= 0 && newY < ROWS) {
    player.x = newX;
    player.y = newY;
    const cell = grid[player.y][player.x];
    typeDisplay.textContent = cell.plant;
    waterDisplay.textContent = `${cell.water}`;
    sunDisplay.textContent = `${cell.sun}`;
    updatePlantHelp(cell);
  }
  draw();
}

// simulates the next day by adding water and sunlight to plants
function nextDay() {
  grid.forEach(row =>
    row.forEach(cell => {
      if (cell.plant !== PlantType.None) {
        cell.water = Math.min(cell.water + Math.floor(Math.random() * 21) + 5, 100); // random water
        cell.sun = Math.min(cell.sun + Math.floor(Math.random() * 11) + 5, 100); // random sunlight
      }
    })
  );
  draw();
}

// initializes all input events
function initializeEvents() {
  globalThis.addEventListener("keydown", e => {
    if (e.key === "ArrowUp") movePlayer(0, -1);
    if (e.key === "ArrowDown") movePlayer(0, 1);
    if (e.key === "ArrowLeft") movePlayer(-1, 0);
    if (e.key === "ArrowRight") movePlayer(1, 0);
  });

  sowButton.addEventListener("click", sowPlant);
  reapButton.addEventListener("click", reapPlant);
  nextDayButton.addEventListener("click", nextDay);
}

function initializeGame() {
  initializeGrid();
  recalculateDimensions();
  updateInventoryUI();
  draw();
  initializeEvents();
}

initializeGame();