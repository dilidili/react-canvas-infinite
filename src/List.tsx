import React, { useState, useEffect, useRef, } from 'react';
import layoutNode from './layoutNode'
import { Group } from './Core';
import GroupComponent from './Group';
import { CanvasStylePropperties } from './CanvasComponent';
import { useForceUpdate } from './utils';
import { Scroller } from 'scroller';
import { CanvasRenderer } from './CanvasRenderer';
import ReactReconciler from 'react-reconciler';

const component = new GroupComponent();

const List: React.FC<{
  itemGetter: (index: number) => React.ReactElement,
  numberOfItemsGetter: () => number,
  onLoadMore: () => Promise<any>,
  style: {
    width: number,
    height: number,
  } & CanvasStylePropperties,
  onScroll?: (scrollTop: number) => void,
  scrollingDeceleration?: number,
  scrollingPenetrationAcceleration?: number,
  preloadBatchSize?: number,
}> = (props) => {
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

  const containerRef = useRef();
  const mountNodeRef = useRef<ReactReconciler.FiberRoot | null>(null);
  const childrenScrollTopRef = useRef<number[]>([]);
  const [scrollTop, setScrollTop] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const forceUpdate = useForceUpdate();
  const scrollWidth = style ? style.width : 0;

  const handleScroll = (_left: number, top: number) => {
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

  const scrollerRef = useRef(new Scroller(handleScroll, {
    scrollingX: false,
    scrollingY: true,
    animating: true,
    decelerationRate: scrollingDeceleration,
    penetrationAcceleration: scrollingPenetrationAcceleration,
  }));

  const computeItemFrame = (index: number) => {
    mountNodeRef.current && CanvasRenderer.updateContainer(itemGetter(index), mountNodeRef.current, null, () => {});
    layoutNode(component.node);
    return component.node.frame;
  }

  useEffect(() => {
    // create reconciler
    mountNodeRef.current = CanvasRenderer.createContainer(component, false, false);

    setTimeout(() => {
      const itemCount = numberOfItemsGetter();
      let scrollHeight = 0;
      
      for (let i = 0; i < itemCount; i++) {
        const frame = computeItemFrame(i);
        childrenScrollTopRef.current.push(scrollHeight);
        let height = frame.height;
        scrollHeight += height;
      }

      scrollerRef.current.setDimensions(style.width, style.height, scrollWidth, scrollHeight);
      forceUpdate();
    }, 0);
  }, []);

  const renderItem = (itemIndex: number, translateY: number) => {
    const item = itemGetter(itemIndex);

    return (
      React.cloneElement(item, {
        key: itemIndex,
        useBackingStore: !!(item.props.useBackingStore && scrollerRef.current),
        ref: (ref: React.ReactElement) => {
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
    const itemIndexes = [];
    const itemCount = numberOfItemsGetter();

    if (!containerRef.current) {
      for (let index = 0; index < itemCount; index++) {
        itemIndexes.push(index);
      }
    } else {
      for (let i = 0; i < itemCount; i++) {
        let itemScrollTop = childrenScrollTopRef.current[i] - scrollTop;

        // items completely reach over off-screen bottom.
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

  const handleTouchStart: React.TouchEventHandler = (e) => {
    if (scrollerRef.current) {
      scrollerRef.current.doTouchStart(e.touches, e.timeStamp);
    }
  };

  const handleTouchMove: React.TouchEventHandler = (e) => {
    if (scrollerRef.current) {
      scrollerRef.current.doTouchMove(e.touches, e.timeStamp);
    }
  }

  const handleTouchEnd: React.TouchEventHandler = (e) => {
    if (scrollerRef.current) {
      scrollerRef.current.doTouchEnd(e.timeStamp);
    }
  }

  const handleWheel: React.WheelEventHandler = ({ deltaY }) => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollBy(0, deltaY);
    }
  };

  const items = getVisibleItems();

  return (
    <Group
      ref={containerRef}
      style={style}
      scrollable={true}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onWheel={handleWheel}
    >
      {items}
    </Group>
  );
}

export default List;