import React, { useEffect, useRef, useReducer } from 'react';
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
  const forceUpdate = useForceUpdate();
  const scrollWidth = style ? style.width : 0;
  const scrollerRef = useRef<Scroller | null>(null);
  const scrollReducer = useReducer<
    React.Reducer<{
      isLoading: boolean,
      scrollTop: number,
    }, { type: 'scroll', top: number } | { type: 'updateIsLoading', isLoading: boolean }>
  >((state, action) => {
    if (action.type === 'scroll') {
      const scrollTop = action.top;
      const ret = { ...state, scrollTop };

      if (scrollerRef && scrollerRef.current && !state.isLoading && scrollTop >= scrollerRef.current.__contentHeight - scrollerRef.current.__clientHeight) {
        ret.isLoading = true;

        const loadMorePromise = onLoadMore && onLoadMore();
        loadMorePromise.then(() => {
          scrollReducer[1]({
            type: 'updateIsLoading',
            isLoading: false,
          });
        });
      }

      if (onScroll) {
        onScroll(scrollTop);
      }

      return ret;
    } else if (action.type === 'updateIsLoading') {
      return {
        ...state,
        isLoading: action.isLoading,
      };
    } else {
      return state;
    }
  }, {
    isLoading: false,
    scrollTop: 0,
  });

  const computeItemFrame = (index: number) => {
    mountNodeRef.current && CanvasRenderer.updateContainer(itemGetter(index), mountNodeRef.current, null, () => {});
    layoutNode(component.node);
    return component.node.frame;
  }

  useEffect(() => {
    // create reconciler
    mountNodeRef.current = CanvasRenderer.createContainer(component, false, false);

    // create scroller
    scrollerRef.current = new Scroller((_left: number, top: number) => {
      scrollReducer[1]({
        type: 'scroll',
        top,
      });
    }, {
      scrollingX: false,
      scrollingY: true,
      animating: true,
      decelerationRate: scrollingDeceleration,
      penetrationAcceleration: scrollingPenetrationAcceleration,
    });

    setTimeout(() => {
      const itemCount = numberOfItemsGetter();
      let scrollHeight = 0;
      
      for (let i = 0; i < itemCount; i++) {
        const frame = computeItemFrame(i);
        childrenScrollTopRef.current.push(scrollHeight);
        let height = frame.height;
        scrollHeight += height;
      }

      scrollerRef.current && scrollerRef.current.setDimensions(style.width, style.height, scrollWidth, scrollHeight);
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
                  scrollerRef.current && scrollerRef.current.setDimensions(style.width, style.height, scrollWidth, scrollTopList[itemIndex] + computedFrame.height);
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
        let itemScrollTop = childrenScrollTopRef.current[i] - scrollReducer[0].scrollTop;

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

    const translateY = itemIndexes[0] !== undefined ? childrenScrollTopRef.current[itemIndexes[0]] - scrollReducer[0].scrollTop : 0;
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