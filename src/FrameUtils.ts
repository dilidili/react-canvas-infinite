export class Frame {
  constructor(public x: number, public y: number, public width: number, public height: number) {}
}

/**
 * Get a frame object
 */
function make(x: number, y: number, width: number, height: number) {
  return new Frame(x, y, width, height);
}

/**
 * Return a zero size anchored at (0, 0).
 *
 * @return {Frame}
 */
function zero() {
  return make(0, 0, 0, 0)
}

/**
 * Return a cloned frame
 *
 * @param {Frame} frame
 * @return {Frame}
 */
function clone(frame) {
  return make(frame.x, frame.y, frame.width, frame.height)
}

/**
 * Creates a new frame by a applying edge insets. This method accepts CSS
 * shorthand notation e.g. inset(myFrame, 10, 0);
 *
 * @param {Frame} frame
 * @param {Number} top
 * @param {Number} right
 * @param {?Number} bottom
 * @param {?Number} left
 * @return {Frame}
 */
function inset(frame, top, right, bottom, left) {
  const frameCopy = clone(frame)

  // inset(myFrame, 10, 0) => inset(myFrame, 10, 0, 10, 0)
  if (typeof bottom === 'undefined') {
    bottom = top
    left = right
  }

  // inset(myFrame, 10) => inset(myFrame, 10, 10, 10, 10)
  if (typeof right === 'undefined') {
    // eslint-disable-next-line no-multi-assign
    right = bottom = left = top
  }

  frameCopy.x += left
  frameCopy.y += top
  frameCopy.height -= top + bottom
  frameCopy.width -= left + right

  return frameCopy
}

/**
 * Compute the intersection region between 2 frames.
 *
 * @param {Frame} frame
 * @param {Frame} otherFrame
 * @return {Frame}
 */
function intersection(frame, otherFrame) {
  const x = Math.max(frame.x, otherFrame.x)
  const width = Math.min(frame.x + frame.width, otherFrame.x + otherFrame.width)
  const y = Math.max(frame.y, otherFrame.y)
  const height = Math.min(
    frame.y + frame.height,
    otherFrame.y + otherFrame.height
  )
  if (width >= x && height >= y) {
    return make(x, y, width - x, height - y)
  }
  return null
}

/**
 * Compute the union of two frames
 *
 * @param {Frame} frame
 * @param {Frame} otherFrame
 * @return {Frame}
 */
function union(frame, otherFrame) {
  const x1 = Math.min(frame.x, otherFrame.x)
  const x2 = Math.max(frame.x + frame.width, otherFrame.x + otherFrame.width)
  const y1 = Math.min(frame.y, otherFrame.y)
  const y2 = Math.max(frame.y + frame.height, otherFrame.y + otherFrame.height)
  return make(x1, y1, x2 - x1, y2 - y1)
}

/**
 * Determine if 2 frames intersect each other
 *
 * @param {Frame} frame
 * @param {Frame} otherFrame
 * @return {Boolean}
 */
function intersects(frame, otherFrame) {
  return !(
    otherFrame.x > frame.x + frame.width ||
    otherFrame.x + otherFrame.width < frame.x ||
    otherFrame.y > frame.y + frame.height ||
    otherFrame.y + otherFrame.height < frame.y
  )
}

export { make, zero, clone, inset, intersection, intersects, union }
