import { make, clone, intersects, Frame } from './FrameUtils';
import EventTypes from './EventTypes';
import RenderLayer from './RenderLayer';

function sortByZIndexDescending(layer: RenderLayer, otherLayer: RenderLayer) {
  return (otherLayer.zIndex || 0) - (layer.zIndex || 0);
}

function getHitHandle(type: string) {
  let hitHandle;

  let tryHandle: keyof typeof EventTypes;
  for (tryHandle in EventTypes) {
    if (EventTypes[tryHandle] === type) {
      hitHandle = tryHandle;
      break;
    }
  }

  return hitHandle;
}


function getLayerAtPoint(root: RenderLayer, type: string, point: Frame, tx: number, ty: number): RenderLayer | null {
  let layer = null;
  const hitHandle = getHitHandle(type);
  let sortedChildren;
  let hitFrame = clone(root.frame);

  // Early bail for non-visible layers
  if (typeof root.alpha === 'number' && root.alpha < 0.01) {
    return null;
  }

  // Child-first search
  if (root.children) {
    sortedChildren = root.children
      .slice()
      .reverse()
      .sort(sortByZIndexDescending);

    for (let i = 0, len = sortedChildren.length; i < len; i++) {
      layer = getLayerAtPoint(
        sortedChildren[i],
        type,
        point,
        tx + (root.translateX || 0),
        ty + (root.translateY || 0)
      );

      if (layer) {
        break;
      }
    }
  }

  // Check for x/y translation
  if (tx) {
    hitFrame.x += tx;
  }

  if (ty) {
    hitFrame.y += ty;
  }

  // No child layer at the given point. Try the parent layer.
  if (!layer && hitHandle && root[hitHandle] && intersects(hitFrame, point)) {
    layer = root;
  }

  return layer;
}

/**
 * RenderLayer hit testing
 */
function hitTest(e: React.MouseEvent | React.TouchEvent | React.WheelEvent,
  rootLayer: RenderLayer,
  rootNode: HTMLElement,
) {
  const touch = (e as React.TouchEvent).touches ? (e as React.TouchEvent).touches[0] : (e as React.MouseEvent);
  let touchX = touch.pageX;
  let touchY = touch.pageY;

  let rootNodeBox;
  if (rootNode) {
    rootNodeBox = rootNode.getBoundingClientRect();
    touchX -= rootNodeBox.left;
    touchY -= rootNodeBox.top;
  }

  touchY -= window.pageYOffset;
  touchX -= window.pageXOffset;

  return getLayerAtPoint(
    rootLayer,
    e.type,
    make(touchX, touchY, 1, 1),
    rootLayer.translateX || 0,
    rootLayer.translateY || 0
  );
}

hitTest.getHitHandle = getHitHandle;
export default hitTest;
