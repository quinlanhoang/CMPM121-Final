// UI abstractions.

/// Types

/**
 * Couples a canvas and its rendering context
 * with the intended world coordinates of the center of the drawing,
 * thus providing sufficient information for any Drawable
 * to correctly draw itself.
 */
export interface Camera {
  canvas: HTMLCanvasElement;
  renderer: CanvasRenderingContext2D;
  get x(): number;
  get y(): number;
  set x(value: number);
  set y(value: number);
  get width(): number;
  get height(): number;
  get worldWidth(): number;
  get worldHeight(): number;
  set worldWidth(value: number);
  set worldHeight(value: number);
  get zoom(): number;
  set zoom(value: number);
  clear(): void;
  attach(parent?: HTMLElement): void;
}

/**
 * Aggregates key and mouse input events and caches their data
 * to be checked on-demand. Intended to be attached to Camera.canvas
 * and flushed once per frame.
 */
export interface InputManager {
  keyHeld(key: string): boolean;
  keyPressed(key: string): boolean;
  keyReleased(key: string): boolean;
  get leftClick(): boolean;
  get leftClickDrag(): boolean;
  get rightClick(): boolean;
  get rightClickDrag(): boolean;
  get middleClick(): boolean;
  get middleClickDrag(): boolean;
  get mouseX(): number;
  get mouseY(): number;
  handleEvent(event: Event): void;
  flush(): void;
  attach(target?: HTMLElement): void;
}

/**
 * Couples the camera and input manager, and exposes an async method `tick`
 * that coordinates clearing the canvas, flushing the input manager,
 * and capping the framerate.
 */
export interface MainLoop {
  camera: Camera;
  input: InputManager;
  /**
   * Flushes the input manager,
   * waits for the next tick according to the given fps rate
   * (during which time new input events are aggregated),
   * and then clears the canvas in preparation for drawing.
   * When this function resolves, a new tick has started,
   * and is ready for the caller to perform game logic
   * and draw to the canvas anew.
   * If no fps rate is given, 60 is assumed.
   */
  tick(fps?: number): Promise<void>;
  attach(parent?: HTMLElement): void;
}

/**
 * Command object to draw something.
 */
export interface Drawable {
  draw(x: number, y: number, camera: Camera): void;
}

/**
 * Drawable which draws an image.
 */
export interface Sprite extends Drawable {
  image: HTMLImageElement;
}

/// Factory constructors

/**
 * Creates a camera with the given properties,
 * and a canvas element for it to manage.
 * Does not attach the canvas element to the page;
 * for that, call `camera.attach()`.
 */
export function makeCamera(options: {
  x: number;
  y: number;
  width: number;
  height: number;
  worldWidth: number;
  worldHeight: number;
}): Camera {
  const canvas = document.createElement("canvas");
  canvas.width = options.width;
  canvas.height = options.height;
  const renderer: CanvasRenderingContext2D = (() => {
    const result = canvas.getContext("2d");
    if (result) {
      return result;
    } else {
      throw new Error("device is toaster");
    }
  })();
  const state = { ...options, zoom: 1 };
  function ensureStateValid() {
    const logicalWidth = state.width / state.zoom;
    const logicalHeight = state.height / state.zoom;
    if (state.worldWidth < logicalWidth) {
      state.x = state.worldWidth / 2;
    } else if (state.x < logicalWidth / 2) {
      state.x = logicalWidth / 2;
    } else if (state.x > state.worldWidth - logicalWidth / 2) {
      state.x = state.worldWidth - logicalWidth / 2;
    }
    if (state.worldHeight < logicalHeight) {
      state.y = state.worldHeight / 2;
    } else if (state.y < logicalHeight / 2) {
      state.y = logicalHeight / 2;
    } else if (state.y > state.worldHeight - logicalHeight / 2) {
      state.y = state.worldHeight - logicalHeight / 2;
    }
  }
  ensureStateValid();
  return {
    canvas,
    renderer,
    get x() {
      return state.x;
    },
    get y() {
      return state.y;
    },
    set x(value) {
      state.x = value;
      ensureStateValid();
    },
    set y(value) {
      state.y = value;
      ensureStateValid();
    },
    get width() {
      return state.width / state.zoom;
    },
    get height() {
      return state.height / state.zoom;
    },
    get worldWidth() {
      return state.worldWidth;
    },
    get worldHeight() {
      return state.worldHeight;
    },
    set worldWidth(value) {
      state.worldWidth = value;
      ensureStateValid();
    },
    set worldHeight(value) {
      state.worldHeight = value;
      ensureStateValid();
    },
    get zoom() {
      return state.zoom;
    },
    set zoom(value) {
      state.zoom = value;
      ensureStateValid();
    },
    clear() {
      const ctx = this.renderer;
      ctx.save();
      ctx.resetTransform();
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
    },
    attach(parent = document.body) {
      parent.append(this.canvas);
    },
  };
}

/**
 * Loads an image, or fetches it if previously loaded.
 * Once the image is decoded, returns a sprite which draws the image
 * centered at given world coordinates.
 */
export async function makeSprite(src: string): Promise<Sprite> {
  let image: HTMLImageElement;
  if (cachedImages[src]) {
    image = cachedImages[src];
  } else {
    image = new Image();
    image.src = src;
    await image.decode();
    cachedImages[src] = image;
  }
  const result: Sprite = {
    image,
    draw: function (x, y, camera) {
      drawSprite(this, x, y, camera);
    },
  };
  return result;
}

/**
 * Creates an input manager instance. The instance will still need
 * to be attached to an element after the fact. Whichever element is attached
 * will handle mouse events, but in order to ensure key events are handled
 * even for targets that cannot hold focus, `document` will always be chosen
 * to handle key events.
 */
export function makeInputManager(): InputManager {
  const state = {
    keysHeldThisFrame: {} as Record<string, boolean>,
    keysHeldLastFrame: {} as Record<string, boolean>,
    leftHeld: false,
    leftClick: false,
    leftClickDrag: false,
    rightHeld: false,
    rightClick: false,
    rightClickDrag: false,
    middleHeld: false,
    middleClick: false,
    middleClickDrag: false,
    scrollUp: false,
    scrollDown: false,
    mouseX: 0,
    mouseY: 0,
  };
  return {
    keyHeld(key) {
      return !!state.keysHeldThisFrame[key];
    },
    keyPressed(key) {
      return !state.keysHeldLastFrame[key] &&
        !!state.keysHeldThisFrame[key];
    },
    keyReleased(key) {
      return !!state.keysHeldLastFrame[key] &&
        !state.keysHeldThisFrame[key];
    },
    get leftClick() {
      return state.leftClick;
    },
    get leftClickDrag() {
      return state.leftClickDrag;
    },
    get rightClick() {
      return state.rightClick;
    },
    get rightClickDrag() {
      return state.rightClickDrag;
    },
    get middleClick() {
      return state.middleClick;
    },
    get middleClickDrag() {
      return state.middleClickDrag;
    },
    get mouseX() {
      return state.mouseX;
    },
    get mouseY() {
      return state.mouseY;
    },
    handleEvent(event) {
      if (event instanceof KeyboardEvent && event.type == "keydown") {
        state.keysHeldThisFrame[event.key] = true;
      } else if (event instanceof KeyboardEvent && event.type == "keyup") {
        state.keysHeldThisFrame[event.key] = false;
      } else if (
        event instanceof MouseEvent &&
        event.type == "mousedown" &&
        event.button == 0
      ) {
        state.leftHeld = true;
      } else if (
        event instanceof MouseEvent &&
        event.type == "mousedown" &&
        event.button == 1
      ) {
        state.middleHeld = true;
      } else if (
        event instanceof MouseEvent &&
        event.type == "mousedown" &&
        event.button == 2
      ) {
        state.rightHeld = true;
      } else if (
        event instanceof MouseEvent &&
        event.type == "mouseup" &&
        event.button == 0
      ) {
        state.leftHeld = false;
        state.leftClick = !state.leftClickDrag;
        state.leftClickDrag = false;
      } else if (
        event instanceof MouseEvent &&
        event.type == "mouseup" &&
        event.button == 1
      ) {
        state.middleHeld = false;
        state.middleClick = !state.middleClickDrag;
        state.middleClickDrag = false;
      } else if (
        event instanceof MouseEvent &&
        event.type == "mouseup" &&
        event.button == 2
      ) {
        state.rightHeld = false;
        state.rightClick = !state.rightClickDrag;
        state.rightClickDrag = false;
      } else if (
        event instanceof MouseEvent &&
        event.type == "mousemove"
      ) {
        state.mouseX = event.offsetX;
        state.mouseY = event.offsetY;
        state.leftClickDrag = state.leftHeld;
        state.rightClickDrag = state.rightHeld;
        state.middleClickDrag = state.middleHeld;
      }
    },
    flush() {
      for (const key of Object.keys(state.keysHeldThisFrame)) {
        state.keysHeldLastFrame[key] = state.keysHeldThisFrame[key];
      }
      state.leftClick = false;
      state.rightClick = false;
      state.middleClick = false;
    },
    attach(target = document.querySelector("canvas")!) {
      for (
        const eventType of [
          "keydown",
          "keyup",
        ]
      ) {
        document.addEventListener(eventType, this.handleEvent.bind(this));
      }
      for (
        const eventType of [
          "mousedown",
          "mouseup",
          "mousemove",
        ]
      ) {
        target.addEventListener(eventType, this.handleEvent.bind(this));
      }
    },
  };
}

/**
 * Instantiates a main game loop, including a camera and input manager.
 * The provided width and height will be the canvas dimensions,
 * as well as the initial assumed dimensions of the logical world;
 * those, but not the canvas dimensions, can be changed after the fact
 * as needed. The main loop will neither begin automatically
 * nor attach itself to the document automatically;
 * you must attach it with `attach`
 * and manually request loop iterations with `tick`.
 */
export function makeMainLoop(width: number, height: number): MainLoop {
  const state = { lastTick: performance.now() };
  return {
    camera: makeCamera({
      x: width / 2,
      y: height / 2,
      width,
      height,
      worldWidth: width,
      worldHeight: height,
    }),
    input: makeInputManager(),
    async tick(fps = 60) {
      this.input.flush();
      const ms = 1000 / fps;
      while (performance.now() - state.lastTick < ms) {
        await new Promise(requestAnimationFrame);
      }
      state.lastTick = performance.now();
      this.camera.clear();
    },
    attach(parent = document.body) {
      this.camera.attach(parent);
      this.input.attach(this.camera.canvas);
    },
  };
}

/// Additional implementation details, unsorted

const cachedImages: Record<string, HTMLImageElement> = {};

function drawSprite(what: Sprite, x: number, y: number, camera: Camera) {
  const ctx = camera.renderer;
  ctx.save();
  ctx.resetTransform();
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(
    x + camera.width / 2 - camera.x,
    y + camera.height / 2 - camera.y,
  );
  ctx.drawImage(
    what.image,
    -what.image.width / 2,
    -what.image.height / 2,
  );
  ctx.restore();
}

/// Test code

export async function testUI(): Promise<void> {
  const mainLoop = makeMainLoop(640, 480);
  const sprite = await makeSprite("/assets/testbg.png");
  const { camera, input } = mainLoop;
  mainLoop.attach();
  for (;; await mainLoop.tick()) {
    sprite.draw(320, 240, mainLoop.camera);
    if (input.keyHeld("ArrowUp")) {
      camera.y -= 1;
    }
    if (input.keyHeld("ArrowDown")) {
      camera.y += 1;
    }
    if (input.keyHeld("ArrowLeft")) {
      camera.x -= 1;
    }
    if (input.keyHeld("ArrowRight")) {
      camera.x += 1;
    }
    if (input.keyHeld("[")) {
      camera.zoom /= 1.01;
    }
    if (input.keyHeld("]")) {
      camera.zoom *= 1.01;
    }
  }
}
