import CanvasComponent, { CanvasComponentProps } from './CanvasComponent';
import { TextRenderLayer } from './RenderLayer';
import { DefaultFontFace } from './FontFace';

interface TextProps extends CanvasComponentProps {
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      Text: TextProps,
    }
  }
}

const LAYER_TYPE = 'Text';

class Text extends CanvasComponent<TextProps> {
  constructor(type: string) {
    super(type);

    this.node = new TextRenderLayer(this);
  }

  node: TextRenderLayer;

  applyLayerProps = (prevProps: TextProps, props: TextProps) => {
    const style = props && props.style ? props.style : {};

    const layer = this.node;

    if (layer.type !== LAYER_TYPE) {
      layer.type = LAYER_TYPE;
    }

    layer.text = `${props.children}`;

    if (layer.color !== style.color) layer.color = style.color;

    if (layer.fontFace !== style.fontFace || !layer.fontFace) layer.fontFace = style.fontFace || DefaultFontFace();

    if (layer.fontSize !== style.fontSize) layer.fontSize = style.fontSize;

    if (layer.lineHeight !== style.lineHeight)
      layer.lineHeight = style.lineHeight;

    if (layer.textAlign !== style.textAlign) layer.textAlign = style.textAlign;

    this.applyCommonLayerProps(prevProps, props);
  }
}

export default Text;