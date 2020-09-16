import React, { useRef, useMemo, useState, useEffect } from 'react';
import RenderLayer from './RenderLayer';
import { make } from './FrameUtils';
import { drawRenderLayer } from './DrawingUtils';
import { CanvasRenderer } from './CanvasRenderer';
import hitTest from './hitTest';
import layoutNode from './layoutNode';
import DebugCanvasContext from './DebugCanvasContext';

const MOUSE_CLICK_DURATION_MS = 300
const scale = window.devicePixelRatio || 1;

type SurfaceElement = HTMLCanvasElement | HTMLDivElement;
type SurfaceProps = {
  width?: number,
  height?: number,
  enableDebug: boolean,
} & Partial<React.CanvasHTMLAttributes<SurfaceElement>>;

const Surface: React.FC<SurfaceProps> = ({
  enableDebug,
  width = 0,
  height = 0,
  children,
  className,
  ...otherProps
}) => {
  const [canvasWidth, setCanvasWidth] = useState<number>(width);
  const [canvasHeight, setCanvasHeight] = useState<number>(height);

  const canvasRef = useRef<SurfaceElement>(null);
  const nodeRef = useRef<RenderLayer | null>(null);
  const mountNodeRef = useRef<any>(null);
  const renderSchedulerRef = useRef<{
    _frameReady: boolean;
    _pendingTick: boolean;
    _nextTickRecomputeLayout: boolean;
  }>({
    _frameReady: false,
    _pendingTick: false,
    _nextTickRecomputeLayout: true,
  });

  const getContext = () => {
    return canvasRef.current.getContext('2d');
  };

  useEffect(() => {
    let layerWidth = width, layerHeight = height;

    // Scale the drawing area to match DPI.
    if ((!layerWidth || !layerHeight) && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      layerWidth = rect.width;
      layerHeight = rect.height;

      setCanvasWidth(layerWidth * scale);
      setCanvasHeight(layerHeight * scale);
    }
    getContext().scale(scale, scale);

    const frame = make(0, 0, layerWidth, layerHeight);
    nodeRef.current = new RenderLayer(frame);

    mountNodeRef.current = CanvasRenderer.createContainer();
    CanvasRenderer.updateContainer(children, mountNodeRef.current);

    // Execute initial draw on mount.
    batchedTick();
  }, []);

  // render scheduler.
  const batchedTick = (recomputeLayout = false) => {
    const renderScheduler = renderSchedulerRef.current;

    if (renderScheduler._frameReady === false) {
      renderScheduler._pendingTick = true;
      renderScheduler._nextTickRecomputeLayout = recomputeLayout;
      return;
    }

    tick(recomputeLayout);
  }

  const tick = (recomputeLayout) => {
    const renderScheduler = renderSchedulerRef.current;

    // Block updates until next animation frame.
    renderScheduler._frameReady = false;
    clear();
    draw(recomputeLayout);
    requestAnimationFrame(afterTick);
  }

  const afterTick = () => {
    const renderScheduler = renderSchedulerRef.current;

    // Execute pending draw that may have been scheduled during previous frame
    renderScheduler._frameReady = true;

    // canvas might be already removed from DOM
    if (renderScheduler._pendingTick && canvasRef.current) {
      renderScheduler._pendingTick = false;
      batchedTick(renderScheduler._nextTickRecomputeLayout);
      renderScheduler._nextTickRecomputeLayout = true;
    }
  }

  const clear = () => {
    getContext().clearRect(0, 0, canvasWidth, canvasHeight);
  }

  const draw = (recomputeLayout = true) => {
    if (this.node) {
      if (recomputeLayout) {
        layoutNode(this.node);
      }

      drawRenderLayer(this.getContext(), this.node);

      if (this.props.enableDebug) {
        this.canvas.appendChild(this.node.containerInfo);
      }
    }
  }

  let style = otherProps.style;
  if (enableDebug) {
    style = { ...(otherProps.style || {}), position: 'relative', };
  }

  const eventHanlders = useMemo(() => {
    const onTouchStart: React.TouchEventHandler<SurfaceElement> = (e) => {
      const hitTarget = hitTest(e, nodeRef.current, canvasRef.current);

      let touch;
      if (hitTarget) {
        // On touchstart: capture the current hit target for the given touch.
        this._touches = this._touches || {}

        for (let i = 0, len = e.touches.length; i < len; i++) {
          touch = e.touches[i]
          this._touches[touch.identifier] = hitTarget
        }
        hitTarget[hitTest.getHitHandle(e.type)](e)
      }
    };
  }, []);


  const resolveProps = {
    className: className,
    width: canvasWidth,
    height: canvasHeight,
    style,
    // onTouchStart: this.handleTouchStart,
    // onTouchMove: this.handleTouchMove,
    // onTouchEnd: this.handleTouchEnd,
    // onTouchCancel: this.handleTouchEnd,
    // onMouseDown: this.handleMouseEvent,
    // onMouseUp: this.handleMouseEvent,
    // onMouseMove: this.handleMouseEvent,
    // onMouseOver: this.handleMouseEvent,
    // onMouseOut: this.handleMouseEvent,
    // onContextMenu: this.handleContextMenu,
    // onClick: this.handleMouseEvent,
    // onDoubleClick: this.handleMouseEvent,
    // onWheel: this.handleScroll,
  };

  if (!enableDebug) {
    return (
      <canvas 
        ref={canvasRef as React.RefObject<HTMLCanvasElement>}
        {...resolveProps}
      />
    );
  } else {
    return (
      <div
        ref={canvasRef as React.RefObject<HTMLDivElement>}
        {...resolveProps}
      />
    );
  }
};

Surface.displayName = 'Surface';

/**
 * Surface is a standard React component and acts as the main drawing canvas.
 * ReactCanvas components cannot be rendered outside a Surface.
class Surface extends React.Component<SurfaceProps> {
  static displayName = 'Surface';

  static defaultProps = {
    scale: window.devicePixelRatio || 1,
    className: '',
    id: undefined,
    enableCSSLayout: false,
    enableDebug: false,
    style: {},
    canvas: undefined
  }

  static canvasRenderer = null

  constructor(props) {
    super(props)

    if (props.canvas) {
      this.setCanvasRef(props.canvas)
    }
  }

  setCanvasRef = canvas => {
    this.canvas = canvas
  }

  componentDidMount = () => {
    // Prepare the <canvas> for drawing.
    this.scale()

    this.node = new RenderLayer()
    const { left, top, width, height, children } = this.props
    this.node.frame = make(left, top, width, height)
    this.node.draw = this.batchedTick

    this.mountNode = Surface.canvasRenderer.createContainer(this)
    Surface.canvasRenderer.updateContainer(children, this.mountNode, this)

    // Execute initial draw on mount.
    this.node.draw()
  }

  componentWillUnmount = () => {
    Surface.canvasRenderer.updateContainer(null, this.mountNode, this)
  }

  componentDidUpdate = prevProps => {
    // Re-scale the <canvas> when changing size.
    if (
      prevProps.width !== this.props.width ||
      prevProps.height !== this.props.height
    ) {
      this.scale()
    }

    Surface.canvasRenderer.updateContainer(
      this.props.children,
      this.mountNode,
      this
    )

    // Redraw updated render tree to <canvas>.
    if (this.node) {
      this.node.draw()
    }
  }

  // Drawing
  // =======
  getLayer = () => this.node

  debugCanvasContext = new DebugCanvasContext(this);

  getContext = () => {
    return this.props.enableDebug ? this.debugCanvasContext : this.canvas.getContext('2d')
  }

  scale = () => {
    this.getContext().scale(this.props.scale, this.props.scale);
  }

  batchedTick = (recomputeLayout) => {
    if (this._frameReady === false) {
      this._pendingTick = true;
      this._nextTickRecomputeLayout = recomputeLayout;
      return
    }
    this.tick(recomputeLayout);
  }

  tick = (recomputeLayout) => {
    // Block updates until next animation frame.
    this._frameReady = false;
    this.clear();
    this.draw(recomputeLayout);
    requestAnimationFrame(this.afterTick);
  }

  afterTick = () => {
    // Execute pending draw that may have been scheduled during previous frame
    this._frameReady = true
    // canvas might be already removed from DOM
    if (this._pendingTick && this.canvas) {
      this._pendingTick = false;
      this.batchedTick(this._nextTickRecomputeLayout);
      this._nextTickRecomputeLayout = true;
    }
  }

  clear = () => {
    this.getContext().clearRect(0, 0, this.props.width, this.props.height)
  }

  draw = (recomputeLayout = true) => {
    if (this.node) {
      if (this.props.enableCSSLayout && recomputeLayout) {
        layoutNode(this.node);
      }

      drawRenderLayer(this.getContext(), this.node);

      if (this.props.enableDebug) {
        this.canvas.appendChild(this.node.containerInfo);
      }
    }
  }

  // Events
  // ======

  hitTest = e => {
    const hitTarget = hitTest(e, this.node, this.canvas)
    if (hitTarget) {
      hitTarget[hitTest.getHitHandle(e.type)](e)
    }
  }

  handleScroll = e => {
    const hitTarget = hitTest(e, this.node, this.canvas);

    if (hitTarget) {
      hitTarget[hitTest.getHitHandle(e.type)](e);
    }
  }

  handleTouchStart = e => {
    const hitTarget = hitTest(e, this.node, this.canvas)

    let touch
    if (hitTarget) {
      // On touchstart: capture the current hit target for the given touch.
      this._touches = this._touches || {}

      for (let i = 0, len = e.touches.length; i < len; i++) {
        touch = e.touches[i]
        this._touches[touch.identifier] = hitTarget
      }
      hitTarget[hitTest.getHitHandle(e.type)](e)
    }
  }

  handleTouchMove = e => {
    this.hitTest(e)
  }

  handleTouchEnd = e => {
    // touchend events do not generate a pageX/pageY so we rely
    // on the currently captured touch targets.
    if (!this._touches) {
      return
    }

    let hitTarget
    const hitHandle = hitTest.getHitHandle(e.type)
    for (let i = 0, len = e.changedTouches.length; i < len; i++) {
      hitTarget = this._touches[e.changedTouches[i].identifier]
      if (hitTarget && hitTarget[hitHandle]) {
        hitTarget[hitHandle](e)
      }
      delete this._touches[e.changedTouches[i].identifier]
    }
  }

  handleMouseEvent = e => {
    if (e.type === 'mousedown') {
      // Keep track of initial mouse down info to detect a proper click.
      this._lastMouseDownTimestamp = e.timeStamp
      this._lastMouseDownPosition = [e.pageX, e.pageY]
      this._draggedSinceMouseDown = false
    } else if (
      e.type === 'click' ||
      e.type === 'dblclick' ||
      e.type === 'mouseout'
    ) {
      if (e.type === 'click' || e.type === 'dblclick') {
        // Forward the click if the mouse did not travel and it was a short enough duration.
        if (
          this._draggedSinceMouseDown ||
          !this._lastMouseDownTimestamp ||
          e.timeStamp - this._lastMouseDownTimestamp > MOUSE_CLICK_DURATION_MS
        ) {
          return
        }
      }

      this._lastMouseDownTimestamp = null
      this._lastMouseDownPosition = null
      this._draggedSinceMouseDown = false
    } else if (
      e.type === 'mousemove' &&
      !this._draggedSinceMouseDown &&
      this._lastMouseDownPosition
    ) {
      // Detect dragging
      this._draggedSinceMouseDown =
        e.pageX !== this._lastMouseDownPosition[0] ||
        e.pageY !== this._lastMouseDownPosition[1]
    }

    let hitTarget = hitTest(e, this.node, this.canvas)

    // For mouseout events, we need to save the last target so we fire it again to that target
    // since we won't have a hit (since the mouse has left the canvas.)
    if (e.type === 'mouseout') {
      hitTarget = this._lastHitTarget
    } else {
      this._lastHitTarget = hitTarget
    }

    if (hitTarget) {
      const handler = hitTarget[hitTest.getHitHandle(e.type)]

      if (handler) {
        handler(e)
      }
    }
  }

  handleContextMenu = e => {
    this.hitTest(e)
  }

  render() {
    if (this.props.canvas) {
      return null
    }

    // Scale the drawing area to match DPI.
    const width = this.props.width * this.props.scale
    const height = this.props.height * this.props.scale
    let style = {}

    if (this.props.style) {
      style = Object.assign({}, this.props.style)
    }

    if (typeof this.props.width !== 'undefined') {
      style.width = this.props.width
    }

    if (typeof this.props.height !== 'undefined') {
      style.height = this.props.height
    }

    if (this.props.enableDebug && !style.position) {
      style.position = 'relative';
    }

    return React.createElement(this.props.enableDebug ? 'div' : 'canvas', {
      ref: this.setCanvasRef,
      className: this.props.className,
      id: this.props.id,
      width,
      height,
      style,
      onTouchStart: this.handleTouchStart,
      onTouchMove: this.handleTouchMove,
      onTouchEnd: this.handleTouchEnd,
      onTouchCancel: this.handleTouchEnd,
      onMouseDown: this.handleMouseEvent,
      onMouseUp: this.handleMouseEvent,
      onMouseMove: this.handleMouseEvent,
      onMouseOver: this.handleMouseEvent,
      onMouseOut: this.handleMouseEvent,
      onContextMenu: this.handleContextMenu,
      onClick: this.handleMouseEvent,
      onDoubleClick: this.handleMouseEvent,
      onWheel: this.handleScroll,
    })
  }
}
*/

export default Surface;
