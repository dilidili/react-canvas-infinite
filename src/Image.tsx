import React, { useState, useEffect } from 'react';
import CanvasComponent, { CanvasComponentProps, CanvasStylePropperties } from './CanvasComponent';
import { Group } from './Core';
import ImageCache from './ImageCache';
import clamp from './clamp'
import { ImageRenderLayer } from './RenderLayer';

const RawImageName = 'RawImage';

const LAYER_TYPE = 'image';

interface RawImageProps extends CanvasComponentProps {
  src?: string;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      RawImage: RawImageProps,
    }
  }
}

export class RawImage extends CanvasComponent<RawImageProps> {
  constructor() {
    super(LAYER_TYPE);

    this.node = new ImageRenderLayer();
  }

  node: ImageRenderLayer;

  applyLayerProps = (prevProps: RawImageProps, props: RawImageProps) => {
    const layer = this.node;

    if (layer.type !== LAYER_TYPE) {
      layer.type = LAYER_TYPE;
    }

    if (layer.imageUrl !== props.src) {
      layer.imageUrl = props.src;
    }

    this.applyCommonLayerProps(prevProps, props);
  }
}

type ImageProps = {
  src: string;
  style?: CanvasStylePropperties,
}

const Image: React.FC<ImageProps> = (props) => {
  const [loaded, setLoaded] = useState(false);
  const [imageAlpha, setImageAlpha] = useState(0);

  const imageStyle = Object.assign({}, props.style);
  const style = Object.assign({}, props.style);
  const backgroundStyle = Object.assign({}, props.style);
  const useBackingStore = !!loaded;

  useEffect(() => {
    const handleImageLoad = () => {
      setLoaded(true);
      setImageAlpha(1);
    };

    const image = ImageCache.get(props.src);

    if (image.isLoaded()) {
      handleImageLoad();
      return undefined;
    } else {
      image.on('load', handleImageLoad);
      return () => {
        ImageCache.get(props.src).off('load', handleImageLoad);
      }
    }
  }, [props.src]);

  // Hide the image until loaded.
  imageStyle.alpha = imageAlpha;

  // Hide opaque background if image loaded so that images with transparent
  // do not render on top of solid color.
  style.backgroundColor = undefined;
  imageStyle.backgroundColor = undefined;
  backgroundStyle.alpha = clamp(1 - imageAlpha, 0, 1);

  return (
    <Group style={style}>
      <RawImageName
        src={props.src}
        style={imageStyle}
        useBackingStore={useBackingStore}
      />
    </Group>
  )
}

export default Image;