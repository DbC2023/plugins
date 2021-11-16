/* globals describe, expect, it, test, DataStore */
import { exportAllDeclaration } from '@babel/types'
import { differenceInCalendarDays, endOfDay, startOfDay, eachMinuteOfInterval, formatISO9075 } from 'date-fns'
import * as tb from '../src/timeblocking-helpers'
// import { sortListBy, getTasksByType } from '../../dwertheimer.TaskAutomations/src/taskHelpers'
const _ = require('lodash')
const config = {
  todoChar: '*',
  timeBlockTag: `#🕑`,
  timeBlockHeading: 'Time Blocks',
  workDayStart: '08:00',
  workDayEnd: '18:00',
  durationMarker: "'",
  intervalMins: 5,
  removeDuration: true,
}

// import { isNullableTypeAnnotation } from '@babel/types'

// Jest suite
describe('timeblocking', () => {
  test('dwertheimer.EventAutomations - timeblocking.createIntervalMap ', () => {
    let result = tb.createIntervalMap(
      { start: new Date('2020-01-01 08:00:00'), end: new Date('2020-01-01 24:00:00') },
      'isSet',
      {
        step: 5,
      },
    )
    expect(result[0]).toEqual({ start: '08:00', busy: 'isSet', index: 0 })
    expect(result[191]).toEqual({ start: '23:55', busy: 'isSet', index: 191 })
    expect(result.length).toEqual(193)
    result = tb.createIntervalMap(
      { start: new Date('2020-01-01 00:00:00'), end: new Date('2020-01-01 23:59:59') },
      null,
      {
        step: 3,
      },
    )
    expect(result[0]).toEqual({ start: '00:00', busy: null, index: 0 })
    expect(result[479]).toEqual({ start: '23:57', busy: null, index: 479 })
    expect(result.length).toEqual(480)
    result = tb.createIntervalMap(new Date('2020-01-01 00:00:00'), new Date('2020-01-01 23:59:59'), null, null)
    expect(result).toEqual([])
  })
  test('dwertheimer.EventAutomations - timeblocking.getBlankDayMap ', () => {
    const result = tb.getBlankDayMap(5)
    expect(result[0]).toEqual({ start: '00:00', busy: false, index: 0 })
    expect(result[287]).toEqual({ start: '23:55', busy: false, index: 287 })
    expect(result.length).toEqual(288)
  })
  test('dwertheimer.EventAutomations - timeblocking.removeDateTagsAndToday ', () => {
    expect(tb.removeDateTagsAndToday(`test >today`)).toEqual('test')
    expect(tb.removeDateTagsAndToday(`test >2021-11-09`)).toEqual('test')
  })
  test('dwertheimer.EventAutomations - timeblocking.blockTimeFor ', () => {
    const map = tb.getBlankDayMap(5)
    let result = tb.blockTimeFor(map, { start: '08:00', end: '09:00', title: 'testing' }, config)
    expect(result.newMap[0]).toEqual({ start: '00:00', busy: false, index: 0 })
    expect(result.newMap[95]).toEqual({ start: '07:55', busy: false, index: 95 })
    expect(result.newMap[96]).toEqual({ start: '08:00', busy: 'testing', index: 96 })
    expect(result.newMap[107]).toEqual({ start: '08:55', busy: 'testing', index: 107 })
    expect(result.newMap[108]).toEqual({ start: '09:00', busy: false, index: 108 })
    expect(result.newMap[287]).toEqual({ start: '23:55', busy: false, index: 287 })
    result = tb.blockTimeFor(map, { start: '08:00', end: '09:00' }, config)
    expect(result.itemText).toEqual('')
    expect(result.newMap[0]).toEqual({ start: '00:00', busy: false, index: 0 })
    expect(result.newMap[96]).toEqual({ start: '08:00', busy: true, index: 96 })
    expect(result.newMap[107]).toEqual({ start: '08:55', busy: true, index: 107 })
  })
  test('dwertheimer.EventAutomations - timeblocking.attachTimeblockTag', () => {
    expect(tb.attachTimeblockTag('test', '#tag')).toEqual('test #tag')
    expect(tb.attachTimeblockTag('test #tag', '#tag')).toEqual('test #tag')
  })
  test('dwertheimer.EventAutomations - timeblocking.createTimeBlockLine ', () => {
    let cfg = { ...config, timeBlockTag: '#tag', removeDuration: true }
    expect(tb.createTimeBlockLine({ title: 'foo', start: '08:00', end: '09:00' }, cfg)).toEqual(
      '* 08:00-09:00 foo #tag',
    )
    expect(tb.createTimeBlockLine({ title: 'foo', start: '08:00', end: '09:00' }, cfg)).toEqual(
      '* 08:00-09:00 foo #tag',
    )
    expect(tb.createTimeBlockLine({ title: 'foo', start: '08:00', end: '09:00' }, cfg)).toEqual(
      '* 08:00-09:00 foo #tag',
    )
    expect(tb.createTimeBlockLine({ title: "foo bar '2h22m", start: '08:00', end: '09:00' }, cfg)).toEqual(
      '* 08:00-09:00 foo bar #tag',
    )
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
    const map = tb.getBlankDayMap(5)
    let events = [{ date: new Date('2021-01-01 00:10'), endDate: new Date('2021-01-01 00:21'), title: 'event1' }]
    let returnVal = tb.blockOutEvents(events, map, config)
    expect(returnVal[2].busy).toEqual('event1')
    events.push({ date: new Date('2021-01-01 00:20'), endDate: new Date('2021-01-01 00:30'), title: 'event2' })
    returnVal = tb.blockOutEvents(events, map, config)
    expect(returnVal[4].busy).toEqual('event2')
    expect(returnVal[6].busy).toEqual(false)
    events.push({ date: new Date('2021-01-01 00:20'), title: 'event3' })
    returnVal = tb.blockOutEvents(events, map, config)
    expect(returnVal[6].busy).toEqual(false)
  })

  test('dwertheimer.EventAutomations - timeblocking.durationRegEx ', () => {
    expect(tb.durationRegEx('~')).toEqual(
      new RegExp(`\\s*~(([0-9]+\\.?[0-9]*|\\.[0-9]+)h)*(([0-9]+\\.?[0-9]*|\\.[0-9]+)m)*`, 'mg'),
    )
  })

  test('dwertheimer.EventAutomations - timeblocking.removeDurationParameter ', () => {
    // hours and mins
    expect(tb.removeDurationParameter('this is foo ~2h22m', '~')).toEqual('this is foo')
    // minutes only
    expect(tb.removeDurationParameter('this is foo ~22m', '~')).toEqual('this is foo')
    // multiple splits (after the duration)
    expect(tb.removeDurationParameter('this is foo ~22m (2)', '~')).toEqual('this is foo (2)')
    // multiple splits (before the duration)
    expect(tb.removeDurationParameter('this is foo (2) ~22m', '~')).toEqual('this is foo (2)')
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
  test('dwertheimer.EventAutomations - timeblocking.removeDateTagsFromArray ', () => {
    const inputArray = [
      { indents: 1, type: 'open', content: 'thecontent >today', rawContent: '* thecontent >today' },
      { indents: 0, type: 'scheduled', content: '2thecontent >2021-01-01', rawContent: '* 2thecontent >2021-01-01' },
      { indents: 0, type: 'scheduled', content: '', rawContent: '' },
    ]
    const returnval = tb.removeDateTagsFromArray(inputArray)
    expect(returnval[0].content).toEqual('thecontent')
    expect(returnval[1].rawContent).toEqual('* 2thecontent')
    expect(returnval[2].content).toEqual('')
  })

  test('dwertheimer.EventAutomations - timeblocking.filterTimeMapToOpenSlots ', () => {
    let timeMap = [
      { start: '00:00', busy: false },
      { start: '00:05', busy: false },
    ]
    let cfg = { ...config, workDayStart: '00:00', workDayEnd: '23:59', nowStrOverride: '00:02 ' }
    // expect(tb.filterTimeMapToOpenSlots(timeMap, nowStr, workDayStart, workDayEnd)).toEqual(true)
    expect(tb.filterTimeMapToOpenSlots(timeMap, cfg)).toEqual(timeMap.slice(1, 2)) // now is after first item
    cfg.nowStrOverride = '00:00'
    expect(tb.filterTimeMapToOpenSlots(timeMap, cfg)).toEqual(timeMap) // now is equal to first item
    cfg = { ...cfg, workDayStart: '00:01' }
    expect(tb.filterTimeMapToOpenSlots(timeMap, cfg)).toEqual(timeMap.slice(1, 2)) // workDayStart is after first item
    cfg = { ...cfg, workDayStart: '00:05' }
    expect(tb.filterTimeMapToOpenSlots(timeMap, cfg)).toEqual(timeMap.slice(1, 2)) // workDayStart is equal to 2nd item
    cfg = { ...config, workDayEnd: '00:00', nowStrOverride: '00:00' }
    expect(tb.filterTimeMapToOpenSlots(timeMap, cfg)).toEqual([]) // workDayEnd is before 1st item
    cfg = { ...config, workDayStart: '00:00', workDayEnd: '00:03', nowStrOverride: '00:00' }
    expect(tb.filterTimeMapToOpenSlots(timeMap, cfg, '00:00')).toEqual(timeMap.slice(0, 1)) // workDayEnd is before 2st item
  })

  test('dwertheimer.EventAutomations - timeblocking.calculateSlotDifferenceInMins ', () => {
    let cfg = { ...config, intervalMins: 2 }
    expect(tb.calculateSlotDifferenceInMins({ start: '00:00', end: '00:10' }, cfg, false).minsAvailable).toEqual(10)
    expect(tb.calculateSlotDifferenceInMins({ start: '00:00', end: '00:10' }, cfg, true).minsAvailable).toEqual(12)
    expect(tb.calculateSlotDifferenceInMins({ start: '00:00', end: '02:10' }, cfg, false).minsAvailable).toEqual(130)
    expect(tb.calculateSlotDifferenceInMins({ start: '00:00', end: '02:10' }, cfg, false)).toEqual({
      start: '00:00',
      end: '02:10',
      minsAvailable: 130,
    })
    expect(tb.calculateSlotDifferenceInMins({ start: '00:00', end: '02:10' }, cfg, true)).toEqual({
      start: '00:00',
      end: '02:12',
      minsAvailable: 132,
    })
  })

  test('dwertheimer.EventAutomations - timeblocking.makeDateFromTimeString ', () => {
    expect(tb.makeDateFromTimeString('2021-01-01', '00:00').toISOString()).toEqual('2021-01-01T08:00:00.000Z')
  })

  test('dwertheimer.EventAutomations - timeblocking.findTimeBlocks ', () => {
    // empty map should return empty array
    expect(tb.findTimeBlocks([])).toEqual([])
    let timeMap = [
      { start: '00:05', busy: false, index: 0 },
      { start: '00:15', busy: false, index: 2 } /* this one should cause a break */,
      { start: '00:20', busy: false, index: 3 },
      { start: '00:30', busy: false, index: 5 } /* this one should cause a break */,
    ]
    let timeBlocks = tb.findTimeBlocks(timeMap, config)
    expect(timeBlocks[0]).toEqual({ start: '00:05', end: '00:10', minsAvailable: 5 })
    expect(timeBlocks[1]).toEqual({ start: '00:15', end: '00:25', minsAvailable: 10 })
    expect(timeBlocks[2]).toEqual({ start: '00:30', end: '00:35', minsAvailable: 5 })

    timeMap = [
      // test the whole map is available/contiguous
      { start: '00:15', busy: false, index: 2 },
      { start: '00:20', busy: false, index: 3 },
      { start: '00:25', busy: false, index: 4 },
    ]
    timeBlocks = tb.findTimeBlocks(timeMap, config)
    expect(timeBlocks.length).toEqual(1)
    expect(timeBlocks[0]).toEqual({ start: '00:15', end: '00:30', minsAvailable: 15 })
    timeMap = [
      // one item and one contiguous block
      { start: '00:00', busy: false, index: 0 },
      { start: '00:15', busy: false, index: 2 },
      { start: '00:20', busy: false, index: 3 },
      { start: '00:25', busy: false, index: 4 },
    ]
    timeBlocks = tb.findTimeBlocks(timeMap, config)
    expect(timeBlocks.length).toEqual(2)
    expect(timeBlocks[0]).toEqual({ start: '00:00', end: '00:05', minsAvailable: 5 })
    expect(timeBlocks[1]).toEqual({ start: '00:15', end: '00:30', minsAvailable: 15 })
  })

  test.skip('dwertheimer.EventAutomations - timeblocking.findOptimalTimeForEvent ', () => {
    expect(tb.findOptimalTimeForEvent()).toEqual(true)
  })

  test.skip('dwertheimer.EventAutomations - timeblocking.getTimeBlockTimesForEvents ', () => {
    expect(tb.getTimeBlockTimesForEvents()).toEqual(true)
  })

  test('dwertheimer.EventAutomations - timeblocking.addMinutesToTimeText ', () => {
    expect(tb.addMinutesToTimeText('00:00', 21)).toEqual('00:21')
    expect(tb.addMinutesToTimeText('00:00', 180)).toEqual('03:00')
    expect(tb.addMinutesToTimeText('00:50', 20)).toEqual('01:10')
  })

  // test.skip('dwertheimer.EventAutomations - timeblocking.isTimeBlockLine ', () => {
  //   expect(tb.isTimeBlockLine('10:00-11:00')).toEqual(true)
  //   expect(tb.isTimeBlockLine('10:00')).toEqual(true)
  //   expect(tb.isTimeBlockLine('at 10:00')).toEqual(true)
  //   expect(tb.isTimeBlockLine('at 2pm')).toEqual(true)
  // })

  test('dwertheimer.EventAutomations - timeblocking.blockTimeAndCreateTimeBlockText ', () => {
    let timeMap = [
      { start: '00:00', busy: false, index: 0 },
      { start: '00:05', busy: false, index: 1 },
    ]
    let blockList = tb.findTimeBlocks(timeMap, config)
    let block = { start: '00:00', end: '00:05', title: "test '2m" }
    let timeBlockTextList = []
    let tbm = { timeMap, blockList, timeBlockTextList }
    let cfg = { ...config, nowStrOverride: '00:00', workDayStart: '00:00' }
    // (1) Base test. Block a time and return proper results
    const result = tb.blockTimeAndCreateTimeBlockText(tbm, block, cfg)
    expect(result).toEqual({
      blockList: [{ end: '00:10', minsAvailable: 5, start: '00:05' }],
      timeBlockTextList: [`* 00:00-00:05 test ${config.timeBlockTag}`],
      timeMap: [{ busy: false, index: 1, start: '00:05' }],
    })
    // (2) Run a second test on the result of the first test.
    // comes back with empty timeMap and blockList b/c interval is 5m
    block = { start: '00:05', end: '00:07', title: "test2 '2m" }
    const result2 = tb.blockTimeAndCreateTimeBlockText(result, block, cfg)
    expect(result2).toEqual({
      blockList: [],
      timeBlockTextList: [`* 00:00-00:05 test ${config.timeBlockTag}`, `* 00:05-00:07 test2 ${config.timeBlockTag}`],
      timeMap: [],
    })
    // (3) Run a third test
    // but with a 2m interval. Should split the block and send back the remainder
    block = { start: '00:00', end: '00:02', title: "test2 '2m" }
    timeMap = [
      { start: '00:00', busy: false, index: 0 },
      { start: '00:02', busy: false, index: 1 },
      { start: '00:04', busy: false, index: 2 },
      { start: '00:06', busy: false, index: 3 },
    ]
    cfg.intervalMins = 2
    blockList = tb.findTimeBlocks(timeMap, cfg)
    tbm = { timeMap, blockList, timeBlockTextList: [] }
    const result3 = tb.blockTimeAndCreateTimeBlockText(tbm, block, cfg)
    expect(result3).toEqual({
      blockList: [{ start: '00:02', end: '00:08', minsAvailable: 6 }],
      timeBlockTextList: [`* 00:00-00:02 test2 ${config.timeBlockTag}`],
      timeMap: [
        { start: '00:02', busy: false, index: 1 },
        { start: '00:04', busy: false, index: 2 },
        { start: '00:06', busy: false, index: 3 },
      ],
    })
  })

  test('dwertheimer.EventAutomations - timeblocking.matchTasksToSlotsWithSplits ', () => {
    let tasks = [{ content: "line1 '2m" }, { content: "line2 '1m" }]
    let timeMap = [
      { start: '00:02', busy: false, index: 1 },
      { start: '00:04', busy: false, index: 2 },
      { start: '00:06', busy: false, index: 3 },
      /* block[0]: start:00:02 end:00:08 minsAvailable: 6 */
      { start: '00:20', busy: false, index: 10 },
      { start: '00:22', busy: false, index: 11 },
      /* block[1]: start:00:20 end:00:24 minsAvailable: 4 */
    ]
    let timeBlocks = [{ start: '00:02', end: '00:08', minsAvailable: 6 }]
    let cfg = { ...config, nowStrOverride: '00:00', workDayStart: '00:00', intervalMins: 2 }
    // First check that items that fit inside the time block work properly
    let res = tb.matchTasksToSlotsWithSplits(tasks, { blockList: timeBlocks, timeMap }, cfg)
    expect(res.timeBlockTextList[0]).toEqual(`* 00:02-00:04 line1 ${config.timeBlockTag}`)
    expect(res.timeBlockTextList[1]).toEqual(`* 00:04-00:05 line2 ${config.timeBlockTag}`)
    expect(res.blockList[0]).toEqual({ start: '00:06', end: '00:08', minsAvailable: 2 })
    expect(res.blockList[1]).toEqual({ start: '00:20', end: '00:24', minsAvailable: 4 })
    expect(res.timeMap[0]).toEqual({ start: '00:06', busy: false, index: 3 })
    expect(res.timeMap[1]).toEqual({ start: '00:20', busy: false, index: 10 })
    expect(res.timeMap[2]).toEqual({ start: '00:22', busy: false, index: 11 })
    // Now check that items that don't fit inside the time block get split properly
    // Even if the whole task can't find a slot
    const nonFittingTask = [{ content: "line3 '12m" }]
    timeBlocks = [
      { start: '00:02', end: '00:08', minsAvailable: 6 },
      { start: '00:20', end: '00:24', minsAvailable: 4 },
    ]
    res = tb.matchTasksToSlotsWithSplits(
      nonFittingTask,
      { blockList: timeBlocks, timeMap: timeMap, timeBlockTextList: [] },
      cfg,
    )
    expect(res.timeBlockTextList[0]).toEqual(`* 00:02-00:08 line3 (1) ${config.timeBlockTag}`)
    expect(res.timeBlockTextList[1]).toEqual(`* 00:20-00:24 line3 (2) ${config.timeBlockTag}`)
    expect(res.timeBlockTextList.length).toEqual(2)
    expect(res.timeMap.length).toEqual(0)
    expect(res.blockList.length).toEqual(0)
  })
})
