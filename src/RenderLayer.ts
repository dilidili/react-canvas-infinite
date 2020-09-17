import { zero } from './FrameUtils';
import { invalidateBackingStore } from './DrawingUtils';
import { Frame } from './FrameUtils';
import { FontFace } from './FontFace';
import EventTypes from './EventTypes';
import CanvasComponent, { CanvasStylePropperties } from './CanvasComponent';

type LayerType = 'image' | 'text' | 'group';

class RenderLayer {
  constructor(frame?: Frame) {
    this.frame = frame || zero();
    this.reset();
    this.type = 'group';
  }

  type: LayerType;
  frame: Frame;
  backingStoreId?: number;

  // traverse layer tree
  parentLayer?: RenderLayer;
  children: RenderLayer[] = [];

  // styles
  borderRadius?: number;
  borderColor?: string;
  backgroundColor?: string;
  borderWidth?: number;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  zIndex?: number;
  translateX?: number;
  translateY?: number;

  scrollable?: boolean;

  _originalStyle?: CanvasStylePropperties;

  [key: keyof typeof EventTypes]: Function;

  [key: string]: any;

  // Debug
  containerInfo?: HTMLDivElement;

  /**
   * Resets all the state on this RenderLayer so it can be added to a pool for re-use.
   */
  reset() {
    if (this.backingStoreId) {
      invalidateBackingStore(this.backingStoreId);
    }

    for (const key in (this as RenderLayer)) {
      if (key === 'children' || key === 'frame') continue;
      const value = this[key];

      if (typeof value === 'function') continue;

      this[key] = undefined;
    }

    if (this.children) {
      this.children.length = 0;
    } else {
      this.children = [];
    }

    if (this.frame) {
      this.frame.x = 0;
      this.frame.y = 0;
      this.frame.width = 0;
      this.frame.height = 0;
    }
  }

  /**
   * Retrieve the root injection layer
   */
  getRootLayer() {
    let root: RenderLayer = this;

    while (root.parentLayer) {
      root = root.parentLayer;
    }

    return root;
  }

  /**
   * RenderLayers are injected into a root owner layer whenever a Surface is
   * mounted. This is the integration point with React internals.
   */
  inject(parentLayer: RenderLayer) {
    if (this.parentLayer && this.parentLayer !== parentLayer) {
      this.remove();
    }

    parentLayer.addChild(this);
    this.parentLayer = parentLayer;
  }

  /**
   * Inject a layer before a reference layer
   */
  injectBefore(parentLayer: RenderLayer, beforeLayer: RenderLayer) {
    this.remove();
    const beforeIndex = parentLayer.children.indexOf(beforeLayer);
    parentLayer.children.splice(beforeIndex, 0, this);
    this.parentLayer = parentLayer;
    this.zIndex = this.zIndex || beforeLayer.zIndex || 0;
  }

  /**
   * Add a child to the render layer
   */
  addChild(child: RenderLayer) {
    child.parentLayer = this;
    this.children.push(child);
  }

  /**
   * Remove a layer from it's parent layer
   */
  remove() {
    if (this.parentLayer) {
      this.parentLayer.children.splice(
        this.parentLayer.children.indexOf(this),
        1,
      )

      this.parentLayer = undefined;
    }
  }

  /**
   * Move a layer to top.
   */
  moveToTop() {
    if (
      this.parentLayer &&
      this.parentLayer.children.length > 1 &&
      this.parentLayer.children[0] !== this
    ) {
      this.parentLayer.children.splice(
        this.parentLayer.children.indexOf(this),
        1
      );

      this.parentLayer.children.unshift(this);
    }
  }

  /**
   * Attach an event listener to a layer. Supported events are defined in
   * lib/EventTypes.js
   */
  subscribe(type: keyof typeof EventTypes, callback: Function, callbackScope: CanvasComponent): Function {
    // This is the integration point with React, called from LayerMixin.putEventListener().
    // Enforce that only a single callbcak can be assigned per event type.
    this[type] = callback;

    // Return a function that can be called to unsubscribe from the event.
    return this.removeEventListener.bind(this, type, callback, callbackScope);
  }

  destroyEventListeners() {
    for (const eventType in EventTypes) {
      if (this[eventType]) {
        delete this[eventType];
      }
    }
  }

  removeEventListener(type: keyof typeof EventTypes, callback: Function, callbackScope: CanvasComponent) {
    const listeners = this.eventListeners[type];
    let listener;
    if (listeners) {
      for (let index = 0, len = listeners.length; index < len; index++) {
        listener = listeners[index];
        if (
          listener.callback === callback &&
          listener.callbackScope === callbackScope
        ) {
          listeners.splice(index, 1);
          break;
        }
      }
    }
  }

  /**
   * Translate a layer's frame
   */
  translate(x: number, y: number, start?: number, end?: number) {
    if (this.frame) {
      this.frame.x += x
      this.frame.y += y
    }

    if (this.clipRect) {
      this.clipRect.x += x
      this.clipRect.y += y
    }

    if (this.children) {
      if (start !== undefined && end !== undefined) {
        this.children.slice(start, end + 1).forEach(child => {
          child.translate(x, y);
        });
      } else {
        this.children.forEach(child => {
          child.translate(x, y);
        });
      }
    }
  }

  /**
   * Layers should call this method when they need to be redrawn. Note the
   * difference here between `invalidateBackingStore`: updates that don't
   * trigger layout should prefer `invalidateLayout`. For instance, an image
   * component that is animating alpha level after the image loads would
   * call `invalidateBackingStore` once after the image loads, and at each
   * step in the animation would then call `invalidateRect`.
   */
  invalidateLayout(recomputeLayout = true) {
    // Bubble all the way to the root layer.
    this.getRootLayer().draw(recomputeLayout)
  }

  /**
   * Layers should call this method when their backing <canvas> needs to be
   * redrawn. For instance, an image component would call this once after the
   * image loads.
   */
  invalidateBackingStore() {
    if (this.backingStoreId) {
      invalidateBackingStore(this.backingStoreId)
    }

    this.invalidateLayout();
  }

  /**
   * Only the root owning layer should implement this function.
   */
  draw(_ = true) {
    // Placeholer
  }
}

export class ImageRenderLayer extends RenderLayer {
  constructor(frame?: Frame) {
    super(frame);
    this.type = 'image';
  }

  imageUrl?: string;
}

export class TextRenderLayer extends RenderLayer {
  constructor(frame: Frame, text: string, fontFace?: FontFace) {
    super(frame);

    this.type = 'text';
    this.text = text;

    // Fallback to standard font.
    this.fontFace = fontFace ? fontFace : FontFace.Default();
  }

  text: string;
  fontFace: FontFace;
  containerInfo?: HTMLDivElement;
}

export default RenderLayer;