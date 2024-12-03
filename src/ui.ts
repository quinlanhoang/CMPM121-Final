// UI abstractions.

/// Types

/**
 * Couples a canvas and its rendering context
 * with the intended world coordinates of the center of the drawing,
 * thus providing sufficient information for any Drawable
 * to correctly draw itself.
 */
export interface Camera {
  get canvas(): HTMLCanvasElement;
  get renderer(): CanvasRenderingContext2D;
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
  get camera(): Camera;
  get input(): InputManager;
  /**
   * Manually ticks the main loop at the given fps.
   * This function is mostly for internal purposes;
   * you probably want `start` instead.
   * If no fps rate is given, 60 is assumed.
   * "Ticking" the loop entails the following behaviors:
   * clears the canvas in preparation for drawing,
   * calls and unsubscribes all subscribed callbacks,
   * flushes the input manager, and finally,
   * waits for the next tick according to the given fps rate
   * (during which time new input events are aggregated).
   * When this function resolves,
   * all callbacks that were subscribed at the time of the call to `tick`
   * have been called and unsubscribed.
   * If those callbacks subscribed further callbacks,
   * the further callbacks will remain subscribed and not yet called.
   */
  tick(fps?: number): Promise<void>;
  /**
   * Attaches the camera to the given element,
   * and the input manager to the camera.
   */
  attach(parent?: HTMLElement): void;
  /**
   * Whether the main loop is running (i.e. `start` has been called
   * and there has been no call to `stop` since the last call to `start`).
   */
  get running(): boolean;
  /**
   * Starts the main loop.
   * If the scheduler is already running, does nothing.
   * The returned promise resolves when the loop stops.
   * If no fps rate is given, 60 is assumed.
   * While the main loop is running, `tick` will be called
   * at the given fps rate.
   */
  start(fps?: number): Promise<void>;
  /**
   * Stops the main loop.
   * If the scheduler is not running, does nothing.
   */
  stop(): void;
  /**
   * Subscribes a callback to the main loop.
   * The loop will dequeue and run all subscribed callbacks
   * the next time `tick` is called
   * (which will happen automatically if the main loop is running).
   */
  subscribe<T>(callback: () => T): Promise<T>;
  /**
   * Subscribes and awaits a no-op callback on the main loop
   * N times in a row (default 1), thereby sleeping N ticks.
   * A job can use `await mainLoop.sleep()` to move on to the next tick.
   */
  sleep(ticks?: number): Promise<void>;
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
 * you must attach it with `attach` and manually start it with `start`.
 */
export function makeMainLoop(width: number, height: number): MainLoop {
  const state = {
    lastTick: performance.now(),
    subscribersProcessing: [] as (() => void)[],
    subscribersWaiting: [] as (() => void)[],
    running: false,
  };
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
      this.camera.clear();
      for (const subscriber of state.subscribersWaiting) {
        state.subscribersProcessing.push(subscriber);
      }
      state.subscribersWaiting.length = 0;
      for (const subscriber of state.subscribersProcessing) {
        subscriber();
      }
      state.subscribersProcessing.length = 0;
      this.input.flush();
      const ms = 1000 / fps;
      while (performance.now() - state.lastTick < ms) {
        await new Promise(requestAnimationFrame);
      }
      state.lastTick = performance.now();
    },
    attach(parent = document.body) {
      this.camera.attach(parent);
      this.input.attach(this.camera.canvas);
    },
    get running() {
      return state.running;
    },
    async start(fps = 60) {
      state.running = true;
      while (state.running) {
        await this.tick(fps);
      }
    },
    stop() {
      state.subscribersProcessing.length = 0;
      state.subscribersWaiting.length = 0;
      state.running = false;
    },
    subscribe<T>(callback: () => T) {
      return new Promise<T>((resolve) => {
        state.subscribersWaiting.push(() => {
          resolve(callback());
        });
      });
    },
    async sleep(ticks = 1) {
      for (; ticks > 0; --ticks) {
        await this.subscribe(() => {});
      }
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
  mainLoop.start();
  for (;; await mainLoop.sleep()) {
    sprite.draw(320, 240, camera);
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
