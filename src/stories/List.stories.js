import React from 'react';

import List from './List';

export default {
  title: 'Example/List',
  component: List,
};

const Template = (args) => <List {...args} />;

export const LoggedIn = Template.bind({});
LoggedIn.args = {
  user: {},
};

export const LoggedOut = Template.bind({});
LoggedOut.args = {};
