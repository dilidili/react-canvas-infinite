import React from 'react';
import invariant from 'invariant';
import ReactFiberReconciler, { HostConfig } from 'react-reconciler';
import {
  unstable_now as now,
  unstable_scheduleCallback as scheduleDeferredCallback,
  unstable_cancelCallback as cancelDeferredCallback,
  unstable_ImmediatePriority,
} from 'scheduler';
import { emptyObject } from './utils';
import Text from './Text';
import Group from './Group';
import { RawImage } from './Image';
import CanvasComponent from './CanvasComponent';
import { getClosestInstanceFromNode } from './ReactDOMComponentTree';

const UPDATE_SIGNAL = {};
const MAX_POOLED_COMPONENTS_PER_TYPE = 1024;

type CanvasComponentClass = typeof CanvasComponent;
interface DerivedCanvas extends CanvasComponentClass {};
const componentConstructors: {
  [key: string]: DerivedCanvas,
} = {
  Group,
  RawImage,
  Text,
}

const componentPool: {
  [key: string]: Array<CanvasComponent>,
} = {};

const freeComponentToPool = (component: CanvasComponent) => {
  const { type } = component;

  if (!(component.type in componentPool)) {
    componentPool[type] = [];
  }

  const pool = componentPool[type];

  if (pool.length < MAX_POOLED_COMPONENTS_PER_TYPE) {
    pool.push(component);
  }
}

const freeComponentAndChildren = (c: CanvasComponent) => {
  if (!(c instanceof CanvasComponent)) return;

  const { children } = c.getLayer();

  for (let i = 0; i < children.length; i++) {
    const childLayer = children[i];
    freeComponentAndChildren(childLayer.component);
  }

  c.reset();
  freeComponentToPool(c);
}

const CanvasHostConfig: HostConfig<string, any, CanvasComponent, CanvasComponent, Text, any, any, Object, typeof UPDATE_SIGNAL, any, number, number> = {
  getPublicInstance(instance) {
    return instance;
  },
  getRootHostContext() {
    return emptyObject;
  },
  getChildHostContext() {
    return emptyObject;
  },

  prepareForCommit() {},
  resetAfterCommit() {},

  createInstance(type, props) {
    let instance: CanvasComponent | undefined;

    const pool = componentPool[type];

    if (pool && pool.length > 0) {
      instance = componentPool[type].pop() as CanvasComponent;
    } else {
      invariant(!!componentConstructors[type], `Invalid canvas component type '${type}'.`)
      instance = new componentConstructors[type](type);
    }

    if (instance && typeof instance.applyLayerProps !== 'undefined') {
      instance.applyLayerProps({}, props);
    }

    instance.getLayer().invalidateLayout();
    return instance;
  },
  appendInitialChild(parentInstance, child) {
    if (typeof child === 'string') {
      // Noop for string children of Text (eg <Text>{'foo'}{'bar'}</Text>)
      invariant(false, 'Text children should already be flattened.');
      return;
    }

    child.getLayer().inject(parentInstance.getLayer());
  },
  finalizeInitialChildren() {
    return false;
  },

  prepareUpdate() {
    return UPDATE_SIGNAL;
  },

  shouldSetTextContent(_, props) {
    return typeof props.children === 'string' || typeof props.children === 'number';
  },
  shouldDeprioritizeSubtree() {
    return false;
  },

  createTextInstance(
    text,
  ) {
    return this.createInstance('Text', {
      children: text,
    });
  },

  scheduleDeferredCallback(...args) {
    scheduleDeferredCallback(unstable_ImmediatePriority, ...args);
  },
  cancelDeferredCallback,

  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  noTimeout: 0,

  now,

  isPrimaryRenderer: false,

  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,

  appendChild(parentInstance, child) {
    if (parentInstance) {
      const childLayer = child.getLayer();
      const parentLayer = parentInstance.getLayer();

      if (childLayer.parentLayer === parentLayer) {
        childLayer.moveToTop();
      } else {
        childLayer.inject(parentLayer);
      }

      parentLayer.invalidateLayout();
    }
  },

  appendChildToContainer(parentInstance, child) {
    if (parentInstance) {
      const childLayer = child.getLayer();
      const parentLayer = parentInstance.getLayer();

      if (childLayer.parentLayer === parentLayer) {
        childLayer.moveToTop();
      } else {
        childLayer.inject(parentLayer);
      }

      parentLayer.invalidateLayout();
    }
  },

  insertBefore(parentInstance, child, beforeChild) {
    if (typeof child === 'string') return;

    const parentLayer = parentInstance.getLayer();
    child.getLayer().injectBefore(parentLayer, beforeChild.getLayer());
    parentLayer.invalidateLayout();
  },

  insertInContainerBefore(parentInstance, child, beforeChild) {
    const parentLayer = parentInstance.getLayer();
    child.getLayer().injectBefore(parentLayer, beforeChild.getLayer());
    parentLayer.invalidateLayout();
  },

  removeChild(parentInstance, child) {
    const parentLayer = parentInstance.getLayer();
    child.getLayer().remove();
    freeComponentAndChildren(child);
    parentLayer.invalidateLayout();
  },

  removeChildFromContainer(parentInstance, child) {
    const parentLayer = parentInstance.getLayer();
    child.getLayer().remove();
    freeComponentAndChildren(child);
    parentLayer.invalidateLayout();
  },

  commitTextUpdate() {},

  commitMount() {},

  commitUpdate(instance, _updatePayload, _type, oldProps, newProps) {
    if (typeof instance.applyLayerProps !== 'undefined') {
      instance.applyLayerProps(oldProps, newProps);
      instance.getLayer().invalidateLayout();
    }
  }
}

const CanvasRenderer = ReactFiberReconciler<string, any, any, CanvasComponent, Text, any, any, Object, typeof UPDATE_SIGNAL, any, number, number>(CanvasHostConfig);

CanvasRenderer.injectIntoDevTools({
  findFiberByHostInstance: getClosestInstanceFromNode,
  bundleType: process.env.NODE_ENV !== 'production' ? 1 : 0,
  version: `${React.version || 16}`,
  rendererPackageName: 'react-canvas',
  getInspectorDataForViewTag: (...args) => {
    console.log(args) // eslint-disable-line no-console
    return {};
  }
})

export { CanvasRenderer, };
