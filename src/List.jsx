import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import layoutNode from './layoutNode'
import { Group } from './Core';
import { make } from './FrameUtils'
import CanvasCromponent from './CanvasComponent';
import { useForceUpdate } from './utils';
import { Scroller } from 'scroller';
import Surface from './Surface';
import clamp from './clamp';

const component = new CanvasCromponent();

const List = (props) => {
  const {
    style,
    itemGetter,
    numberOfItemsGetter,
    onScroll,
    onLoadMore,
    scrollingDeceleration = 0.95,
    scrollingPenetrationAcceleration = 0.08,
    preloadBatchSize = 1,
  } = props;

  const scrollerRef = useRef();
  const containerRef = useRef();
  const mountNodeRef = useRef();
  const childrenScrollTopRef = useRef([]);
  const [scrollTop, setScrollTop] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const forceUpdate = useForceUpdate();
  const scrollWidth = style.width;

  const handleScroll = (left, top) => {
    setScrollTop(top);

    if (scrollerRef && !isLoading && top >= scrollerRef.current.__contentHeight - scrollerRef.current.__clientHeight) {
      setIsLoading(true);
      const loadMorePromise = onLoadMore && onLoadMore();
      loadMorePromise.then(() => {
        setIsLoading(false);
      });
    }

    if (onScroll) {
      onScroll(top);
    }
  };

  const computeItemFrame = (i) => {
    Surface.canvasRenderer.updateContainer(itemGetter(i), mountNodeRef.current);
    layoutNode(component.node);
    return component.node.frame;
  }

  useEffect(() => {
    // create scroller.
    const options = {
      scrollingX: false,
      scrollingY: true,
      animating: true,
      decelerationRate: scrollingDeceleration,
      penetrationAcceleration: scrollingPenetrationAcceleration,
    };

    // create
    const mountNode = Surface.canvasRenderer.createContainer(component);
    mountNodeRef.current = mountNode;

    setTimeout(() => {
      const itemCount = numberOfItemsGetter();
      let scrollHeight = 0;
      
      const s = performance.now();
      for (let i = 0; i < itemCount; i++) {
        const frame = computeItemFrame(i);
        childrenScrollTopRef.current.push(scrollHeight);
        let height = frame.height;
        scrollHeight += height;
      }

      scrollerRef.current.setDimensions(style.width, style.height, scrollWidth, scrollHeight);
      forceUpdate();
    }, 0);

    scrollerRef.current = new Scroller(handleScroll, options);
  }, []);

  const renderItem = (itemIndex, translateY) => {
    var item = itemGetter(itemIndex, scrollTop);

    return (
      React.cloneElement(item, {
        key: itemIndex,
        useBackingStore: !!(item.props.useBackingStore && scrollerRef.current),
        ref: (ref) => {
          if (ref) {
            const scrollTopList = childrenScrollTopRef.current;
            if (scrollTopList[itemIndex] == null) {
              for(let i = itemIndex - 1; i >= 0; i--) {
                if (scrollTopList[i] != null) {
                  const computedFrame = computeItemFrame(itemIndex);
                  scrollTopList[itemIndex] = scrollTopList[i] + computedFrame.height;
                  scrollerRef.current.setDimensions(style.width, style.height, scrollWidth, scrollTopList[itemIndex] + computedFrame.height);
                  break;
                }
              }

            }
          }
        },
        style: {
          ...(item.props.style || {}),
          // prevent run out of backingStore when render all items.
          translateY,
        }})
    );
  };

  const getVisibleItems = () => {
    var itemIndexes = [];
    var itemCount = numberOfItemsGetter();

    if (!containerRef.current) {
      for (let index = 0; index < itemCount; index++) {
        itemIndexes.push(index);
      }
    } else {
      for (let i = 0; i < itemCount; i++) {
        let itemScrollTop = childrenScrollTopRef.current[i] - scrollTop;

        // Item is completely off-screen bottom
        if (itemScrollTop >= style.height + preloadBatchSize * style.height) {
          continue;
        }

        // Item is completely off-screen top
        if (itemScrollTop <= -(style.height + preloadBatchSize * style.height)) {
          continue;
        }

        // Part of item is on-screen.
        itemIndexes.push(i);
      }
    } 

    const translateY = itemIndexes[0] !== undefined ? childrenScrollTopRef.current[itemIndexes[0]] - scrollTop : 0;
    return itemIndexes.map((i) => renderItem(i, translateY));
  }

  const handleTouchStart = (e) => {
    if (scrollerRef.current) {
      scrollerRef.current.doTouchStart(e.touches, e.timeStamp);
    }
  };

  const handleTouchMove = (e) => {
    if (scrollerRef.current) {
      scrollerRef.current.doTouchMove(e.touches, e.timeStamp, e.scale);
    }
  }

  const handleTouchEnd = (e) => {
    if (scrollerRef.current) {
      scrollerRef.current.doTouchEnd(e.timeStamp);
    }
  }

  const handleWheel = ({ deltaY }) => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollBy(0, deltaY);
    }
  };

  var items = getVisibleItems();
  return (
    React.createElement(Group, {
      ref: containerRef,
      style: style,
      scrollable: true, 
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
      onWheel: handleWheel,
    }, items)
  );
}

export default List;