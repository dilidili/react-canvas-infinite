import React, { useState } from 'react';
import { storiesOf } from '@storybook/react';
import datas from './data';
import { Group, Image, Text, Surface, FontFace, List } from '../index';

storiesOf('List', module).add('infinite scroll', () => {
  const props = { size: { width: 400, height: 400 } }
  const [dataList, setDataList] = useState(datas);

  return (
    <div>
      <Surface
        width={props.size.width}
        height={props.size.height}
        // enableDebug={true}
      >
        <List
          style={{ fontFace: new FontFace('sans-serif'), height: 300, width: 500 }}
          numberOfItemsGetter={() => dataList.length}
          itemGetter={(index) => {
            const data = dataList[index];

            return (
              <Group style={{ flexDirection: 'row', marginBottom: 20 }}>
                <Image src={data.imageUrl} style={{ marginRight: 10, width: 40, height: 40, borderRadius: 20 }}></Image>

                <Group style={{ height: 40, justifyContent: 'space-between' }}>
                  <Text>{data.title}</Text>
                  <Text>{data.excerpt}</Text>
                </Group>
              </Group>
            );
          }}
          onLoadMore={() => {
            return new Promise((resolve) => {
              setTimeout(() => {
                setDataList(datas => datas.concat(datas.slice(0, 3)));
                resolve();
              }, 500);
            });
          }}
        >
        </List>
      </Surface>
    </div>
  )
})