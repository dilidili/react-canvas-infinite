import { EventEmitter } from 'events';

const NOOP = () => {};

export class Img extends EventEmitter {
  constructor(_originalSrc: string) {
    super();

    this._img = new Image();
    this._img.onload = this.emit.bind(this, 'load');
    this._img.onerror = this.emit.bind(this, 'error');
    this._img.crossOrigin = 'Anonymous';
    this._img.src = _originalSrc;

    // The default impl of events emitter will throw on any 'error' event unless
    // there is at least 1 handler. Logging anything in this case is unnecessary
    // since the browser console will log it too.
    this.on('error', NOOP);

    // Default is just 10.
    this.setMaxListeners(10);
  }

  destructor() {
    // Make sure we aren't leaking callbacks.
    this.removeAllListeners();
  }

  getOriginalSrc() {
    return this._img.src;
  }

  /**
   * Retrieve a reference to the underyling <img> node.
   */
  getRawImage() {
    return this._img;
  }

  /**
   * Retrieve the loaded image width
   */
  getWidth() {
    return this._img.naturalWidth;
  }

  /**
   * Retrieve the loaded image height
   */
  getHeight() {
    return this._img.naturalHeight;
  }

  isLoaded() {
    return this._img.naturalHeight > 0;
  }

  private _img: HTMLImageElement;
}

const kInstancePoolLength = 300;

interface PoolItem {
  hash: string,
  freq: number,
  data: Img | null,
}

class InstancePool {
  length = 0;

  // Keep all the nodes in memory.
  elements: ({
    [hash: string]: PoolItem,
  }) = {};

  // Push with 0 frequency
  push(hash: string, data: Img) {
    this.length++;
    this.elements[hash] = {
      hash, // Helps identifying.
      freq: 0,
      data,
    };
  }

  get(hash: string) {
    const element = this.elements[hash];

    if (element) {
      element.freq++;
      return element.data;
    }

    return null;
  }

  // used to explicitely remove the path
  removeElement(path: string) {
    // Now almighty GC can claim this soul
    const element = this.elements[path];

    if (element) {
      delete this.elements[path];
      this.length--;
      return element;
    } else {
      return null;
    }
  }

  _reduceLeastUsed(least: PoolItem, currentHash: string) {
    const current = this.elements[currentHash];

    if (least.freq > current.freq) {
      return current;
    }

    return least;
  }

  popLeastUsed() {
    const reducer = this._reduceLeastUsed;
    const minUsed = Object.keys(this.elements).reduce(reducer, {
      hash: '',
      freq: Infinity,
      data: null,
    });

    if (minUsed.hash) {
      return this.removeElement(minUsed.hash);
    } else {
      return null;
    }
  }
}

const _instancePool = new InstancePool();
const ImageCache = {
  has(src: string) {
    return !!_instancePool.get(src);
  },

  /**
   * Retrieve an image from the cache
   */
  get(src: string) {
    let image = _instancePool.get(src);

    if (!image) {
      // Awesome LRU
      image = new Img(src);

      if (_instancePool.length >= kInstancePoolLength) {
        const pop = _instancePool.popLeastUsed();
        if (pop) {
          pop.data && pop.data.destructor();
        }
      }
      _instancePool.push(image.getOriginalSrc(), image);
    }

    return image;
  }
}

export default ImageCache;