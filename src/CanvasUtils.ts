import clamp from './clamp';
import measureText from './measureText';
import DebugCanvasContext from './DebugCanvasContext';
import { Img } from './ImageCache';
import { ImageRenderLayer, TextRenderLayer } from './RenderLayer';
import { FontCacheValue } from './FontFace';

/**
 * Draw an image into a <canvas>. This operation requires that the image
 * already be loaded.
 */
function drawImage(ctx: CanvasRenderingContext2D | DebugCanvasContext, image: Img, layer: ImageRenderLayer, options?: {
  originalHeight?: number,
  backgroundColor?: string,
  focusPoint?: {
    x: number,
    y: number,
  },
}) {
  const { x, y, width, height } = layer.frame;

  let dx = 0;
  let dy = 0;
  let dw = 0;
  let dh = 0;
  let sx = 0;
  let sy = 0;
  let sw = 0;
  let sh = 0;
  let scale: number;
  let focusPoint = options ? options.focusPoint : undefined;

  const actualSize = {
    width: image.getWidth(),
    height: image.getHeight(),
  };

  // scale to contain.
  scale = Math.max(width / actualSize.width, height / actualSize.height) || 1;
  scale = parseFloat(scale.toFixed(4));
  const scaledSize = {
    width: actualSize.width * scale,
    height: actualSize.height * scale
  };

  if (options && focusPoint) {
    // Since image hints are relative to image "original" dimensions (original != actual),
    // use the original size for focal point cropping.
    if (options.originalHeight) {
      focusPoint.x *= actualSize.height / options.originalHeight;
      focusPoint.y *= actualSize.height / options.originalHeight;
    }
  } else {
    // Default focal point to [0.5, 0.5]
    focusPoint = {
      x: actualSize.width * 0.5,
      y: actualSize.height * 0.5,
    }
  }

  // Clip the image to rectangle (sx, sy, sw, sh).
  sx = Math.round(clamp(width * 0.5 - focusPoint.x * scale, width - scaledSize.width, 0)) * (-1 / scale);
  sy = Math.round(clamp(height * 0.5 - focusPoint.y * scale, height - scaledSize.height, 0)) * (-1 / scale);
  sw = Math.round(actualSize.width - sx * 2);
  sh = Math.round(actualSize.height - sy * 2);

  // Scale the image to dimensions (dw, dh).
  dw = Math.round(width);
  dh = Math.round(height);

  // Draw the image on the canvas at coordinates (dx, dy).
  dx = Math.round(x);
  dy = Math.round(y);

  if (ctx instanceof DebugCanvasContext) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = image.getOriginalSrc();
    img.style.position = 'absolute';
    img.style.width = `${dw}px`;
    img.style.height = `${dh}px`;
    img.style.left = `${dx - layer.frame.x}px`;
    img.style.top = `${dy - layer.frame.y}px`;
    img.style.clip = `${sy}px ${sx + sw}px ${sy + sh}px ${sx}px`;

    const element = layer.containerInfo;
    if (element) {
      element.appendChild(img);
    }
  } else {
    if (options && options.backgroundColor) {
      ctx.save();
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(x, y, width, height);
      ctx.restore();
    }

    ctx.drawImage(image.getRawImage(), sx, sy, sw, sh, dx, dy, dw, dh);
  }
}

interface TextOption {
  fontSize: number;
  lineHeight: number;
  textAlign: string;
  color: string;
  backgroundColor: string;
};

function drawText(
  ctx: CanvasRenderingContext2D | DebugCanvasContext,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontFace: FontCacheValue,
  _options: Partial<TextOption>,
  layer: TextRenderLayer,
) {
  let currX = x;
  let currY = y;
  let currText;
  const options: TextOption = {
    fontSize: _options.fontSize || 16,
    lineHeight: _options.lineHeight || 18,
    textAlign: _options.textAlign || 'left',
    backgroundColor: _options.backgroundColor || 'transparent',
    color: _options.color || '#000',
  };


  if (ctx instanceof DebugCanvasContext && layer.containerInfo) {
    layer.containerInfo.innerText = layer.text;
    layer.containerInfo.style.fontFamily = fontFace.family;
    layer.containerInfo.style.lineHeight = `${options.lineHeight}px`;
    layer.containerInfo.style.backgroundColor = options.backgroundColor;
    layer.containerInfo.style.color = options.color;
    layer.containerInfo.style.fontSize = `${options.fontSize}px`;
  } else {
    const textMetrics = measureText(
      text,
      width,
      fontFace,
      options.fontSize,
      options.lineHeight,
    );

    ctx.save();

    // Draw the background
    if (options.backgroundColor !== 'transparent') {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.textBaseline = 'middle';
    ctx.fillStyle = options.color;
    ctx.font = `${fontFace.attributes.style} normal ${
      fontFace.attributes.weight
    } ${options.fontSize}px ${fontFace.family}`;

    textMetrics.lines.forEach((line, index) => {
      currText = line.text;
      currY = y + options.lineHeight * index + options.lineHeight / 2;

      // Account for text-align: left|right|center
      switch (options.textAlign) {
        case 'center':
          currX = x + width / 2 - line.width / 2;
          break
        case 'right':
          currX = x + width - line.width;
          break
        default:
          currX = x;
      }

      if (
        index < textMetrics.lines.length - 1 &&
        options.lineHeight + options.lineHeight * (index + 1) > height
      ) {
        currText = currText.replace(/,?\s?\w+$/, '...');
      }

      if (currY <= height + y) {
        ctx.fillText(currText, currX, currY);
      }
    })

    ctx.restore();
  }
}

export { drawImage, drawText };