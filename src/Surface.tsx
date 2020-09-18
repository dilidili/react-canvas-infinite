import React, { useRef, useMemo, useState, useEffect } from 'react';
import RenderLayer from './RenderLayer';
import { make } from './FrameUtils';
import { drawRenderLayer } from './DrawingUtils';
import { CanvasRenderer } from './CanvasRenderer';
import hitTest from './hitTest';
import layoutNode from './layoutNode';
import DebugCanvasContext from './DebugCanvasContext';
import ReactReconciler from 'react-reconciler';

const MOUSE_CLICK_DURATION_MS = 300;
const scale = window.devicePixelRatio || 1;

/**
 * Surface is a standard React component and acts as the main drawing canvas.
 * ReactCanvas components cannot be rendered outside a Surface.
**/
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
  const mountNodeRef = useRef<ReactReconciler.FiberRoot | null>(null);
  const renderSchedulerRef = useRef<{
    _frameReady: boolean;
    _pendingTick: boolean;
    _nextTickRecomputeLayout: boolean;
  }>({
    _frameReady: false,
    _pendingTick: false,
    _nextTickRecomputeLayout: true,
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
    return canvasRef.current ? (canvasRef.current as HTMLCanvasElement).getContext('2d') : null;
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

    const ctx = getContext();
    ctx && ctx.scale(scale, scale);

    const frame = make(0, 0, layerWidth, layerHeight);
    nodeRef.current = new RenderLayer(frame);

    mountNodeRef.current = CanvasRenderer.createContainer(null, false, false);
    CanvasRenderer.updateContainer(children, mountNodeRef.current, undefined, () => {});

    // Execute initial draw on mount.
    batchedTick();

    return () => {
      mountNodeRef.current && CanvasRenderer.updateContainer(null, mountNodeRef.current, undefined, () => {});
    };
  }, []);

  useEffect(() => {
    mountNodeRef.current && CanvasRenderer.updateContainer(
      children,
      mountNodeRef.current,
      undefined,
      () => {},
    );

    // Redraw updated render tree to <canvas>.
    if (nodeRef.current) {
      nodeRef.current.draw();
    }
  });

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

  const tick = (recomputeLayout: boolean) => {
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
    const ctx = getContext();
    ctx && ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  }

  const draw = (recomputeLayout = true) => {
    if (nodeRef.current) {
      const node = nodeRef.current;
      const ctx = getContext();

      if (recomputeLayout) {
        layoutNode(node);
      }

      ctx && drawRenderLayer(ctx, node);

      if (enableDebug && canvasRef.current && nodeRef.current.containerInfo) {
        canvasRef.current.appendChild(nodeRef.current.containerInfo);
      }
    }
  }

  let style = otherProps.style;
  if (enableDebug) {
    style = { ...(otherProps.style || {}), position: 'relative', };
  }

  const eventHanlders = useMemo(() => {
    const handleHitTest = (e: React.MouseEvent | React.TouchEvent | React.WheelEvent) => {
      let hitTarget: RenderLayer | null = null;
      if (nodeRef.current && canvasRef.current) {
        hitTarget = hitTest(e, nodeRef.current, canvasRef.current);
  
        if (hitTarget) {
          const handle = hitTest.getHitHandle(e.type);
          handle && hitTarget[handle] && hitTarget[handle](e);
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
          handle && hitTarget[handle]  && hitTarget[handle](e);
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

  if (!enableDebug) {
    return (
      <canvas 
        ref={canvasRef as React.RefObject<HTMLCanvasElement>}
        className={className}
        width={canvasWidth}
        height={canvasHeight}
        style={style}

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
    );
  } else {
    return (
      <div
        ref={canvasRef as React.RefObject<HTMLDivElement>}
        className={className}
        style={style}

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
    );
  }
};

Surface.displayName = 'Surface';

export default Surface;
