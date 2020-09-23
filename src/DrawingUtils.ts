import ImageCache from './ImageCache';
import { isFontLoaded } from './FontUtils';
import { drawText, drawImage } from './CanvasUtils'
import { FontFaceType } from './FontFace';
import Canvas from './Canvas';
import DebugCanvasContext from './DebugCanvasContext';
import RenderLayer, { ImageRenderLayer, TextRenderLayer } from './RenderLayer';

// Global backing store <canvas> cache
let _backingStores: ({
  id: number;
  layer: RenderLayer;
  canvas: Canvas;
})[] = [];

/**
 * Maintain a cache of backing <canvas> for RenderLayer's which are accessible
 * through the RenderLayer's `backingStoreId` property.
 */
function getBackingStore(id: number) {
  for (let i = 0, len = _backingStores.length; i < len; i++) {
    if (_backingStores[i].id === id) {
      return _backingStores[i].canvas;
    }
  }

  return null;
}

/**
 * Purge a layer's backing store from the cache.
 */
function invalidateBackingStore(id: number) {
  for (let i = 0, len = _backingStores.length; i < len; i++) {
    if (_backingStores[i].id === id) {
      _backingStores.splice(i, 1);
      break;
    }
  }
}

/**
 * Purge the entire backing store cache.
 */
function invalidateAllBackingStores() {
  _backingStores = [];
}

/**
 * Check if a layer is using a given image URL.
 */
function layerContainsImage(layer: RenderLayer, imageUrl: string) {
  // Check the layer itself.
  if (layer.type === 'image' && layer.imageUrl === imageUrl) {
    return layer;
  }

  // Check the layer's children.
  if (layer.children) {
    for (let i = 0, len = layer.children.length; i < len; i++) {
      if (layerContainsImage(layer.children[i], imageUrl)) {
        return layer.children[i];
      }
    }
  }

  return false;
}

/**
 * Check if a layer is using a given FontFace.
 *
 */
function layerContainsFontFace(layer: RenderLayer, fontFace: FontFaceType) {
  // Check the layer itself.
  if (
    layer.type === 'text' &&
    layer.fontFace &&
    layer.fontFace.id === fontFace.id
  ) {
    return layer
  }

  // Check the layer's children.
  if (layer.children) {
    for (let i = 0, len = layer.children.length; i < len; i++) {
      if (layerContainsFontFace(layer.children[i], fontFace)) {
        return layer.children[i]
      }
    }
  }

  return false
}

/**
 * Invalidates the backing stores for layers which contain an image layer
 * associated with the given imageUrl.
 */
function handleImageLoad(imageUrl: string) {
  _backingStores.forEach(backingStore => {
    if (layerContainsImage(backingStore.layer, imageUrl)) {
      invalidateBackingStore(backingStore.id)
    }
  })
}

/**
 * Invalidates the backing stores for layers which contain a text layer
 * associated with the given font face.
 */
function handleFontLoad(fontFace: FontFaceType) {
  _backingStores.forEach(backingStore => {
    if (layerContainsFontFace(backingStore.layer, fontFace)) {
      invalidateBackingStore(backingStore.id);
    }
  })
}

/**
 * Draw base layer properties into a rendering context.
 * NOTE: The caller is responsible for calling save() and restore() as needed.
 */
function drawBaseRenderLayer(ctx: CanvasRenderingContext2D | DebugCanvasContext, layer: RenderLayer) {
  const { frame } = layer;

  if (ctx instanceof DebugCanvasContext) {
    const nextElement = ctx.initNextElement();

    if (layer.borderRadius) {
      nextElement.style.borderRadius = `${layer.borderRadius}px`;
    }

    if (layer.borderColor) {
      nextElement.style.borderColor = layer.borderColor;
    }

    if (layer.backgroundColor) {
      nextElement.style.backgroundColor = layer.backgroundColor;
    }

    const parentTop = layer.parentLayer ? layer.parentLayer.frame.y : 0;
    const parentLeft = layer.parentLayer ? layer.parentLayer.frame.x : 0;

    nextElement.style.top = `${frame.y - parentTop}px`;
    nextElement.style.left = `${frame.x - parentLeft}px`;
    nextElement.style.width = `${frame.width}px`;
    nextElement.style.height = `${frame.height}px`;

    layer.containerInfo = nextElement;

    if (layer.parentLayer && layer.parentLayer.containerInfo) {
      layer.parentLayer.containerInfo.appendChild(nextElement);
    }
  } else {
    if (layer.borderRadius) {
      // draw borders.
      ctx.beginPath();
      ctx.moveTo(frame.x + layer.borderRadius, frame.y);
      ctx.arcTo(
        frame.x + frame.width,
        frame.y,
        frame.x + frame.width,
        frame.y + frame.height,
        layer.borderRadius
      );
      ctx.arcTo(
        frame.x + frame.width,
        frame.y + frame.height,
        frame.x,
        frame.y + frame.height,
        layer.borderRadius
      );
      ctx.arcTo(
        frame.x,
        frame.y + frame.height,
        frame.x,
        frame.y,
        layer.borderRadius
      );
      ctx.arcTo(
        frame.x,
        frame.y,
        frame.x + frame.width,
        frame.y,
        layer.borderRadius
      );
      ctx.closePath();

      // Create a clipping path when drawing an image or using border radius.
      if (layer.type === 'image') {
        ctx.clip();
      }

      // Border with border radius.
      if (layer.borderColor) {
        ctx.lineWidth = layer.borderWidth || 1;
        ctx.strokeStyle = layer.borderColor;
        ctx.stroke();
      }
    }

    // Border color (no border radius).
    if (layer.borderColor && !layer.borderRadius) {
      ctx.lineWidth = layer.borderWidth || 1;
      ctx.strokeStyle = layer.borderColor;
      ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);
    }

    // Shadow.
    layer.shadowBlur && (ctx.shadowBlur = layer.shadowBlur);
    layer.shadowColor && (ctx.shadowColor = layer.shadowColor);
    layer.shadowOffsetX && (ctx.shadowOffsetX = layer.shadowOffsetX);
    layer.shadowOffsetY && (ctx.shadowOffsetY = layer.shadowOffsetY);

    // Background color.
    if (layer.backgroundColor) {
      ctx.fillStyle = layer.backgroundColor;
      if (layer.borderRadius) {
        // Fill the current path when there is a borderRadius set.
        ctx.fill();
      } else {
        ctx.fillRect(frame.x, frame.y, frame.width, frame.height);
      }
    }
  }
}

function drawImageRenderLayer(ctx: CanvasRenderingContext2D, layer: ImageRenderLayer) {
  drawBaseRenderLayer(ctx, layer);

  if (!layer.imageUrl) {
    return;
  }

  // Don't draw until loaded
  const image = ImageCache.get(layer.imageUrl);
  if (!image.isLoaded()) {
    return;
  }

  drawImage(
    ctx,
    image,
    layer,
  );
}

function drawTextRenderLayer(ctx: CanvasRenderingContext2D, layer: TextRenderLayer) {
  drawBaseRenderLayer(ctx, layer);

  // Don't draw text until loaded
  if (!isFontLoaded(layer.fontFace)) {
    return;
  }

  drawText(
    ctx,
    layer.text,
    layer.frame.x,
    layer.frame.y,
    layer.frame.width,
    layer.frame.height,
    layer.fontFace,
    {
      fontSize: layer.fontSize,
      lineHeight: layer.lineHeight,
      textAlign: layer.textAlign,
      color: layer.color,
    },
    layer,
  )
}

type DrawFunction = (ctx: CanvasRenderingContext2D | DebugCanvasContext, layer: RenderLayer) => void;

const layerTypesToDrawFunction: {
  [key: string]: DrawFunction,
} = {
  image: drawImageRenderLayer,
  text: drawTextRenderLayer,
  group: drawBaseRenderLayer,
}

function getDrawFunction(type: string): DrawFunction {
  return layerTypesToDrawFunction[type] || drawBaseRenderLayer;
}

/**
 * @private
 */
function sortByZIndexAscending(layerA: RenderLayer, layerB: RenderLayer) {
  return (layerA.zIndex || 0) - (layerB.zIndex || 0)
}

function drawChildren(layer: RenderLayer, ctx: CanvasRenderingContext2D | DebugCanvasContext, start?: number, end?: number) {
  const { children } = layer;
  if (children.length === 0) return;

  // Opimization
  if (children.length === 1) {
    drawRenderLayer(ctx, children[0]);
  } else if (children.length === 2) {
    const c0 = children[0];
    const c1 = children[1];

    if ((c0.zIndex || 0) < (c1.zIndex || 0)) {
      drawRenderLayer(ctx, c0)
      drawRenderLayer(ctx, c1)
    } else {
      drawRenderLayer(ctx, c1)
      drawRenderLayer(ctx, c0)
    }
  } else {
    if (start !== undefined && end !== undefined) {
      const sliceChildren = children.slice(start, end + 1);
      sliceChildren
        .slice()
        .forEach(childLayer => drawRenderLayer(ctx, childLayer));
    } else {
      children
        .slice()
        .sort(sortByZIndexAscending)
        .forEach(childLayer => drawRenderLayer(ctx, childLayer))
    }
  }
}

/**
 * Draw a RenderLayer instance to a <canvas> context.
 */
const drawRenderLayer = (ctx: CanvasRenderingContext2D | DebugCanvasContext, layer: RenderLayer) => {
  const drawFunction = getDrawFunction(layer.type);
  const isDebug = ctx instanceof DebugCanvasContext;

  // Performance: avoid drawing hidden layers.
  if (typeof layer.alpha === 'number' && layer.alpha <= 0) {
    return;
  }

  // Establish drawing context for certain properties:
  // - alpha
  // - translate
  const saveContext =
    (layer.alpha !== null && layer.alpha < 1) ||
    (layer.translateX || layer.translateY);

  if (saveContext) {
    ctx.save();

    // Alpha:
    if (layer.alpha !== null && layer.alpha < 1) {
      ctx.globalAlpha = layer.alpha;
    }

    // Translation:
    if (layer.translateX || layer.translateY) {
      ctx.translate(layer.translateX || 0, layer.translateY || 0);
    }
  }

  // If the layer is bitmap-cacheable, draw in a pooled off-screen canvas.
  // We disable backing stores on pad since we flip there.
  if (layer.backingStoreId && !isDebug) {
    drawCacheableRenderLayer(ctx as CanvasRenderingContext2D, layer, drawFunction);
  } else {
    ctx.save();
    drawFunction(ctx, layer);
    ctx.restore();

    // Draw child layers, sorted by their z-index.
    if (layer.children) {
      drawChildren(layer, ctx);
    }
  }

  // Pop the context state if we established a new drawing context.
  if (saveContext) {
    ctx.restore();
  }
}

/**
 * Draw a bitmap-cacheable layer into a pooled <canvas>. The result will be
 * drawn into the given context. This will populate the layer backing store
 * cache with the result.
 */
const drawCacheableRenderLayer = (ctx: CanvasRenderingContext2D, layer: RenderLayer, drawFunction: DrawFunction) => {
  if (!layer.backingStoreId) return;

  // See if there is a pre-drawn canvas in the pool.
  let backingStore = getBackingStore(layer.backingStoreId);
  const backingStoreScale = layer.scale || window.devicePixelRatio;
  const frameOffsetY = layer.frame.y;
  const frameOffsetX = layer.frame.x;
  let backingContext;

  const shouldRedraw = !backingStore || !!layer.scrollable;
  if (!backingStore) {
    if (_backingStores.length >= Canvas.poolSize) {
      // Re-use the oldest backing store once we reach the pooling limit.
      backingStore = _backingStores[0].canvas;
      backingStore.reset(layer.frame.width, layer.frame.height, backingStoreScale);

      // Move the re-use canvas to the front of the queue.
      _backingStores[0].id = layer.backingStoreId;
      _backingStores[0].canvas = backingStore;

      const shift = _backingStores.shift();
      shift && _backingStores.push(shift);
    } else {
      // Create a new backing store, we haven't yet reached the pooling limit
      backingStore = new Canvas(
        layer.frame.width,
        layer.frame.height,
        backingStoreScale,
      );

      _backingStores.push({
        id: layer.backingStoreId,
        layer,
        canvas: backingStore
      })
    }
  }

  if (shouldRedraw) {
    // Draw into the backing <canvas> at (0, 0) - we will later use the
    // <canvas> to draw the layer as an image at the proper coordinates.
    backingContext = backingStore.getContext();

    if (backingContext) {
      backingContext.clearRect(0, 0, layer.frame.width, layer.frame.height);

      let startIndex: number | undefined, endIndex: number | undefined;

      layer.translate(-frameOffsetX, -frameOffsetY, startIndex, endIndex);

      // Draw default properties, such as background color.
      backingContext.save();

      // Custom drawing operations
      // eslint-disable-next-line no-unused-expressions
      drawFunction && drawFunction(backingContext, layer);
      backingContext.restore();

      // Draw child layers, sorted by their z-index.
      if (layer.children) {
        drawChildren(layer, backingContext, startIndex, endIndex);
      }

      // Restore layer's original frame.
      layer.translate(frameOffsetX, frameOffsetY, startIndex, endIndex);
    }
  }

  // We have the pre-rendered canvas ready, draw it into the destination canvas.
  if (layer.clipRect) {
    // Fill the clipping rect in the destination canvas.
    const sx = (layer.clipRect.x - layer.frame.x) * backingStoreScale;
    const sy = (layer.clipRect.y - layer.frame.y) * backingStoreScale;
    const sw = layer.clipRect.width * backingStoreScale;
    const sh = layer.clipRect.height * backingStoreScale;
    const dx = layer.clipRect.x;
    const dy = layer.clipRect.y;
    const dw = layer.clipRect.width;
    const dh = layer.clipRect.height;

    // No-op for zero size rects. iOS / Safari will throw an exception.
    if (sw > 0 && sh > 0) {
      ctx.drawImage(backingStore.getRawCanvas(), sx, sy, sw, sh, dx, dy, dw, dh);
    }
  } else {
    // Fill the entire canvas
    ctx.drawImage(
      backingStore.getRawCanvas(),
      layer.frame.x,
      layer.frame.y,
      layer.frame.width,
      layer.frame.height
    )
  }
}

export {
  drawBaseRenderLayer,
  drawRenderLayer,
  invalidateBackingStore,
  invalidateAllBackingStores,
  handleImageLoad,
  handleFontLoad,
  layerContainsImage,
  layerContainsFontFace,
}
