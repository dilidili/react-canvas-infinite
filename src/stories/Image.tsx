import React from 'react';
import { Image, Surface } from '../index';

const Demo = () => {
  return (
    <div>
      <Surface
        width={100}
        height={100}
        enableDebug={true}
      >
        <Image src={'https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png'} style={{ width: 100, height: 100, borderRadius: 20 }}></Image>
      </Surface>
    </div>
  )
};

export default Demo;