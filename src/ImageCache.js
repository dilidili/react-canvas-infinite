import EventEmitter from 'events'

const NOOP = () => {}

function Img(src) {
  this._originalSrc = src
  this._img = new Image()
  this._img.onload = this.emit.bind(this, 'load')
  this._img.onerror = this.emit.bind(this, 'error')
  this._img.crossOrigin = true
  this._img.src = src

  // The default impl of events emitter will throw on any 'error' event unless
  // there is at least 1 handler. Logging anything in this case is unnecessary
  // since the browser console will log it too.
  this.on('error', NOOP)

  // Default is just 10.
  this.setMaxListeners(100)
}

Object.assign(Img.prototype, EventEmitter.prototype, {
  /**
   * Pooling owner looks for this
   */
  destructor() {
    // Make sure we aren't leaking callbacks.
    this.removeAllListeners()
  },

  /**
   * Retrieve the original image URL before browser normalization
   *
   * @return {String}
   */
  getOriginalSrc() {
    return this._originalSrc
  },

  /**
   * Retrieve a reference to the underyling <img> node.
   *
   * @return {HTMLImageElement}
   */
  getRawImage() {
    return this._img
  },

  /**
   * Retrieve the loaded image width
   *
   * @return {Number}
   */
  getWidth() {
    return this._img.naturalWidth
  },

  /**
   * Retrieve the loaded image height
   *
   * @return {Number}
   */
  getHeight() {
    return this._img.naturalHeight
  },

  /**
   * @return {Bool}
   */
  isLoaded() {
    return this._img.naturalHeight > 0
  }
})

const kInstancePoolLength = 300

const _instancePool = {
  length: 0,
  // Keep all the nodes in memory.
  elements: {},

  // Push with 0 frequency
  push(hash, data) {
    this.length++
    this.elements[hash] = {
      hash, // Helps identifying
      freq: 0,
      data
    }
  },

  get(path) {
    const element = this.elements[path]

    if (element) {
      element.freq++
      return element.data
    }

    return null
  },

  // used to explicitely remove the path
  removeElement(path) {
    // Now almighty GC can claim this soul
    const element = this.elements[path]
    delete this.elements[path]
    this.length--
    return element
  },

  _reduceLeastUsed(least, currentHash) {
    const current = _instancePool.elements[currentHash]

    if (least.freq > current.freq) {
      return current
    }

    return least
  },

  popLeastUsed() {
    const reducer = _instancePool._reduceLeastUsed
    const minUsed = Object.keys(this.elements).reduce(reducer, {
      freq: Infinity
    })

    if (minUsed.hash) {
      return this.removeElement(minUsed.hash)
    }

    return null
  }
}

const ImageCache = {
  /**
   * Retrieve an image from the cache
   *
   * @return {Img}
   */
  get(src) {
    let image = _instancePool.get(src)
    if (!image) {
      // Awesome LRU
      image = new Img(src)
      image.crossOrigin = "Anonymous";
      if (_instancePool.length >= kInstancePoolLength) {
        _instancePool.popLeastUsed().destructor()
      }
      _instancePool.push(image.getOriginalSrc(), image)
    }
    return image
  }
}

export default ImageCache
