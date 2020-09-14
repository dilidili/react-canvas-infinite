import '@types/css-font-loading-module';
import { FontCacheValue } from './FontFace';

type LoadCallback = (error: null | string) => void;

const _useNativeImpl = typeof FontFace !== 'undefined';
const _pendingFonts: {
  [key: string]: {
    startTime: number;
    defaultNode?: HTMLSpanElement;
    testNode?: HTMLSpanElement;
    callbacks: LoadCallback[];
  };
} = {};

const _loadedFonts: {
  [key: string]: true;
} = {};

const _failedFonts: {
  [key: string]: string;
} = {};

const kFontLoadTimeout = 3000;

/**
 * Helper method for created a hidden <span> with a given font.
 * Uses TypeKit's default test string, which is said to result
 * in highly varied measured widths when compared to the default font.
 */
function createTestNode(fontFace: FontCacheValue) {
  const span = document.createElement('span');
  span.setAttribute('data-fontfamily', fontFace.family);
  span.style.cssText = `${'position:absolute; left:-5000px; top:-5000px; visibility:hidden;' +
    'font-size:100px; font-family:"'}${fontFace.family}", Helvetica;font-weight: ${
      fontFace.attributes.weight
  }; font-style:${fontFace.attributes.style};`;
  span.innerHTML = 'BESs';
  return span;
}

function handleFontLoad(fontFace: FontCacheValue, timeout?: boolean) {
  const error = timeout ? `Exceeded load timeout of ${kFontLoadTimeout}ms` : null;

  if (!error) {
    _loadedFonts[fontFace.id] = true;
    delete _failedFonts[fontFace.id];
  } else {
    _failedFonts[fontFace.id] = error;
    delete _loadedFonts[fontFace.id];
  }

  // Execute pending callbacks.
  _pendingFonts[fontFace.id].callbacks.forEach(callback => {
    callback(error);
  });

  // Clean up DOM
  if (_pendingFonts[fontFace.id].defaultNode != null) {
    document.body.removeChild(_pendingFonts[fontFace.id].defaultNode as HTMLSpanElement);
  }
  if (_pendingFonts[fontFace.id].testNode != null) {
    document.body.removeChild(_pendingFonts[fontFace.id].testNode as HTMLSpanElement);
  }

  // Clean up waiting queue
  delete _pendingFonts[fontFace.id];
}

/**
 * Check if a font face has loaded
 */
function isFontLoaded(fontFace: FontCacheValue) {
  // For remote URLs, check the cache. System fonts (sans url) assume loaded.
  return _loadedFonts[fontFace.id] != null || !fontFace.url;
}

/**
 * Load a remote font and execute a callback.
 */
function loadFontNormal(fontFace: FontCacheValue, callback: LoadCallback) {
  // See if we've previously loaded it.
  if (_loadedFonts[fontFace.id]) {
    return callback(null);
  }

  // See if we've previously failed to load it.
  if (_failedFonts[fontFace.id]) {
    return callback(_failedFonts[fontFace.id]);
  }

  // System font: assume already loaded.
  if (!fontFace.url) {
    return callback(null);
  }

  // Font load is already in progress.
  if (_pendingFonts[fontFace.id]) {
    _pendingFonts[fontFace.id].callbacks.push(callback);
    return null;
  }

  // Create the test <span>'s for measuring.
  const defaultNode = createTestNode({
    id: 'default',
    family: 'Helvetica',
    attributes: fontFace.attributes,
  });
  const testNode = createTestNode(fontFace);
  document.body.appendChild(testNode);
  document.body.appendChild(defaultNode);

  _pendingFonts[fontFace.id] = {
    startTime: Date.now(),
    defaultNode,
    testNode,
    callbacks: [callback],
  };

  // Font watcher
  const checkFont = () => {
    const currWidth = testNode.getBoundingClientRect().width;
    const defaultWidth = defaultNode.getBoundingClientRect().width;
    const loaded = currWidth !== defaultWidth;

    if (loaded) {
      handleFontLoad(fontFace);
    } else {
      if (Date.now() - _pendingFonts[fontFace.id].startTime >= kFontLoadTimeout) {
        handleFontLoad(fontFace, true);
      } else {
        requestAnimationFrame(checkFont);
      }
    }
  }

  // Start watching
  checkFont();
  return null;
}

// Internal
// ========

/**
 * Native FontFace loader implementation
 */
function loadFontNative(fontFace: FontCacheValue, callback: LoadCallback) {
  // See if we've previously loaded it.
  if (_loadedFonts[fontFace.id]) {
    callback(null);
    return;
  }

  // See if we've previously failed to load it.
  if (_failedFonts[fontFace.id]) {
    callback(_failedFonts[fontFace.id]);
    return;
  }

  // System font: assume it's installed.
  if (!fontFace.url) {
    callback(null);
    return;
  }

  // Font load is already in progress.
  if (_pendingFonts[fontFace.id]) {
    _pendingFonts[fontFace.id].callbacks.push(callback);
    return;
  }

  _pendingFonts[fontFace.id] = {
    startTime: Date.now(),
    callbacks: [callback],
  };

  // Use font loader API
  const theFontFace = new FontFace(
    fontFace.family,
    `url(${fontFace.url})`,
    {
      style: fontFace.attributes.style,
      weight: !fontFace.attributes.weight ? undefined : fontFace.attributes.weight + '',
    }
  );

  theFontFace.load().then(
    () => {
      handleFontLoad(fontFace)
    },
    () => {
      handleFontLoad(fontFace, true);
    }
  );
}

const loadFont = _useNativeImpl ? loadFontNative : loadFontNormal;

export { isFontLoaded, loadFont };
