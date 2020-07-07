const PropsWillBeSaved = [
  'scaleX',
  'scaleY',
  'alpha',
  'translateX',
  'translateY',
];

class DebugCanvasContext {
  constructor(instance) {
    this.instance = instance;
  }

  stack = [];

  scaleX = 1;
  scaleY = 1;
  alpha = 1;
  translateX = 0;
  translateY = 0;

  _parentElement = null;
  _lastElement = null;
  _lastLayer = null;

  scale = (scaleX, scaleY) => {
    this.scaleX = scaleX;
    this.scaleY = scaleY;
  }

  translate = (translateX, translateY) => {
    this.translateX = translateX;
    this.translateY = translateY;
  }

  clearRect = () => {
    // debug mode only supports clear all children nodes.
    this.instance.canvas.innerHTML = '';
    this._parentElement = null;
    this._lastElement = null;
    this._lastLayer = null;
  }

  save = () => {
    const item = {};
    PropsWillBeSaved.forEach(key => {
      item[key] = this[key];
    });
    this.stack.push(item);
  }

  restore = () => {
    const item = this.stack.pop();
    PropsWillBeSaved.forEach(key => {
      this[key] = item[key];
    });
  } 

  initNextElement = (layer) => {
    const element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.overflow = 'hidden';

    if (this._parentElement) {
      this._parentElement.appendChild(element);
    }

    this._lastElement = element;
    this._lastLayer = layer;

    return element;
  }

  fillRect = () => {};
}

export default DebugCanvasContext;