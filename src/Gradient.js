import CanvasComponent from './CanvasComponent'

const LAYER_TYPE = 'gradient'

class Gradient extends CanvasComponent {
  displayName = 'Gradient'

  applyLayerProps = (prevProps, props) => {
    const layer = this.node

    if (layer.type !== LAYER_TYPE) {
      layer.type = LAYER_TYPE
    }

    if (layer.colorStops !== props.colorStops) {
      layer.colorStops = props.colorStops || []
    }

    this.applyCommonLayerProps(prevProps, props)
  }
}

export default Gradient
