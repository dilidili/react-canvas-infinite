type SaveItem = {
  scaleX: number;
  scaleY: number;
  globalAlpha: number;
  translateX: number;
  translateY: number;
};

const PropsWillBeSaved = <const>[
  'scaleX',
  'scaleY',
  'globalAlpha',
  'translateX',
  'translateY',
];

class DebugCanvasContext {
  constructor(canvasRef: React.RefObject<HTMLDivElement>) {
    this.canvasRef = canvasRef;
  }

  stack: SaveItem[] = [];

  canvasRef?: React.RefObject<HTMLDivElement> = undefined;
  scaleX = 1;
  scaleY = 1;
  globalAlpha = 1;
  translateX = 0;
  translateY = 0;

  scale = (scaleX: number, scaleY: number) => {
    this.scaleX = scaleX;
    this.scaleY = scaleY;
  }

  translate = (translateX: number, translateY: number) => {
    this.translateX = translateX;
    this.translateY = translateY;
  }

  clearRect = () => {
    // debug mode only supports clear all children nodes.
    this.canvasRef && this.canvasRef.current && (this.canvasRef.current.innerHTML = '');
  }

  save = () => {
    const item: {
      [key: string]: number,
    } = {};

    PropsWillBeSaved.forEach((key: typeof PropsWillBeSaved[number]) => {
      item[key] = this[key];
    });

    this.stack.push(item as SaveItem);
  }

  restore = () => {
    const item = this.stack.pop();

    if (item) {
      PropsWillBeSaved.forEach(key => {
        this[key] = item[key];
      });
    }
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