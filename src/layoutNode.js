import computeLayout from 'css-layout';
import { emptyObject } from './utils';
import FontFace from './FontFace';

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

function createNode(layer) {
  return {
    layer,
    layout: {
      width: undefined, // computeLayout will mutate
      height: undefined, // computeLayout will mutate
      top: 0,
      left: 0
    },
    style: layer._originalStyle || emptyObject,
    // TODO no need to layout children that have non-dirty backing store
    children: (layer.children || []).map(createNode)
  }
}

function walkNode(node, parentLeft, parentTop) {
  node.layer.frame.x = node.layout.left + (parentLeft || 0)
  node.layer.frame.y = node.layout.top + (parentTop || 0)
  node.layer.frame.width = node.layout.width
  node.layer.frame.height = node.layout.height
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      walkNode(child, node.layer.frame.x, node.layer.frame.y)
    })
  }
}

function preWalkNode(node) {
  const layer = node.layer;

  if (layer.type === 'text') {
    const fontFace = layer.fontFace || FontFace.Default();
    const fontSize = layer.fontSize || 16;
    const lineHeight = layer.lineHeight || 18;

    ctx.font = `${fontFace.attributes.style} normal ${
      fontFace.attributes.weight
    } ${fontSize}px ${fontFace.family}`;

    const { width } = ctx.measureText(layer.text);
    node.style = { ...node.style, width: width, height: lineHeight, };
  }

  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      preWalkNode(child);
    })
  }
}

/**
 * This computes the CSS layout for a RenderLayer tree and mutates the frame
 * objects at each node.
 *
 * @param {Renderlayer} root
 * @return {Object}
 */
function layoutNode(root) {
  const rootNode = createNode(root)
  preWalkNode(rootNode);
  computeLayout(rootNode)
  walkNode(rootNode)
  return rootNode
}

export default layoutNode
