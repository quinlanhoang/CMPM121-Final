// UI abstractions.

/**
 * Couples a canvas and its rendering context
 * with the intended world coordinates of the center of the drawing,
 * thus providing sufficient information for any Drawable
 * to correctly draw itself.
 */
export interface Camera {
  canvas: HTMLCanvasElement,
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
 * Creates a camera with the given properties,
 * and a canvas element for it to manage.
 * Does not attach the canvas element to the page;
 * for that, call `camera.attach()`.
 */
export function makeCamera(options: {
  x: number,
  y: number,
  width: number,
  height: number,
  worldWidth: number,
  worldHeight: number
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
  const state = {...options, zoom: 1};
  function ensureStateValid() {
    const logicalWidth = state.width/state.zoom;
    const logicalHeight = state.height/state.zoom;
    if (state.worldWidth < logicalWidth) {
      state.x = state.worldWidth/2;
    } else if (state.x < logicalWidth/2) {
      state.x = logicalWidth/2;
    } else if (state.x > state.worldWidth - logicalWidth/2) {
      state.x = state.worldWidth - logicalWidth/2;
    }
    if (state.worldHeight < logicalHeight) {
      state.y = state.worldHeight/2;
    } else if (state.y < logicalHeight/2) {
      state.y = logicalHeight/2;
    } else if (state.y > state.worldHeight - logicalHeight/2) {
      state.y = state.worldHeight - logicalHeight/2;
    }
  }
  return {
    canvas,
    renderer,
    get x() {return state.x;},
    get y() {return state.y;},
    set x(value) {state.x = value; ensureStateValid();},
    set y(value) {state.y = value; ensureStateValid();},
    get width() {return state.width/state.zoom;},
    get height() {return state.height/state.zoom;},
    get worldWidth() {return state.worldWidth;},
    get worldHeight() {return state.worldHeight;},
    set worldWidth(value) {state.worldWidth = value; ensureStateValid();},
    set worldHeight(value) {state.worldHeight = value; ensureStateValid();},
    get zoom() {return state.zoom;},
    set zoom(value) {state.zoom = value; ensureStateValid();},
    clear() {
      const ctx = this.renderer;
      ctx.save();
      ctx.resetTransform();
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
    },
    attach(parent = document.body) {
      parent.append(this.canvas);
    }
  }
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

const cachedImages: Record<string, HTMLImageElement> = {};

function drawSprite(what: Sprite, x: number, y: number, camera: Camera) {
  const ctx = camera.renderer;
  ctx.save();
  ctx.resetTransform();
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(
    x + camera.width/2 - camera.x,
    y + camera.height/2 - camera.y
  );
  ctx.drawImage(
    what.image,
    -what.image.width/2,
    -what.image.height/2
  );
  ctx.restore();
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
  const result: Sprite = {image, draw: function (x, y, camera) {
    drawSprite(this, x, y, camera);
  }};
  return result;
}

export async function testUI(): Promise<void> {
  const camera = makeCamera({
    x: 320, y: 240,
    width: 640, height: 480,
    worldWidth: 640, worldHeight: 480
  });
  document.body.append(camera.canvas);

  const sprite = await makeSprite("/assets/testbg.png");
  setInterval(() => {
    camera.clear();
    sprite.draw(320, 240, camera);
  }, 10);

  document.addEventListener("keydown", function (event) {
    if (event.key == "ArrowDown") {
      camera.y += 5;
    } else if (event.key == "ArrowUp") {
      camera.y -= 5;
    } else if (event.key == "ArrowLeft") {
      camera.x -= 5;
    } else if (event.key == "ArrowRight") {
      camera.x += 5;
    } else if (event.key == "]") {
      camera.zoom *= 1.1;
    } else if (event.key == "[") {
      camera.zoom /= 1.1;
    }
  });
}