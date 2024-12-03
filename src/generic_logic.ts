// Grid-based generic game logic.

import { Camera, Drawable, MainLoop, makeMainLoop, makeSprite } from "./ui.ts";
import { insertSorted, remove } from "./util.ts";

/**
 * `MainLoop` that operates a `Scene`.
 * Construct with `makeGame`.
 */
export interface Game extends MainLoop {
  scene: Scene | null;
}

/**
 * Game object that can be drawn,
 * but does not necessarily have a defined position in the world
 * nor any behavior.
 * Construct with `makeProp`.
 */
export interface Prop {
  /**
   * Lower draw orders are drawn first,
   * meaning they are farther in the background.
   */
  drawOrder: number;
  draw(camera?: Camera): void;
}

/**
 * Game object that has behavior,
 * but does not necessarily have a defined position in the world
 * and cannot necessarily be drawn.
 */
interface Entity {
  get game(): Game;
  get scene(): Scene;
  /**
   * Lower turn orders are processed first in the turn.
   */
  turnOrder: number;
  doTurn(): Promise<void>;
}

/**
 * `Entity` that is not a `Piece`. Construct with `makeCycle`.
 */
export type Cycle = Entity;

/**
 * Game object that has behavior
 * and a defined position in the world,
 * and can be drawn.
 * Construct with `makePiece`.
 */
export interface Piece extends Prop, Entity {
  /**
   * Column index where this piece is located in the scene.
   */
  x: number;
  /**
   * Row index where this piece is located in the scene.
   */
  y: number;
  /**
   * Move speed in cells per tick.
   * Should generally be between 0 and 1.
   */
  moveSpeed: number;
  /**
   * Moves the piece `dx` columns to the right and `dy` columns upward.
   * Motion is gradual and occurs at a rate of `this.moveSpeed` cells per tick.
   * When the returned promise resolves, the piece has arrived
   * at its destination.
   */
  move(dx: number, dy: number): Promise<void>;
  /**
   * Whether a cell occupied by this piece will be considered impassable.
   */
  solid: boolean;
  /**
   * Whether the piece is tagged with the given string.
   */
  hasTag(tag: string): boolean;
  /**
   * X coordinate in world-space pixels (not grid columns).
   */
  get realX(): number;
  /**
   * Y coordinate in world-space pixels (not grid columns).
   */
  get realY(): number;
}

/**
 * Stores a grid of game pieces, and sorted lists of props and entities
 * (including the game pieces) for use in deciding draw and turn order.
 * By this means, provides functionality for drawing the complete game world
 * and orchestrating turns within it.
 * Construct with `makeScene`.
 */
export interface Scene {
  get game(): Game;
  /**
   * World width in grid cells.
   */
  get width(): number;
  /**
   * World height in grid cells.
   */
  get height(): number;
  /**
   * Width of a grid cell in pixels.
   */
  get tileWidth(): number;
  /**
   * Height of a grid cell in pixels.
   */
  get tileHeight(): number;
  /**
   * Whether a turn is currently in progress.
   */
  get busy(): boolean;
  draw(): void;
  /**
   * This callback should do turn-independent per-tick logic.
   * Crucially, this includes deciding on which ticks to pass turns.
   * Other examples of turn-independent per-tick logic
   * might include camera controls or animations.
   * The callback will be run every tick while the game is running.
   */
  tick(): void;
  /**
   * This callback should do turn logic. Turn logic may span
   * multiple ticks. The callback should resolve only when the turn has ended.
   */
  doTurn(): Promise<void>;
  /**
   * Returns whether the given grid cell coordinates
   * are within the bounds of the grid and correspond to a real cell.
   */
  positionInBounds(x: number, y: number): boolean;
  /**
   * Returns an array of all pieces at the given grid cell.
   * The grid cell must actually be within the bounds of the grid.
   * (Pieces may under some circumstances be positioned outside grid bounds,
   * but in that case, they are not tracked.)
   */
  piecesAt(x: number, y: number): Piece[];
  /**
   * Returns whether the given grid cell is free of solid game pieces.
   * The grid cell must actually be within the bounds of the grid.
   * (Pieces may under some circumstances be positioned outside grid bounds,
   * but in that case, they are not tracked.)
   */
  passable(x: number, y: number): boolean;
  /**
   * Adds the given piece to the scene and places it at the given grid cell.
   * If no grid cell is given, the piece is placed at the last grid cell
   * it occupied before it was last removed.
   */
  addPiece(piece: Piece, x?: number, y?: number): void;
  /**
   * Removes the given piece from the scene.
   */
  removePiece(piece: Piece): void;
  /**
   * Adds the given cycle to the scene. It will not be placed on the grid
   * nor drawn anywhere, but it will be allowed to take its turns.
   */
  addCycle(cycle: Cycle): void;
  /**
   * Removes the given cycle from the scene.
   */
  removeCycle(cycle: Cycle): void;
  /**
   * Adds the given prop to the scene. It will not be placed on the grid,
   * but will be drawn however it dictates.
   */
  addProp(prop: Prop): void;
  /**
   * Removes the given prop from the scene.
   */
  removeProp(prop: Prop): void;
  /**
   * If a piece exists with the given tag, returns it. Else returns null.
   */
  pieceWithTag(tag: string): Piece | null;
  /**
   * Returns all pieces in the scene which have the given tag.
   */
  piecesWithTag(tag: string): Piece[];
  /**
   * If any piece at the given grid cell has the given tag, returns it.
   * Else returns null.
   */
  pieceWithTagAt(x: number, y: number, tag: string): Piece | null;
  /**
   * Returns all pieces at the given grid cell which have the given tag.
   */
  piecesWithTagAt(x: number, y: number, tag: string): Piece[];
}

export function makePiece(options: {
  scene: Scene;
  graphic: Drawable;
  drawOrder: number;
  doTurn(this: Piece): Promise<void>;
  turnOrder: number;
  moveSpeed: number;
  solid: boolean;
  tags: string[];
}): Piece {
  const state = {
    row: 0,
    column: 0,
    xOffset: 0,
    yOffset: 0,
    tags: {} as Record<string, boolean>,
  };
  for (const tag of options.tags) {
    state.tags[tag] = true;
  }
  return {
    ...options,
    get game() {
      return this.scene.game;
    },
    draw(camera) {
      options.graphic.draw(this.realX, this.realY, camera || this.game.camera);
    },
    hasTag(tag) {
      return !!state.tags[tag];
    },
    get x() {
      return state.column;
    },
    get y() {
      return state.row;
    },
    get realX() {
      return (this.x + state.xOffset + 0.5) * this.scene.tileWidth;
    },
    get realY() {
      return (this.y + state.yOffset + 0.5) * this.scene.tileHeight;
    },
    set x(x) {
      if (this.x != x) {
        this.scene.removePiece(this);
        state.column = x;
        this.scene.addPiece(this);
      }
    },
    set y(y) {
      if (this.y != y) {
        this.scene.removePiece(this);
        state.row = y;
        this.scene.addPiece(this);
      }
    },
    async move(dx, dy) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dxNorm = dx / dist;
      const dyNorm = dy / dist;
      const xSpeed = dxNorm * this.moveSpeed;
      const ySpeed = dyNorm * this.moveSpeed;
      this.x += dx;
      this.y += dy;
      state.xOffset = -dx;
      state.yOffset = -dy;
      while (
        Math.abs(state.xOffset) > Math.abs(xSpeed) ||
        Math.abs(state.yOffset) > Math.abs(ySpeed)
      ) {
        state.xOffset += xSpeed;
        state.yOffset += ySpeed;
        await this.game.sleep();
      }
      state.xOffset = 0;
      state.yOffset = 0;
    },
  };
}

export function makeCycle(options: {
  scene: Scene;
  doTurn(this: Scene): Promise<void>;
  turnOrder: number;
}): Cycle {
  return {
    ...options,
    get game() {
      return this.scene.game;
    },
    doTurn() {
      return options.doTurn.call(this.scene);
    },
  };
}

export function makeProp(options: {
  draw(camera?: Camera): void;
  drawOrder: number;
}): Prop {
  return { ...options };
}

export function makeScene(options: {
  game: Game;
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  tick(this: Scene): void;
}): Scene {
  const state = {
    drawList: [] as Prop[],
    turnList: [] as Entity[],
    grid: [] as Piece[][][],
    busy: false,
  };
  for (let row = 0; row < options.height; row++) {
    state.grid[row] = [];
    for (let column = 0; column < options.width; column++) {
      state.grid[row][column] = [];
    }
  }
  return {
    ...options,
    get busy() {
      return state.busy;
    },
    draw() {
      for (const prop of state.drawList) {
        prop.draw(this.game.camera);
      }
    },
    async doTurn() {
      if (!this.busy) {
        console.log(state.drawList);
        state.busy = true;
        for (
          const promise of state.turnList.map(
            (entity) => entity.doTurn(),
          )
        ) {
          await promise;
        }
        state.busy = false;
      }
    },
    positionInBounds(x, y) {
      return x >= 0 && x < this.width && y >= 0 && y < this.height;
    },
    piecesAt(x, y) {
      if (this.positionInBounds(x, y)) {
        return [...state.grid[y][x]];
      } else {
        return [];
      }
    },
    passable(x, y) {
      if (!this.positionInBounds(x, y)) {
        return false;
      } else {
        for (const piece of state.grid[y][x]) {
          if (piece.solid) {
            return false;
          }
        }
        return true;
      }
    },
    addPiece(piece, x, y) {
      if (this.positionInBounds(x || piece.x, y || piece.y)) {
        const destination = state.grid[y || piece.y][x || piece.x];
        if (destination.indexOf(piece) < 0) {
          destination.push(piece);
        }
      }
      if (state.drawList.indexOf(piece) < 0) {
        insertSorted(piece, state.drawList, compareProps);
      }
      if (state.turnList.indexOf(piece) < 0) {
        insertSorted(
          piece,
          state.turnList,
          (a, b) => b.turnOrder - a.turnOrder,
        );
      }
      if (x && y) {
        piece.x = x;
        piece.y = y;
      }
    },
    removePiece(piece) {
      if (this.positionInBounds(piece.x, piece.y)) {
        remove(piece, state.grid[piece.y][piece.x]);
      }
      remove(piece, state.drawList);
      remove(piece, state.turnList);
    },
    addCycle(cycle) {
      if (state.turnList.indexOf(cycle) < 0) {
        insertSorted(
          cycle,
          state.turnList,
          (a, b) => a.turnOrder - b.turnOrder,
        );
      }
    },
    removeCycle(cycle) {
      remove(cycle, state.turnList);
    },
    addProp(prop) {
      if (state.drawList.indexOf(prop) < 0) {
        insertSorted(prop, state.drawList, compareProps);
      }
    },
    removeProp(prop) {
      remove(prop, state.drawList);
    },
    pieceWithTag(tag) {
      for (const entity of state.turnList) {
        const piece: Partial<Piece> = entity;
        if (piece.hasTag && piece.hasTag(tag)) {
          return piece as Piece;
        }
      }
      return null;
    },
    piecesWithTag(tag) {
      const result: Piece[] = [];
      for (const entity of state.turnList) {
        const piece: Partial<Piece> = entity;
        if (piece.hasTag && piece.hasTag(tag)) {
          result.push(piece as Piece);
        }
      }
      return result;
    },
    pieceWithTagAt(x, y, tag) {
      if (this.positionInBounds(x, y)) {
        for (const piece of state.grid[y][x]) {
          if (piece.hasTag(tag)) {
            return piece;
          }
        }
        return null;
      } else {
        return null;
      }
    },
    piecesWithTagAt(x, y, tag) {
      if (this.positionInBounds(x, y)) {
        const result: Piece[] = [];
        for (const piece of state.grid[y][x]) {
          if (piece.hasTag(tag)) {
            result.push(piece);
          }
        }
        return result;
      } else {
        return [];
      }
    },
  };
}

export function makeGame(width: number, height: number): Game {
  const mainLoop = makeMainLoop(width, height);
  const state = { scene: null as Scene | null };
  return {
    ...mainLoop,
    get running() {
      return mainLoop.running;
    },
    async start(fps = 60) {
      const mainLoopPromise = mainLoop.start.call(this, fps);
      const scenePromise = (async () => {
        for (; this.running; await this.sleep()) {
          this.scene?.tick();
          this.scene?.draw();
        }
      })();
      await mainLoopPromise;
      await scenePromise;
    },
    get scene() {
      return state.scene;
    },
    set scene(scene) {
      state.scene = scene;
      if (scene) {
        this.camera.worldWidth = scene.width * scene.tileWidth;
        this.camera.worldHeight = scene.height * scene.tileHeight;
        this.camera.x = 0;
        this.camera.y = 0;
        this.camera.zoom = 1;
      }
    },
  };
}

function compareProps(a: Prop, b: Prop): number {
  const pieceA: Partial<Piece> = a;
  const pieceB: Partial<Piece> = b;
  if (a.drawOrder != b.drawOrder) {
    return b.drawOrder - a.drawOrder;
  } else if (pieceA.y && pieceB.y) {
    return pieceA.y - pieceB.y;
  } else {
    return 0;
  }
}

export async function testGenericLogic() {
  const game = makeGame(640, 480);
  game.scene = makeScene({
    game,
    width: 100,
    height: 100,
    tileWidth: 32,
    tileHeight: 32,
    tick() {
      if (
        !this.busy && (
          this.game.input.keyHeld("ArrowUp") ||
          this.game.input.keyHeld("ArrowDown") ||
          this.game.input.keyHeld("ArrowLeft") ||
          this.game.input.keyHeld("ArrowRight")
        )
      ) {
        this.doTurn();
      }
      const player = this.pieceWithTag("player");
      this.game.camera.x = player?.realX || 0;
      this.game.camera.y = player?.realY || 0;
    },
  });
  const bgSprite = await makeSprite("/assets/testbg.png");
  const playerSprite = await makeSprite("/assets/testplayer.png");
  const objectSprite = await makeSprite("/assets/testobject.png");
  game.scene.addProp(makeProp({
    draw(camera) {
      if (camera) {
        bgSprite.draw(
          bgSprite.image.width / 2,
          bgSprite.image.height / 2,
          camera,
        );
      }
    },
    drawOrder: -1000,
  }));
  game.scene.addPiece(
    makePiece({
      scene: game.scene,
      graphic: playerSprite,
      drawOrder: 1,
      async doTurn() {
        if (
          this.game.input.keyHeld("ArrowUp") &&
          this.scene.passable(this.x, this.y - 1)
        ) {
          await this.move(0, -1);
        } else if (
          this.game.input.keyHeld("ArrowDown") &&
          this.scene.passable(this.x, this.y + 1)
        ) {
          await this.move(0, 1);
        } else if (
          this.game.input.keyHeld("ArrowLeft") &&
          this.scene.passable(this.x - 1, this.y)
        ) {
          await this.move(-1, 0);
        } else if (
          this.game.input.keyHeld("ArrowRight") &&
          this.scene.passable(this.x + 1, this.y)
        ) {
          await this.move(1, 0);
        }
      },
      turnOrder: 0,
      moveSpeed: 0.1,
      solid: true,
      tags: ["player"],
    }),
    5,
    5,
  );
  for (let i = 0; i < 100; ++i) {
    const x = Math.floor(Math.random() * 100);
    const y = Math.floor(Math.random() * 100);
    if (x != 5 || y != 5) {
      game.scene.addPiece(
        makePiece({
          scene: game.scene,
          graphic: objectSprite,
          drawOrder: 0,
          async doTurn() {
            const dx = Math.round(Math.random() * 2 - 1);
            const dy = Math.round(Math.random() * 2 - 1);
            if (this.scene.passable(this.x + dx, this.y + dy)) {
              await this.move(dx, dy);
            }
          },
          turnOrder: 1,
          moveSpeed: 0.1,
          solid: true,
          tags: [],
        }),
        x,
        y,
      );
    }
  }
  game.attach();
  game.start();
}
