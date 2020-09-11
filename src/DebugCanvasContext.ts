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

  initNextElement = () => {
    const element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.overflow = 'hidden';

    return element;
  }

  fillRect = () => {};
}

export default DebugCanvasContext;