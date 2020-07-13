import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Group } from './Core';
import { useForceUpdate } from './utils';
import { Scroller } from 'scroller';
import clamp from './clamp';

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
  const childrenScrollTopRef = useRef([]);
  const [scrollTop, setScrollTop] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const forceUpdate = useForceUpdate();

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

  useEffect(() => {
    // create scroller.
    const options = {
      scrollingX: false,
      scrollingY: true,
      decelerationRate: scrollingDeceleration,
      penetrationAcceleration: scrollingPenetrationAcceleration,
    };

    scrollerRef.current = new Scroller(handleScroll, options);

    // update scroller dimensions.
    let scrollWidth = style.width;
    let scrollHeight = 0;
    const layer = containerRef.current.getLayer();
    const itemCount = numberOfItemsGetter();
    for (let i = 0; i < itemCount; i++) {
      let itemScrollTop = layer.children[i].frame.y;
      childrenScrollTopRef.current.push(itemScrollTop);
      scrollHeight += layer.children[i].frame.height;
    }

    scrollerRef.current.setDimensions(style.width, style.height, scrollWidth, scrollHeight);
    forceUpdate();
  }, []);

  useEffect(() => {
    const itemCount = numberOfItemsGetter();

    for (let i = 0; i < itemCount; i++) {
      let itemScrollTop = layer.children[i].frame.y;
      childrenScrollTopRef.current.push(itemScrollTop);
      scrollHeight += layer.children[i].frame.height;
    }

  }, numberOfItemsGetter());

  const renderItem = (itemIndex, translateY) => {
    var item = itemGetter(itemIndex, scrollTop);

    return (
      React.cloneElement(item, {
        key: itemIndex,
        useBackingStore: !!(item.props.useBackingStore && scrollerRef.current),
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
    if (scrollerRef.current.__contentHeight - scrollerRef.current.__clientHeight < 0) return;

    handleScroll(0, clamp(scrollTop + deltaY, 0, scrollerRef.current.__contentHeight - scrollerRef.current.__clientHeight));
  };

  var items = getVisibleItems();
  return (
    React.createElement(Group, {
      ref: containerRef,
      style: style,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
      onWheel: handleWheel,
    }, items)
  );
}

export default List;