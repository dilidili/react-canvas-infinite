import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import ReactReconciler from 'react-reconciler';
import RenderLayer from './RenderLayer';
import { make } from './FrameUtils';
import { drawRenderLayer } from './DrawingUtils';
import CanvasRenderer from './CanvasRenderer';
import hitTest from './hitTest';
import layoutNode from './layoutNode';
import DebugCanvasContext from './DebugCanvasContext';
import Group from './Group';

const MOUSE_CLICK_DURATION_MS = 300;
const scale = window.devicePixelRatio || 1;

// React reconciler only supports Component, provider a container for reconcile layer.
class SurfaceWrapper extends React.Component<{
  getLayer: () => RenderLayer | null,
}> {
  getLayer() {
    return this.props.getLayer();
  }

  render() {
    return this.props.children;
  }
}

/**
 * Surface is a standard React component and acts as the main drawing canvas.
 * ReactCanvas components cannot be rendered outside a Surface.
* */
type SurfaceElement = HTMLCanvasElement | HTMLDivElement;
type SurfaceProps = {
  width?: number,
  height?: number,
  enableDebug?: boolean,
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
  if (nodeRef.current == null) {
    nodeRef.current = new RenderLayer(new Group())
  }
  const mountNodeRef = useRef<ReactReconciler.FiberRoot | null>(null);
  const surfaceWrapperRef = useRef<SurfaceWrapper>(null);
  const debugContextRef = useRef<DebugCanvasContext>(new DebugCanvasContext(canvasRef as React.RefObject<HTMLDivElement>));

  const renderSchedulerRef = useRef<{
    _frameReady: boolean;
    _pendingTick: boolean;
  }>({
    _frameReady: true,
    _pendingTick: false,
  });

  const eventSaveRef = useRef<{
    _lastMouseDownTimestamp: number | null,
    _lastMouseDownPosition: [number, number] | null,
    _draggedSinceMouseDown: boolean,
    _lastHitTarget: RenderLayer | null,
    _touches: {
      [identifier: number]: RenderLayer,
    },
  }>({
    _lastMouseDownTimestamp: null,
    _lastMouseDownPosition: null,
    _draggedSinceMouseDown: false,
    _lastHitTarget: null,
    _touches: {},
  });

  const getContext = () => {
    if (enableDebug) {
      return debugContextRef.current;
    } 
      return canvasRef.current ? (canvasRef.current as HTMLCanvasElement).getContext('2d') : null;
    
  };

  useEffect(() => {
    if (mountNodeRef.current) {
      CanvasRenderer.updateContainer(
        children,
        mountNodeRef.current,
        null,
        () => {},
      );
    }

    // Redraw updated render tree to <canvas>.
    if (nodeRef.current) {
      nodeRef.current.draw();
    }
  });

  // render scheduler.
  const draw = useCallback(() => {
    if (nodeRef.current) {
      const node = nodeRef.current;
      const ctx = getContext();

      layoutNode(node);

      if (ctx) {
        drawRenderLayer(ctx, node);
      }

      if (enableDebug && canvasRef.current && node.containerInfo) {
        canvasRef.current.appendChild(node.containerInfo);
      }
    }
  }, [enableDebug])

  const afterTick = useCallback(() => {
    const renderScheduler = renderSchedulerRef.current;

    // Execute pending draw that may have been scheduled during previous frame.
    renderScheduler._frameReady = true;

    // Canvas might be already removed from DOM.
    if (renderScheduler._pendingTick && canvasRef.current) {
      renderScheduler._pendingTick = false;
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      batchedTick();
    }
  }, [])

  const tick = useCallback(() => {
    const renderScheduler = renderSchedulerRef.current;

    // Block updates until next animation frame.
    renderScheduler._frameReady = false;

    const ctx = getContext();
    if (ctx) {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }

    draw();
    requestAnimationFrame(afterTick);
  }, [draw, afterTick]);

  const batchedTick = useCallback(() => {
    const renderScheduler = renderSchedulerRef.current;

    if (renderScheduler._frameReady === false) {
      renderScheduler._pendingTick = true;
      return;
    }

    tick();
  }, [tick]);

  useEffect(() => {
    let layerWidth = width; let layerHeight = height;

    // Scale the drawing area to match DPI.
    if ((!layerWidth || !layerHeight) && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      layerWidth = rect.width;
      layerHeight = rect.height;
      setCanvasWidth(layerWidth);
      setCanvasHeight(layerHeight);
    }

    const ctx = getContext();
    if (ctx) {
      ctx.scale(scale, scale);
    }

    const frame = make(0, 0, layerWidth, layerHeight);
    if (nodeRef.current) {
      nodeRef.current.frame = frame;
    }

    mountNodeRef.current = CanvasRenderer.createContainer(surfaceWrapperRef.current, false, false);
    CanvasRenderer.updateContainer(children, mountNodeRef.current, null, () => {});

    // Execute initial draw on mount.
    batchedTick();

    return () => {
      if (mountNodeRef.current) {
        CanvasRenderer.updateContainer(null, mountNodeRef.current, null, () => {});
      }
    };
  }, []);

  useEffect(() => {
    // Replace root the draw method of root RenderLayer.
    if (nodeRef.current) {
      nodeRef.current.draw = batchedTick;
    }
  }, [batchedTick])

  let style = {
    ...(otherProps.style || {}),
    width: canvasWidth,
    height: canvasHeight,
  };

  if (enableDebug) {
    style = { ...style, position: 'relative', overflow: 'hidden' };
  }

  const eventHanlders = useMemo(() => {
    const handleHitTest = (e: React.MouseEvent | React.TouchEvent | React.WheelEvent) => {
      let hitTarget: RenderLayer | null = null;
      if (nodeRef.current && canvasRef.current) {
        hitTarget = hitTest(e, nodeRef.current, canvasRef.current);
  
        if (hitTarget) {
          const handle = hitTest.getHitHandle(e.type);
          if (handle && hitTarget[handle]) {
            hitTarget[handle](e);
          }
        }
      }
  
      return hitTarget;
    }
  
    const handleScroll = (e: React.WheelEvent) => {
      handleHitTest(e);
    }
  
    const handleTouchStart = (e: React.TouchEvent) => {
      if (nodeRef.current && canvasRef.current) {
        const hitTarget = hitTest(e, nodeRef.current, canvasRef.current);
  
        let touch: React.Touch | null = null;
        if (hitTarget) {
          // On touchstart: capture the current hit target for the given touch.
          eventSaveRef.current._touches = eventSaveRef.current._touches || {};
  
          for (let i = 0, len = e.touches.length; i < len; i++) {
            touch = e.touches[i];
            eventSaveRef.current._touches[touch.identifier] = hitTarget;
          }
  
          const handle = hitTest.getHitHandle(e.type);
          if (handle && hitTarget[handle]) {
            hitTarget[handle](e);
          }
        }
      }
    }
  
    const handleTouchMove: React.TouchEventHandler = (e) => {
      handleHitTest(e);
    }
  
    const handleTouchEnd = (e: React.TouchEvent) => {
      const saveRef = eventSaveRef.current;
  
      // touchend events do not generate a pageX/pageY so we rely
      // on the currently captured touch targets.
      if (!saveRef._touches) {
        return;
      }
  
      let hitTarget: RenderLayer;
      const hitHandle = hitTest.getHitHandle(e.type);
      for (let i = 0, len = e.changedTouches.length; i < len; i++) {
        hitTarget = saveRef._touches[e.changedTouches[i].identifier];
        if (hitTarget && hitHandle && hitTarget[hitHandle]) {
          hitTarget[hitHandle](e);
        }
        delete saveRef._touches[e.changedTouches[i].identifier];
      }
    }
  
    const handleMouseEvent: React.MouseEventHandler<HTMLElement> = (e) => {
      const saveRef = eventSaveRef.current;
  
      if (e.type === 'mousedown') {
        // Keep track of initial mouse down info to detect a proper click.
        saveRef._lastMouseDownTimestamp = e.timeStamp;
        saveRef._lastMouseDownPosition = [e.pageX, e.pageY];
        saveRef._draggedSinceMouseDown = false;
      } else if (
        e.type === 'click' ||
        e.type === 'dblclick' ||
        e.type === 'mouseout'
      ) {
        if (e.type === 'click' || e.type === 'dblclick') {
          // Forward the click if the mouse did not travel and it was a short enough duration.
          if (
            saveRef._draggedSinceMouseDown ||
            !saveRef._lastMouseDownTimestamp ||
            e.timeStamp - saveRef._lastMouseDownTimestamp > MOUSE_CLICK_DURATION_MS
          ) {
            return;
          }
        }
  
        saveRef._lastMouseDownTimestamp = null;
        saveRef._lastMouseDownPosition = null;
        saveRef._draggedSinceMouseDown = false;
      } else if (
        e.type === 'mousemove' &&
        !saveRef._draggedSinceMouseDown &&
        saveRef._lastMouseDownPosition
      ) {
        // Detect dragging
        saveRef._draggedSinceMouseDown =
          e.pageX !== saveRef._lastMouseDownPosition[0] ||
          e.pageY !== saveRef._lastMouseDownPosition[1];
      }
  
      let hitTarget = handleHitTest(e);
  
      // For mouseout events, we need to save the last target so we fire it again to that target
      // since we won't have a hit (since the mouse has left the canvas.)
      if (e.type === 'mouseout') {
        hitTarget = saveRef._lastHitTarget;
      } else {
        saveRef._lastHitTarget = hitTarget;
      }
    }

    const handleContextMenu: React.MouseEventHandler = (e) => {
      handleHitTest(e);
    }

    return {
      handleScroll,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      handleMouseEvent,
      handleContextMenu,
    };
  }, []);

  return (<SurfaceWrapper getLayer={() => nodeRef.current} ref={surfaceWrapperRef}>
    {!enableDebug ? (
      <canvas 
        ref={canvasRef as React.RefObject<HTMLCanvasElement>}
        className={className}
        width={canvasWidth * scale}
        height={canvasHeight * scale}
        style={style}
        onFocus={() => {}}
        onBlur={() => {}}
        onTouchStart={eventHanlders.handleTouchStart}
        onTouchMove={eventHanlders.handleTouchMove}
        onTouchEnd={eventHanlders.handleTouchEnd}
        onTouchCancel={eventHanlders.handleTouchEnd}
        onMouseDown={eventHanlders.handleMouseEvent}
        onMouseUp={eventHanlders.handleMouseEvent}
        onMouseMove={eventHanlders.handleMouseEvent}
        onMouseOver={eventHanlders.handleMouseEvent}
        onMouseOut={eventHanlders.handleMouseEvent}
        onContextMenu={eventHanlders.handleContextMenu}
        onClick={eventHanlders.handleMouseEvent}
        onDoubleClick={eventHanlders.handleMouseEvent}
        onWheel={eventHanlders.handleScroll}
      />
    ) : (
      <div
        ref={canvasRef as React.RefObject<HTMLDivElement>}
        className={className}
        style={style}
        onFocus={() => {}}
        onBlur={() => {}}
        onMouseDown={eventHanlders.handleMouseEvent}
        onMouseUp={eventHanlders.handleMouseEvent}
        onMouseMove={eventHanlders.handleMouseEvent}
        onMouseOver={eventHanlders.handleMouseEvent}
        onMouseOut={eventHanlders.handleMouseEvent}
        onContextMenu={eventHanlders.handleContextMenu}
        onClick={eventHanlders.handleMouseEvent}
        onDoubleClick={eventHanlders.handleMouseEvent}
        onWheel={eventHanlders.handleScroll}
      />
    )}
  </SurfaceWrapper>)
};

Surface.displayName = 'Surface';

export default Surface;
