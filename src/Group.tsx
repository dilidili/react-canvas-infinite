import CanvasComponent, { CanvasComponentProps } from './CanvasComponent';
import RenderLayer from './RenderLayer';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      Group: CanvasComponentProps,
    }
  }
}

const LAYER_TYPE = 'Group';

class Group extends CanvasComponent<CanvasComponentProps> {
  constructor() {
    super(LAYER_TYPE);

    this.node = new RenderLayer(this);
  }

  node: RenderLayer;

  applyLayerProps = (prevProps: CanvasComponentProps, props: CanvasComponentProps) => {
    const layer = this.node;

    if (layer.type !== LAYER_TYPE) {
      layer.type = LAYER_TYPE;
    }

    this.applyCommonLayerProps(prevProps, props);
  }

  render() {
    return null;
  }
}

export default Group;