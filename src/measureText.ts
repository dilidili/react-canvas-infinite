import { LineBreaker } from 'css-line-break';
import MultiKeyCache from 'multi-key-cache';

import { isFontLoaded } from './FontUtils';
import { FontFaceType } from './FontFace';

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

type CacheKey = [
  string, // text
  number, // width
  string, // id
  number, // fontSize
  number, // lineHeight
];

interface MetricType {
  width: number,
  height: number,
  lines: ({
    width: number,
    text: string,
  })[],
};

const _cache = new MultiKeyCache<CacheKey, MetricType>();
const _zeroMetrics: MetricType = {
  width: 0,
  height: 0,
  lines: [],
};

/**
 * Given a string of text, available width, and font return the measured width
 * and height.
 */
export default function measureText(
  text: string,
  width: number,
  fontFace: FontFaceType,
  fontSize: number,
  lineHeight: number,
): MetricType {
  if (!ctx) return _zeroMetrics;

  const cacheKey: CacheKey = [text, width, fontFace.id, fontSize, lineHeight];
  const cached = _cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Bail and return zero unless we're sure the font is ready.
  if (!isFontLoaded(fontFace)) {
    return _zeroMetrics;
  }

  let tryLine;
  let currentLine;
  let bk;

  ctx.font = `${fontFace.attributes.style} normal ${fontFace.attributes.weight} ${fontSize}px ${fontFace.family}`;
  let textMetrics = ctx.measureText(text);

  const measuredSize: MetricType = {
    width: textMetrics.width,
    height: lineHeight,
    lines: [],
  };

  if (measuredSize.width <= width) {
    // The entire text string fits.
    measuredSize.lines.push({ width: measuredSize.width, text });
  } else {
    let lastMeasuredWidth = 0;

    // Break into multiple lines.
    measuredSize.width = width;
    currentLine = '';
    const breaker = LineBreaker(text, {
      lineBreak: 'strict',
      wordBreak: 'normal',
    });

    while (!(bk = breaker.next()).done) {
      if (!bk.value) break;

      const word = bk.value.slice();
      tryLine = currentLine + word;
      textMetrics = ctx.measureText(tryLine);
      if (textMetrics.width > width) {
        measuredSize.height += lineHeight;
        measuredSize.lines.push({
          width: lastMeasuredWidth,
          text: currentLine.trim(),
        });
        currentLine = word;
        lastMeasuredWidth = ctx.measureText(currentLine.trim()).width;
      } else {
        currentLine = tryLine;
        lastMeasuredWidth = textMetrics.width;
      }
    }

    currentLine = currentLine.trim();
    if (currentLine.length > 0) {
      textMetrics = ctx.measureText(currentLine);
      measuredSize.lines.push({ width: textMetrics.width, text: currentLine });
    }
  }

  _cache.set(cacheKey, measuredSize);

  return measuredSize;
}
