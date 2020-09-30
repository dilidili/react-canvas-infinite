import React, { useState } from 'react';
import datas from './data';
import { Group, Image, Text, Surface, FontFace, List } from '../index';

const Demo = () => {
  const props = { size: { width: 400, height: 400 } };
  const [dataList, setDataList] = useState(datas);

  return (
    <div>
      <Surface
        width={props.size.width}
        height={props.size.height}
        // enableDebug={true}
      >
        <List
          style={{ fontFace: FontFace('sans-serif'), height: 400, width: 400 }}
          numberOfItemsGetter={() => dataList.length}
          itemGetter={(index) => {
            const data = dataList[index];

            return (
              <Group style={{ flexDirection: 'row', marginBottom: 20 }}>
                <Image src={data.imageUrl} style={{ marginRight: 10, width: 40, height: 40, borderRadius: 20 }}></Image>

                <Group style={{ height: 40, justifyContent: 'space-between' }}>
                  <Text>{`${index} ${data.title}`}</Text>
                  <Text>{data.excerpt}</Text>
                </Group>
              </Group>
            );
          }}
          onLoadMore={() => {
            return new Promise((resolve) => {
              setTimeout(() => {
                setDataList(datas => datas.concat(datas.slice(0, 8)));
                resolve();
              }, 1500);
            });
          }}
        >
        </List>
      </Surface>
    </div>
  )
};

export default Demo;