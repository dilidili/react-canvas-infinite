import MultiKeyCache from 'multi-key-cache';

type FontKey = [string, ]
const _fontFaces = new MultiKeyCache<[]>();

interface FontAttribute {
  style?: string;
  weight?: number;
}

/**
 * @internal
 */
function getCacheKey(family: string, url: string, attributes: FontAttribute) {
  const cacheKey = [family, url];

  for (const entry of Object.entries(attributes)) {
    cacheKey.push(entry[0]);
    cacheKey.push(entry[1]);
  }

  return cacheKey;
}

/**
 * @param {String} family The CSS font-family value
 * @param {String} url The remote URL for the font file
 * @param {Object} attributes Font attributes supported: style, weight
 * @return {Object}
 */
class FontFace {
  constructor(public family: string, public url: string, public attributes?: FontAttribute) {
    let fontFace;

    const fontStyle = (attributes ? attributes.style : '') || 'normal';
    const fontWeight = (attributes ? attributes.weight : 0) || 400;

    const cacheKey = getCacheKey(family, url, attributes);
    fontFace = _fontFaces.get(cacheKey)

    if (!fontFace) {
      fontFace = {}
      fontFace.id = JSON.stringify(cacheKey)
      fontFace.family = family
      fontFace.url = url
      fontFace.attributes = attributes
      _fontFaces.set(cacheKey, fontFace)
    }

    return fontFace
  }
}

/**
 * Helper for retrieving the default family by weight.
 *
 * @param {Number} fontWeight
 * @return {FontFace}
 */
FontFace.Default = fontWeight => {
  return FontFace('sans-serif', null, { weight: fontWeight })
}

export default FontFace
