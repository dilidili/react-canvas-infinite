import MultiKeyCache from 'multi-key-cache';

type FontCacheKey = [string, (FontAttribute | undefined), (string | undefined)];
export type FontFaceType = {
  id: string;
  family: string;
  url?: string;
  attributes: FontAttribute;
};
const _fontFaces = new MultiKeyCache<FontCacheKey, FontFaceType>();

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

export const DefaultFontFace = (fontWeight?: number) => {
  // Helper for retrieving the default family by weight.
  return FontFace('sans-serif', { weight: fontWeight });
}

function FontFace(family: string, attributes?: FontAttribute, url?: string) {
  let fontFace: FontFaceType;

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

export default FontFace;
