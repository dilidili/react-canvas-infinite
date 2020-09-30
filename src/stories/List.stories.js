import React from 'react';

import List from './List';

export default {
  title: 'Example/List',
  component: List,
};

const Template = (args) => <List {...args} />;

export const Normal = Template.bind({});
Normal.args = {
  user: {},
};
