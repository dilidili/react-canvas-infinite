import React, { useRef, useReducer } from 'react';
import layoutNode from './layoutNode'
import { Group } from './Core';
import CanvasComponent, { CanvasStylePropperties } from './CanvasComponent';
import { Scroller } from 'scroller';


type ChildrenScrollTop = {
  scrollTop: number,
  height: number,
};

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
}> = (props) => {
  const {
    style,
    itemGetter,
    numberOfItemsGetter,
    onScroll,
    onLoadMore,
    scrollingDeceleration = 0.95,
    scrollingPenetrationAcceleration = 0.08,
  } = props;

  const containerRef = useRef();
  const scrollerRef = useRef<Scroller | null>(null);
  const childrenScrollTopRef = useRef<ChildrenScrollTop[]>([]);
  const scrollWidth = style ? style.width : 0;

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

  if (scrollerRef.current == null) {
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
  }

  const computeItemHeight = (component: CanvasComponent) => {
    layoutNode(component.node);

    let height = component.node.frame.height;
    if (component.node._originalStyle) {
      if (typeof component.node._originalStyle.marginTop === 'number') {
        height += (+component.node._originalStyle.marginTop);
      }

      if (typeof component.node._originalStyle.marginBottom === 'number') {
        height += (+component.node._originalStyle.marginBottom);
      }
    }
    return height;
  }

  const renderItem = (itemIndex: number, translateY: number) => {
    const item = itemGetter(itemIndex);

    return (
      React.cloneElement(item, {
        key: itemIndex,
        ref: (ref: CanvasComponent) => {
          if (ref) {
            // correct actual scrollTop for visible items.
            // the size change of invisible items are leave out of confideration here and will be corrected again when scroll to make them appear.
            const scrollTopList = childrenScrollTopRef.current;
            const computedHeight = computeItemHeight(ref);

            const needUpdateDimensions = scrollTopList[itemIndex] == null && itemIndex === numberOfItemsGetter() - 1;
            const prevItemScroll = scrollTopList[itemIndex - 1] || {
              scrollTop: 0,
              height: 0,
            };

            scrollTopList[itemIndex] = {
              scrollTop: prevItemScroll.scrollTop + prevItemScroll.height,
              height: computedHeight,
            };

            if (needUpdateDimensions) {
              scrollerRef.current && scrollerRef.current.setDimensions(
                style.width,
                style.height,
                scrollWidth,
                scrollTopList[itemIndex].scrollTop + scrollTopList[itemIndex].height,
              );
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

    for (let i = 0; i < itemCount; i++) {
      if (!childrenScrollTopRef.current[i]) {
        itemIndexes.push(i);
      } else {
        let itemScrollTop = childrenScrollTopRef.current[i].scrollTop - scrollReducer[0].scrollTop;

        // Items completely reach over off-screen bottom.
        if (itemScrollTop >= style.height) {
          continue;
        }

        // Item is completely off-screen top
        if (itemScrollTop <= -childrenScrollTopRef.current[i].height) {
          continue;
        }

        // Part of item is on-screen.
        itemIndexes.push(i);
      }
    }

    const translateY = itemIndexes[0] !== undefined && childrenScrollTopRef.current.length > 0 ? childrenScrollTopRef.current[itemIndexes[0]].scrollTop - scrollReducer[0].scrollTop : 0;
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