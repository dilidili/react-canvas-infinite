import RenderLayer from './RenderLayer';
import { make } from './FrameUtils';
import { emptyObject } from './utils';
import clamp from './clamp';
import EventTypes from './EventTypes';

let COMPONENT_GUID = 1;

type CanvasComponentProps = {
  useBackingStore?: boolean;
  scrollable?: boolean;
} & {
  [k in keyof typeof EventTypes]?: Function;
};

export default abstract class CanvasComponent {
  constructor(type: string) {
    this.type = type;
    this.subscriptions = new Map();
    this.listeners = new Map();
    this.node = new RenderLayer();

    this._comopnentId = COMPONENT_GUID;
    COMPONENT_GUID += 1;
  }

  _comopnentId: number;
  type: string;
  node: RenderLayer;
  subscriptions: Map<string, Function>;
  listeners: Map<string, Function>;

  abstract applyLayerProps: Function;

  putEventListener = (type: keyof typeof EventTypes, listener: Function) => {
    const { listeners, subscriptions } = this;

    let isListenerDifferent = false;
    if (listeners.get(type) !== listener) {
      listeners.set(type, listener);
      isListenerDifferent = true;
    }

    if (listener) {
      // Add subscription if this is the first listener of the given type
      // or the new listener is different from the current listener.
      if (!subscriptions.has(type) || isListenerDifferent) {
        subscriptions.set(type, this.node.subscribe(type, listener, this));
      }
    } else {
      const subscription = subscriptions.get(type);
      if (subscription) {
        subscription();
        subscriptions.delete(type);
      }
    }
  }

  destroyEventListeners = () => {
    this.listeners.clear();
    this.subscriptions.clear();
    this.node.destroyEventListeners();
  }

  setStyleFromProps = (layer, props) => {
    let style = emptyObject

    if (props.style) {
      // eslint-disable-next-line prefer-destructuring
      style = props.style
      layer._originalStyle = style
    } else {
      layer._originalStyle = null
    }

    if (!layer.frame) {
      layer.frame = make(0, 0, 0, 0)
    }

    const { frame } = layer
    const l = style.left || 0
    const t = style.top || 0
    const w = style.width || 0
    const h = style.height || 0

    if (frame.x !== l) frame.x = l
    if (frame.y !== t) frame.y = t
    if (frame.width !== w) frame.width = w
    if (frame.height !== h) frame.height = h

    // Common layer properties
    if (layer.alpha !== style.alpha) layer.alpha = style.alpha

    if (layer.backgroundColor !== style.backgroundColor)
      layer.backgroundColor = style.backgroundColor

    if (layer.borderColor !== style.borderColor)
      layer.borderColor = style.borderColor

    if (layer.borderWidth !== style.borderWidth)
      layer.borderWidth = style.borderWidth

    if (layer.borderRadius !== style.borderRadius)
      layer.borderRadius = style.borderRadius

    if (layer.clipRect !== style.clipRect) layer.clipRect = style.clipRect

    if (layer.scale !== style.scale) layer.scale = style.scale

    if (
      layer.translateX !== style.translateX ||
      layer.translateY !== style.translateY
    ) {
      layer.translateX = style.translateX
      layer.translateY = style.translateY
    }

    if (layer.zIndex !== style.zIndex) layer.zIndex = style.zIndex

    // Shadow
    if (layer.shadowColor !== style.shadowColor)
      layer.shadowColor = style.shadowColor

    if (layer.shadowBlur !== style.shadowBlur)
      layer.shadowBlur = style.shadowBlur

    if (layer.shadowOffsetX !== style.shadowOffsetX)
      layer.shadowOffsetX = style.shadowOffsetX

    if (layer.shadowOffsetY !== style.shadowOffsetY)
      layer.shadowOffsetY = style.shadowOffsetY
  }

  applyCommonLayerProps = (prevProps: CanvasComponentProps, props: CanvasComponentProps) => {
    const layer = this.node;

    // Generate backing store ID as needed.
    if ((props.useBackingStore || props.scrollable) && layer.backingStoreId !== this._comopnentId) {
      layer.backingStoreId = this._comopnentId;
      layer.scrollable = !!props.scrollable;
    } else if (!(props.useBackingStore || props.scrollable) && layer.backingStoreId) {
      layer.backingStoreId = undefined;
      layer.scrollable = false;
    }

    // Register events.
    let type: keyof typeof EventTypes;
    for (type in EventTypes) {
      if (prevProps[type] !== props[type]) {
        this.putEventListener(EventTypes[type], props[type]);
      }
    }

    this.setStyleFromProps(layer, props);
  }

  getLayer = () => this.node

  /**
   * Resets all the state on this CanvasComponent so it can be added to a pool for re-use.
   *
   * @return {RenderLayer}
   */
  reset = () => {
    this.destroyEventListeners()
    this._originalStyle = null
    this.node.reset(this)
  }
}
