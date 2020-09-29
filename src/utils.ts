import { useState } from 'react';

export const emptyObject = {};

export function useForceUpdate() {
  const [_, setValue] = useState(0); // integer state
  return () => setValue(value => ++value); // update the state to force render
};
