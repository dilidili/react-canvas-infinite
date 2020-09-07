import Surface from './Surface';
import { Group, Text, Layer, Gradient } from './Core';
import Image from './Image';
import List from './List.jsx';
import FontFace from './FontFace';
import measureText from './measureText';
import CanvasComponent from './CanvasComponent';
import { CanvasRenderer, registerComponentConstructor } from './CanvasRenderer';
import { registerLayerType } from './DrawingUtils';

const registerCustomComponent = (name: string, applyProps, drawFunction) => {
  const layerType = name.toLowerCase();

  registerLayerType(layerType, drawFunction);

  const klass = class extends CanvasComponent {
    displayName = name

    applyLayerProps = (prevProps, props) => {
      const style = props && props.style ? props.style : {}
      const layer = this.node
      layer.type = layerType
      applyProps(layer, style, prevProps, props)
      this.applyCommonLayerProps(prevProps, props)
    }
  }

  registerComponentConstructor(name, klass)

  return name
}

export {
  Group,
  Text,
  List,
  Layer,
  Gradient,
  Surface,
  Image,
  FontFace,
  measureText,
  registerCustomComponent
}
