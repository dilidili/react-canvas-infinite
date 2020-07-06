import CanvasComponent from './CanvasComponent'

function childrenAsString(children) {
  if (!children) {
    return ''
  }
  if (typeof children === 'string') {
    return children
  }
  if (children.length) {
    return children.join('\n')
  }
  return ''
}

function textArraysEqual(a, b) {
  if (typeof a !== typeof b || a.length !== b.length) return false

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }

  return true
}

const LAYER_TYPE = 'text'

class Text extends CanvasComponent {
  applyLayerProps = (prevProps, props) => {
    const style = props && props.style ? props.style : {}
    const layer = this.node

    if (layer.type !== LAYER_TYPE) {
      layer.type = LAYER_TYPE
    }

    if (
      layer.text === null ||
      !textArraysEqual(prevProps.children, props.children)
    ) {
      layer.text = childrenAsString(props.children)
    }

    if (layer.color !== style.color) layer.color = style.color

    if (layer.fontFace !== style.fontFace) layer.fontFace = style.fontFace

    if (layer.fontSize !== style.fontSize) layer.fontSize = style.fontSize

    if (layer.lineHeight !== style.lineHeight)
      layer.lineHeight = style.lineHeight

    if (layer.textAlign !== style.textAlign) layer.textAlign = style.textAlign

    this.applyCommonLayerProps(prevProps, props)
  }
}

export default Text
