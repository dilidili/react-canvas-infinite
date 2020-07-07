import React from 'react'
import { storiesOf } from '@storybook/react'
import datas from './data';
import { Group, Image, Text, Surface } from '../src/index'

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
        enableDebug
      >
        {datas.map((data) => {
          return (
            <Group style={{ flexDirection: 'row', marginBottom: 20, height: 20, width: 20, backgroundColor: 'red' }}>
              {/* <Image src={data.imageUrl} style={{ marginRight: 10, width: 40, height: 40 }}></Image>

              <Group style={{ backgroundColor: 'red', width: 100, height: 20 }}>
                <Text style={{ color: 'black', fontSize: '12px', width: 100 }}>{data.title}</Text>
                <Text>{data.excerpt}</Text>
              </Group> */}
            </Group>
          );
        })}
      </Surface>
    </div>
  )
})
