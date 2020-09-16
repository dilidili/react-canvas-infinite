import CanvasComponent from './CanvasComponent'

const LAYER_TYPE = 'group'

class Group extends CanvasComponent {
  applyLayerProps = (prevProps, props) => {
    const layer = this.node

    if (layer.type !== LAYER_TYPE) {
      layer.type = LAYER_TYPE
    }

    this.applyCommonLayerProps(prevProps, props)
  }

  render() {
    return []
  }
}

export default Group
