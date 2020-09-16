// Note that this class intentionally does not use PooledClass.
// DrawingUtils manages <canvas> pooling for more fine-grained control.
class Canvas {
  // Be fairly conserative - we are potentially drawing a large number of medium
  // to large size images.
  static poolSize = 300;

  constructor(
    public width: number,
    public height: number,
    public scale: number = window.devicePixelRatio,
  ) {
    // Re-purposing an existing canvas element.
    if (!this._canvas) {
      this._canvas = document.createElement('canvas');
    }

    this._canvas.width = width * scale;
    this._canvas.height = height * scale;
    const ctx = this._canvas.getContext('2d');

    if (ctx) {
      ctx.scale(this.scale, this.scale);
    }
  }

  reset(width: number, height: number, scale: number) {
    this.width = width;
    this.height = height;
    this.scale = scale;
  }

  private _canvas: HTMLCanvasElement;

  getRawCanvas() {
    return this._canvas;
  }

  getContext() {
    return this._canvas.getContext('2d');
  }
}

export default Canvas;
