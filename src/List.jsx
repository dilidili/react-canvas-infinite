import React, { useState } from 'react';
import { Group } from './Core';

const List = (props) => {
  const { style, children } = props;
  const [offsetY, setOffsetY] = useState(0);

  return (
    <Group style={{ ...style, }} scrollY>
      {children}
    </Group>
  )
}

export default List;