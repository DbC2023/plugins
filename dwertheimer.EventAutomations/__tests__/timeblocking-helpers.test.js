/* globals describe, expect, it, test, DataStore */
import { exportAllDeclaration } from '@babel/types'
import { differenceInCalendarDays, endOfDay, startOfDay, eachMinuteOfInterval, formatISO9075 } from 'date-fns'
import * as tb from '../src/timeblocking-helpers'
const _ = require('lodash')
// import { isNullableTypeAnnotation } from '@babel/types'

// Jest suite
describe('timeblocking', () => {
  test('dwertheimer.EventAutomations - timeblocking.createIntervalMap ', () => {
    let result = tb.createIntervalMap(new Date('2020-01-01 08:00:00'), new Date('2020-01-01 24:00:00'), 'isSet', {
      step: 5,
    })
    expect(result[0]).toEqual({ start: '08:00', busy: 'isSet' })
    expect(result[191]).toEqual({ start: '23:55', busy: 'isSet' })
    expect(result.length).toEqual(193)
    result = tb.createIntervalMap(new Date('2020-01-01 00:00:00'), new Date('2020-01-01 23:59:59'), null, {
      step: 3,
    })
    expect(result[0]).toEqual({ start: '00:00', busy: null })
    expect(result[479]).toEqual({ start: '23:57', busy: null })
    expect(result.length).toEqual(480)
    result = tb.createIntervalMap(new Date('2020-01-01 00:00:00'), new Date('2020-01-01 23:59:59'), null, null)
    expect(result).toEqual([])
  })
  test('dwertheimer.EventAutomations - timeblocking.getBlankDayMap ', () => {
    const result = tb.getBlankDayMap()
    expect(result[0]).toEqual({ start: '00:00', busy: false })
    expect(result[287]).toEqual({ start: '23:55', busy: false })
    expect(result.length).toEqual(288)
  })
  test('dwertheimer.EventAutomations - timeblocking.removeDateTagsAndToday ', () => {
    expect(tb.removeDateTagsAndToday(`test >today`)).toEqual('test')
    expect(tb.removeDateTagsAndToday(`test >2021-11-09`)).toEqual('test')
  })
  test('dwertheimer.EventAutomations - timeblocking.blockTimeFor ', () => {
    const map = tb.getBlankDayMap()
    let result = tb.blockTimeFor(map, '08:00', '09:00', 'testing')
    expect(result[0]).toEqual({ start: '00:00', busy: false })
    expect(result[95]).toEqual({ start: '07:55', busy: false })
    expect(result[96]).toEqual({ start: '08:00', busy: 'testing' })
    expect(result[107]).toEqual({ start: '08:55', busy: 'testing' })
    expect(result[108]).toEqual({ start: '09:00', busy: false })
    expect(result[287]).toEqual({ start: '23:55', busy: false })
    result = tb.blockTimeFor(map, '08:00', '09:00')
    expect(result[0]).toEqual({ start: '00:00', busy: false })
    expect(result[96]).toEqual({ start: '08:00', busy: true })
  })
  test('dwertheimer.EventAutomations - timeblocking.attachTimeblockTag', () => {
    expect(tb.attachTimeblockTag('test', '#tag')).toEqual('test #tag')
    expect(tb.attachTimeblockTag('test #tag', '#tag')).toEqual('test #tag')
  })
  test('dwertheimer.EventAutomations - timeblocking.createTimeBlockLine ', () => {
    expect(tb.createTimeBlockLine('foo', '08:00', '09:00', '*', '#tag')).toEqual('* 08:00-09:00 foo #tag')
    expect(tb.createTimeBlockLine('foo', '08:00', '09:00')).toEqual('* 08:00-09:00 foo #TimeBlock')
    expect(tb.createTimeBlockLine('foo', '08:00', '09:00', '*')).toEqual('* 08:00-09:00 foo #TimeBlock')
  })
  test('dwertheimer.EventAutomations - timeblocking.getTimedEntries ', () => {
    const testItems = [
      { title: 'one', isAllDay: false },
      { title: 'two', isAllDay: true },
    ]
    expect(
      tb.getTimedEntries([
        { title: 'one', isAllDay: false },
        { title: 'two', isAllDay: true },
      ]),
    ).toEqual([
      {
        title: 'one',
        isAllDay: false,
      },
    ])
  })
  test('dwertheimer.EventAutomations - timeblocking.getTimeStringFromDate ', () => {
    expect(tb.getTimeStringFromDate(new Date('2020-01-01 23:59'))).toEqual('23:59')
  })
  test('dwertheimer.EventAutomations - timeblocking.blockOutEvents ', () => {
    const map = tb.getBlankDayMap()
    let events = [{ date: new Date('2021-01-01 00:10'), endDate: new Date('2021-01-01 00:21'), title: 'event1' }]
    let returnVal = tb.blockOutEvents(events, map)
    expect(returnVal[2].busy).toEqual('event1')
    events.push({ date: new Date('2021-01-01 00:20'), endDate: new Date('2021-01-01 00:30'), title: 'event2' })
    returnVal = tb.blockOutEvents(events, map)
    expect(returnVal[4].busy).toEqual('event2')
    expect(returnVal[6].busy).toEqual(false)
    events.push({ date: new Date('2021-01-01 00:20'), title: 'event3' })
    returnVal = tb.blockOutEvents(events, map)
    expect(returnVal[6].busy).toEqual(false)
  })
  test('dwertheimer.EventAutomations - timeblocking.getDurationFromLine ', () => {
    expect(tb.getDurationFromLine('', "'")).toEqual(0)
    expect(tb.getDurationFromLine('no time sig', "'")).toEqual(0)
    expect(tb.getDurationFromLine(" '2m", "'")).toEqual(2)
    expect(tb.getDurationFromLine(" '2h", "'")).toEqual(120)
    expect(tb.getDurationFromLine(" '2.5h", "'")).toEqual(150)
    expect(tb.getDurationFromLine(" '2.5m", "'")).toEqual(3)
    expect(tb.getDurationFromLine(" '2h5m", "'")).toEqual(125)
  })
})
