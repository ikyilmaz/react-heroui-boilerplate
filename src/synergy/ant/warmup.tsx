import { startTransition, useEffect, useState } from 'react'
import {
  AutoComplete,
  Avatar,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Menu,
  Pagination,
  Radio,
  Segmented,
  Select,
  Skeleton,
  Slider,
  Spin,
  Switch,
  Table,
  Tag,
  TimePicker,
  Transfer,
} from 'antd'

/* -------------------------------------------------------------------------------------------------
 * antd stillerinin önceden basılması. antd her bileşenin stilini o bileşen ilk kez çizilince
 * belgeye ekler (`<style>`, CSS-in-JS); stil sayfası eklenince bütün sayfanın stili ve düzeni
 * yeniden hesaplanır. Bu, açılıştan sonraki ilk sekme açılışına (iskelet, tablo, form alanları)
 * denk geliyordu: o karede bütün sayfa yeniden diziliyordu. Burada sayfaların kullandığı bileşenler
 * açılıştan sonra boşta, görünmez bir kapta bir kez çizilir; stilleri o an basılır, sonra yerinde
 * kalır (açılır pencereler kendi ilk açılışlarında basar).
 * ------------------------------------------------------------------------------------------------- */

const COLUMNS = [{ key: 'a', title: 'a', dataIndex: 'a' }]
const ROWS = [{ key: '1', a: '1' }]

export function AntWarmup() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const go = () => startTransition(() => setOn(true))
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(go, { timeout: 3000 })
      return () => cancelIdleCallback(id)
    }
    const t = setTimeout(go, 800)
    return () => clearTimeout(t)
  }, [])
  if (!on) return null
  return (
    <Flex aria-hidden className="hidden" {...({ inert: true } as Record<string, unknown>)}>
      <Skeleton active />
      <Skeleton.Input active />
      <Skeleton.Button active />
      <Skeleton.Avatar active />
      <Skeleton.Node active />
      <Table size="middle" pagination={false} columns={COLUMNS} dataSource={ROWS} />
      <Form component={false}>
        <Form.Item label="a">
          <Input />
        </Form.Item>
      </Form>
      <Input.TextArea />
      <InputNumber />
      <Select />
      <AutoComplete />
      <DatePicker />
      <TimePicker />
      <Segmented options={['a']} />
      <Radio.Group options={['a']} />
      <Switch />
      <Slider />
      <Tag>a</Tag>
      <Avatar>a</Avatar>
      <Card>a</Card>
      <Divider />
      <Spin />
      <Pagination total={20} />
      <Descriptions items={[{ key: 'a', label: 'a', children: 'a' }]} />
      <Empty />
      <Menu items={[{ key: 'a', label: 'a' }]} />
      <Transfer />
    </Flex>
  )
}
