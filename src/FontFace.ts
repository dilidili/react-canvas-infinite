import MultiKeyCache from 'multi-key-cache';

type FontCacheKey = [string, (FontAttribute | undefined), (string | undefined)];
export type FontCacheValue = {
  id: string;
  family: string;
  url?: string;
  attributes: FontAttribute;
};
const _fontFaces = new MultiKeyCache<FontCacheKey, FontCacheValue>();

interface FontAttribute {
  style?: 'normal' | 'italic' | 'oblique';
  weight?: number;
}

/**
 * @internal
 */
function getCacheKey(family: string, attributes?: FontAttribute, url?: string): FontCacheKey {
  const cacheKey: FontCacheKey = [family, attributes, url];

  return cacheKey;
}

export class FontFace {
  // Helper for retrieving the default family by weight.
  static Default = (fontWeight?: number) => {
    return new FontFace('sans-serif', { weight: fontWeight });
  }

  constructor(public family: string, public attributes?: FontAttribute, url?: string) {
    let fontFace: FontCacheValue;

    const fontStyle = (attributes ? attributes.style : '') || 'normal';
    const fontWeight = (attributes ? attributes.weight : 0) || 400;

    attributes = {
      style: fontStyle,
      weight: fontWeight,
    };

    const cacheKey = getCacheKey(family, attributes, url);
    fontFace = _fontFaces.get(cacheKey);

    if (!fontFace) {
      fontFace = {
        id: JSON.stringify(cacheKey),
        family,
        url,
        attributes,
      };

      _fontFaces.set(cacheKey, fontFace);
    }

    return fontFace;
  }
}

export default FontFace;
