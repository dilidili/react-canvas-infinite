export interface Frame {
  x: number,
  y: number,
  width: number,
  height: number,
}

/**
 * Get a frame object
 */
function make(x: number, y: number, width: number, height: number): Frame {
  return {
    x,
    y,
    width,
    height,
  };
}

/**
 * Return a zero size anchored at (0, 0).
 *
 */
function zero() {
  return make(0, 0, 0, 0);
}

/**
 * Return a cloned frame
 */
function clone(frame: Frame) {
  return make(frame.x, frame.y, frame.width, frame.height);
}

/**
 * Creates a new frame by a applying edge insets. This method accepts CSS
 * shorthand notation e.g. inset(myFrame, 10, 0);
 */
function inset(frame: Frame, top: number, right?: number, bottom?: number, left?: number) {
  const frameCopy = clone(frame);

  // inset(myFrame, 10, 0) => inset(myFrame, 10, 0, 10, 0)
  if (typeof bottom === 'undefined') {
    bottom = top;
    left = right;
  }

  // inset(myFrame, 10) => inset(myFrame, 10, 10, 10, 10)
  if (typeof right === 'undefined') {
    right = bottom = left = top;
  }

  frameCopy.x += (left as number);
  frameCopy.y += top;
  frameCopy.height -= top + bottom;
  frameCopy.width -= (left as number) + right;

  return frameCopy;
}

/**
 * Compute the intersection region between 2 frames.
 */
function intersection(frame: Frame, otherFrame: Frame) {
  const x = Math.max(frame.x, otherFrame.x);
  const width = Math.min(frame.x + frame.width, otherFrame.x + otherFrame.width);
  const y = Math.max(frame.y, otherFrame.y);
  const height = Math.min(
    frame.y + frame.height,
    otherFrame.y + otherFrame.height,
  );
  if (width >= x && height >= y) {
    return make(x, y, width - x, height - y);
  }
  return null;
}

/**
 * Compute the union of two frames
 */
function union(frame: Frame, otherFrame: Frame) {
  const x1 = Math.min(frame.x, otherFrame.x);
  const x2 = Math.max(frame.x + frame.width, otherFrame.x + otherFrame.width);
  const y1 = Math.min(frame.y, otherFrame.y);
  const y2 = Math.max(frame.y + frame.height, otherFrame.y + otherFrame.height);
  return make(x1, y1, x2 - x1, y2 - y1);
}

/**
 * Determine if 2 frames intersect each other
 */
function intersects(frame: Frame, otherFrame: Frame) {
  return !(
    otherFrame.x > frame.x + frame.width ||
    otherFrame.x + otherFrame.width < frame.x ||
    otherFrame.y > frame.y + frame.height ||
    otherFrame.y + otherFrame.height < frame.y
  );
}

export { make, zero, clone, inset, intersection, intersects, union };
