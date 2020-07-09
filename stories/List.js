import React from 'react'
import { storiesOf } from '@storybook/react'
import datas from './data';
import { Group, Image, Text, Surface, FontFace, List } from '../src/index'

storiesOf('List', module).add('infinite scroll', () => {
  const props = { size: { width: 400, height: 400 } }

  return (
    <div>
      <Surface
        enableCSSLayout
        top={0}
        left={0}
        width={props.size.width}
        height={props.size.height}
        enableDebug={true}
        enableDebug={false}
      >
        <List style={{ fontFace: FontFace('sans-serif'), height: 300 }}>
          {datas.map((data, index) => {
            return (
              <Group style={{ flexDirection: 'row', marginBottom: 20 }} key={index}>
                <Image src={data.imageUrl} style={{ marginRight: 10, width: 40, height: 40, borderRadius: 20 }}></Image>

                <Group style={{ height: 40, justifyContent: 'space-between' }}>
                  <Text>{data.title}</Text>
                  <Text>{data.excerpt}</Text>
                </Group>
              </Group>
            );
          })}
        </List>
      </Surface>
    </div>
  )
})
