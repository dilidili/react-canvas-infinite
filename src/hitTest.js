import { make, clone, inset, intersects } from './FrameUtils'
import * as EventTypes from './EventTypes'

/**
 * @private
 */
function sortByZIndexDescending(layer, otherLayer) {
  return (otherLayer.zIndex || 0) - (layer.zIndex || 0)
}

/**
 * @private
 */
function getHitHandle(type) {
  let hitHandle
  for (const tryHandle in EventTypes) {
    if (EventTypes[tryHandle] === type) {
      hitHandle = tryHandle
      break
    }
  }
  return hitHandle
}

/**
 * @private
 */
function getLayerAtPoint(root, type, point, tx, ty) {
  let layer = null
  const hitHandle = getHitHandle(type)
  let sortedChildren
  let hitFrame = clone(root.frame)

  // Early bail for non-visible layers
  if (typeof root.alpha === 'number' && root.alpha < 0.01) {
    return null
  }

  // Child-first search
  if (root.children) {
    sortedChildren = root.children
      .slice()
      .reverse()
      .sort(sortByZIndexDescending)
    for (let i = 0, len = sortedChildren.length; i < len; i++) {
      layer = getLayerAtPoint(
        sortedChildren[i],
        type,
        point,
        tx + (root.translateX || 0),
        ty + (root.translateY || 0)
      )
      if (layer) {
        break
      }
    }
  }

  // Check for hit outsets
  if (root.hitOutsets) {
    hitFrame = inset(
      clone(hitFrame),
      -root.hitOutsets[0],
      -root.hitOutsets[1],
      -root.hitOutsets[2],
      -root.hitOutsets[3]
    )
  }

  // Check for x/y translation
  if (tx) {
    hitFrame.x += tx
  }

  if (ty) {
    hitFrame.y += ty
  }

  // No child layer at the given point. Try the parent layer.
  if (!layer && root[hitHandle] && intersects(hitFrame, point)) {
    layer = root
  }

  return layer
}

/**
 * RenderLayer hit testing
 *
 * @param {Event} e
 * @param {RenderLayer} rootLayer
 * @param {?HTMLElement} rootNode
 * @return {RenderLayer}
 */
function hitTest(e, rootLayer, rootNode) {
  const touch = e.touches ? e.touches[0] : e
  let touchX = touch.pageX
  let touchY = touch.pageY
  let rootNodeBox
  if (rootNode) {
    rootNodeBox = rootNode.getBoundingClientRect()
    touchX -= rootNodeBox.left
    touchY -= rootNodeBox.top
  }

  touchY -= window.pageYOffset
  touchX -= window.pageXOffset

  return getLayerAtPoint(
    rootLayer,
    e.type,
    make(touchX, touchY, 1, 1),
    rootLayer.translateX || 0,
    rootLayer.translateY || 0
  )
}

hitTest.getHitHandle = getHitHandle
export default hitTest
