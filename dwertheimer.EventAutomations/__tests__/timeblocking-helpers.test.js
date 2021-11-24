/* globals describe, expect, it, test */
import colors from 'chalk'
import { exportAllDeclaration } from '@babel/types'
import { differenceInCalendarDays, endOfDay, startOfDay, eachMinuteOfInterval, formatISO9075 } from 'date-fns'
import { getTasksByType } from '../../dwertheimer.TaskAutomations/src/taskHelpers'
import * as tb from '../src/timeblocking-helpers'
// import { sortListBy, getTasksByType } from '../../dwertheimer.TaskAutomations/src/taskHelpers'
import { JSP } from '../../helpers/dev'
const _ = require('lodash')

const PLUGIN_NAME = `📙 ${colors.yellow('dwertheimer.EventAutomations')}`
const section = colors.blue

const config = {
  todoChar: '*',
  timeBlockTag: `#🕑`,
  timeBlockHeading: 'Time Blocks',
  workDayStart: '08:00',
  workDayEnd: '18:00',
  durationMarker: "'",
  intervalMins: 5,
  removeDuration: true,
  nowStrOverride: '00:00' /* for testing */,
  defaultDuration: 10,
}

// import { isNullableTypeAnnotation } from '@babel/types'

// Jest suite
describe(`${PLUGIN_NAME}`, () => {
  describe(section('timeblocking.js'), () => {
    describe('createIntervalMap ', () => {
      test('should create timeMap of 5min intervals all day ', () => {
        const result = tb.createIntervalMap(
          { start: new Date('2020-01-01 08:00:00'), end: new Date('2020-01-01 24:00:00') },
          'isSet',
          {
            step: 5,
          },
        )
        expect(result[0]).toEqual({ start: '08:00', busy: 'isSet', index: 0 })
        expect(result[191]).toEqual({ start: '23:55', busy: 'isSet', index: 191 })
        expect(result.length).toEqual(193)
      })
      test('should create timeMap of 3min intervals all day ', () => {
        const result = tb.createIntervalMap(
          { start: new Date('2020-01-01 00:00:00'), end: new Date('2020-01-01 23:59:59') },
          null,
          {
            step: 3,
          },
        )
        expect(result[0]).toEqual({ start: '00:00', busy: null, index: 0 })
        expect(result[479]).toEqual({ start: '23:57', busy: null, index: 479 })
        expect(result.length).toEqual(480)
      })
      test('should return null when params are null', () => {
        const result = tb.createIntervalMap(
          { start: new Date('2020-01-01 00:00:00'), end: new Date('2020-01-01 23:59:59') },
          null,
          null,
        )
        expect(result).toEqual([])
      })
    })
    test('getBlankDayMap(5) returns all-day map of 5 min intervals ', () => {
      const result = tb.getBlankDayMap(5)
      expect(result[0]).toEqual({ start: '00:00', busy: false, index: 0 })
      expect(result[287]).toEqual({ start: '23:55', busy: false, index: 287 })
      expect(result.length).toEqual(288)
    })
    describe('removeDateTagsAndToday ', () => {
      test('should remove ">today" ', () => {
        expect(tb.removeDateTagsAndToday(`test >today`)).toEqual('test')
      })
      test('should remove >YYYY-MM-DD date ', () => {
        expect(tb.removeDateTagsAndToday(`test >2021-11-09`)).toEqual('test')
      })
      test('should remove nothing if no date tag ', () => {
        expect(tb.removeDateTagsAndToday(`test no date`)).toEqual('test no date')
      })
    })
    describe('blockTimeFor ', () => {
      test('should mark time map slots as busy (with title) for time of event in 2nd param', () => {
        const map = tb.getBlankDayMap(5)
        const result = tb.blockTimeFor(map, { start: '08:00', end: '09:00', title: 'testing' }, config)
        expect(result.newMap[0]).toEqual({ start: '00:00', busy: false, index: 0 })
        expect(result.newMap[95]).toEqual({ start: '07:55', busy: false, index: 95 })
        expect(result.newMap[96]).toEqual({ start: '08:00', busy: 'testing', index: 96 })
        expect(result.newMap[107]).toEqual({ start: '08:55', busy: 'testing', index: 107 })
        expect(result.newMap[108]).toEqual({ start: '09:00', busy: false, index: 108 })
        expect(result.newMap[287]).toEqual({ start: '23:55', busy: false, index: 287 })
      })
      test('should mark time map as busy: true for item without name ', () => {
        const map = tb.getBlankDayMap(5)
        const result = tb.blockTimeFor(map, { start: '08:00', end: '09:00' }, config)
        expect(result.itemText).toEqual('')
        expect(result.newMap[0]).toEqual({ start: '00:00', busy: false, index: 0 })
        expect(result.newMap[96]).toEqual({ start: '08:00', busy: true, index: 96 })
        expect(result.newMap[107]).toEqual({ start: '08:55', busy: true, index: 107 })
        expect(result.newMap[108]).toEqual({ start: '09:00', busy: false, index: 108 })
      })
    })
    describe('attachTimeblockTag', () => {
      test('should attach the given timeblock tag to a line of text', () => {
        expect(tb.attachTimeblockTag('test', '#tag')).toEqual('test #tag')
      })
      test('should not duplicate tag when attaching to a line which already has the tag', () => {
        expect(tb.attachTimeblockTag('test #tag', '#tag')).toEqual('test #tag')
      })
    })
    describe('createTimeBlockLine ', () => {
      test('should create timeblock text in form "* HH:MM-HH:MM [name] #timeblocktag" ', () => {
        const cfg = { ...config, timeBlockTag: '#tag', removeDuration: true }
        expect(tb.createTimeBlockLine({ title: 'foo', start: '08:00', end: '09:00' }, cfg)).toEqual(
          '* 08:00-09:00 foo #tag',
        )
      })
      test('should return empty string if title is empty', () => {
        const cfg = { ...config, timeBlockTag: '#tag', removeDuration: true }
        expect(tb.createTimeBlockLine({ title: '', start: '08:00', end: '09:00' }, cfg)).toEqual('')
      })
      test("should not remove duration time signature ('2h22m) from text when removeDuration config is false", () => {
        const cfg = { ...config, timeBlockTag: '#tag', removeDuration: false }
        expect(tb.createTimeBlockLine({ title: "foo bar '2h22m", start: '08:00', end: '09:00' }, cfg)).toEqual(
          "* 08:00-09:00 foo bar '2h22m #tag",
        )
      })
      test("should remove duration time signature ('2h22m) from text when removeDuration config is true", () => {
        const cfg = { ...config, timeBlockTag: '#tag', removeDuration: true }
        expect(tb.createTimeBlockLine({ title: "foo bar '2h22m", start: '08:00', end: '09:00' }, cfg)).toEqual(
          '* 08:00-09:00 foo bar #tag',
        )
      })
    })
    describe('getTimedEntries', () => {
      test('should return only items which are not isAllDay==true', () => {
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
      test('should return empty array when there are no items isAllDay==false', () => {
        expect(
          tb.getTimedEntries([
            { title: 'one', isAllDay: true },
            { title: 'two', isAllDay: true },
          ]),
        ).toEqual([])
      })
    })
    test('getTimeStringFromDate should return time portion of Date as string HH:MM', () => {
      expect(tb.getTimeStringFromDate(new Date('2020-01-01 23:59'))).toEqual('23:59')
    })
    describe('blockOutEvents ', () => {
      test('should block (only) times on the time map for the event given', () => {
        const map = tb.getBlankDayMap(5)
        const events = [{ date: new Date('2021-01-01 00:10'), endDate: new Date('2021-01-01 00:21'), title: 'event1' }]
        const returnVal = tb.blockOutEvents(events, map, config)
        expect(returnVal[1].busy).toEqual(false)
        expect(returnVal[2].busy).toEqual('event1')
        expect(returnVal[5].busy).toEqual(false)
      })
      test('overlapping events should get blocked with the later events reflected in the busy field', () => {
        const map = tb.getBlankDayMap(5)
        const events = [{ date: new Date('2021-01-01 00:10'), endDate: new Date('2021-01-01 00:21'), title: 'event1' }]
        events.push({
          date: new Date('2021-01-01 00:20'),
          endDate: new Date('2021-01-01 00:30'),
          title: 'event2',
        })
        const returnVal = tb.blockOutEvents(events, map, config)
        expect(returnVal[4].busy).toEqual('event2')
        expect(returnVal[6].busy).toEqual(false)
      })
      test('If calendar items have no endDate, they are ignored', () => {
        const map = tb.getBlankDayMap(5)
        const events = [{ date: new Date('2021-01-01 00:20'), title: 'event3' }]
        const returnVal = tb.blockOutEvents(events, map, config)
        expect(returnVal.filter((t) => t.busy === 'event3')).toEqual([])
      })
    })

    test('durationRegEx ', () => {
      expect(tb.durationRegEx('~')).toEqual(
        new RegExp(`\\s*~(([0-9]+\\.?[0-9]*|\\.[0-9]+)h)*(([0-9]+\\.?[0-9]*|\\.[0-9]+)m)*`, 'mg'),
      )
    })

    test('removeDurationParameter ', () => {
      // hours and mins
      expect(tb.removeDurationParameter('this is foo ~2h22m', '~')).toEqual('this is foo')
      // minutes only
      expect(tb.removeDurationParameter('this is foo ~22m', '~')).toEqual('this is foo')
      // multiple splits (after the duration)
      expect(tb.removeDurationParameter('this is foo ~22m (2)', '~')).toEqual('this is foo (2)')
      // multiple splits (before the duration)
      expect(tb.removeDurationParameter('this is foo (2) ~22m', '~')).toEqual('this is foo (2)')
    })

    test('getDurationFromLine ', () => {
      expect(tb.getDurationFromLine('', "'")).toEqual(0)
      expect(tb.getDurationFromLine('no time sig', "'")).toEqual(0)
      expect(tb.getDurationFromLine(" '2m", "'")).toEqual(2)
      expect(tb.getDurationFromLine(" '2h", "'")).toEqual(120)
      expect(tb.getDurationFromLine(" '2.5h", "'")).toEqual(150)
      expect(tb.getDurationFromLine(" '2.5m", "'")).toEqual(3)
      expect(tb.getDurationFromLine(" '2h5m", "'")).toEqual(125)
    })

    test('addDurationToTasks ', () => {
      const res = tb.addDurationToTasks([{ content: `foo '1h4m` }], config)
      expect(res[0].duration).toEqual(64)
    })

    test('removeDateTagsFromArray ', () => {
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

    test('filterTimeMapToOpenSlots ', () => {
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

    test('makeAllItemsTodos ', () => {
      const types = ['open', 'done', 'scheduled', 'cancelled', 'title', 'quote', 'list', 'text']
      const expec = ['open', 'done', 'scheduled', 'cancelled', 'title', 'quote', 'open', 'open']
      const paras = types.map((type) => ({ type, content: `was:${type}` }))
      const res = tb.makeAllItemsTodos(paras)
      res.forEach((item, i) => {
        expect(item.type).toEqual(expec[i])
      })
    })

    test('calculateSlotDifferenceInMins ', () => {
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

    test('makeDateFromTimeString ', () => {
      expect(tb.makeDateFromTimeString('2021-01-01', '00:00').toISOString()).toEqual('2021-01-01T08:00:00.000Z')
      //bad date
      expect(tb.makeDateFromTimeString('foo', '00:00')).toEqual(null)
    })

    test('findTimeBlocks ', () => {
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

    test('getTimeBlockTimesForEvents ', () => {
      const timeMap = [
        // one item and one contiguous block
        { start: '00:00', busy: false, index: 0 },
        { start: '00:15', busy: false, index: 2 },
        { start: '00:20', busy: false, index: 3 },
        { start: '00:25', busy: false, index: 4 },
      ]
      const todos = [
        { content: "!! line1 '8m", type: 'open' },
        { content: "! line2 '1m", type: 'open' },
        { content: "!!! line3 '7m", type: 'open' },
      ]
      const todosByType = getTasksByType(todos)
      const cfg = {
        ...config,
        workDayStart: '00:00',
        workDayEnd: '23:59',
        nowStrOverride: '00:00',
        mode: 'priority-split',
      }
      // returns {blockList, timeBlockTextList, timeMap}
      let res = tb.getTimeBlockTimesForEvents(timeMap, todosByType['open'], cfg)
      expect(res.timeBlockTextList).toEqual([
        '* 00:00-00:05 !!! line3 (1) #🕑',
        '* 00:15-00:17 !!! line3 (2) #🕑',
        '* 00:20-00:28 !! line1 #🕑',
        /* '* 00:20-00:21 ! line2 #🕑', LINE2 DOES NOT HAVE A SLOT */
      ])
      // test with time later in the day
      cfg.nowStrOverride = '00:19'
      const timeMap2 = [
        // one item and one contiguous block
        { start: '00:00', busy: false, index: 0 },
        { start: '00:15', busy: false, index: 2 },
        { start: '00:20', busy: false, index: 3 },
        { start: '00:25', busy: false, index: 4 },
      ]
      res = tb.getTimeBlockTimesForEvents(timeMap2, todosByType['open'], cfg)
      expect(res.timeBlockTextList).toEqual([`* 00:20-00:27 !!! line3 ${config.timeBlockTag}`])
      // test with calling options.mode = 'place-largest-first'
      cfg.nowStrOverride = '00:00'
      cfg.mode = 'place-largest-first'
      res = tb.getTimeBlockTimesForEvents([{ start: '00:00', busy: false, index: 0 }], todosByType['open'], cfg)
      expect(res.timeBlockTextList).toEqual([
        '* 00:00-00:05 !! line1 (1) #🕑',
        /* '* 00:20-00:21 ! line2 #🕑', LINE2 DOES NOT HAVE A SLOT */
      ])
      // test with calling no options.mode (just for coverage of switch statement)
      cfg.mode = ''
      res = tb.getTimeBlockTimesForEvents(timeMap, todosByType['open'], cfg)
      expect(res.timeBlockTextList).toEqual([])
    })

    test('addMinutesToTimeText ', () => {
      expect(tb.addMinutesToTimeText('00:00', 21)).toEqual('00:21')
      expect(tb.addMinutesToTimeText('00:00', 180)).toEqual('03:00')
      expect(tb.addMinutesToTimeText('00:50', 20)).toEqual('01:10')
    })

    test('blockTimeAndCreateTimeBlockText ', () => {
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

    describe('matchTasksToSlotsWithSplits ', () => {
      test('should insert content that fits without splitting ', () => {
        const tasks = [{ content: "line1 '2m" }, { content: "line2 '1m" }]
        const timeMap = [
          { start: '00:02', busy: false, index: 1 },
          { start: '00:04', busy: false, index: 2 },
          { start: '00:06', busy: false, index: 3 },
          /* block[0]: start:00:02 end:00:08 minsAvailable: 6 */
          { start: '00:20', busy: false, index: 10 },
          { start: '00:22', busy: false, index: 11 },
          /* block[1]: start:00:20 end:00:24 minsAvailable: 4 */
        ]
        const timeBlocks = [{ start: '00:02', end: '00:08', minsAvailable: 6 }]
        const cfg = { ...config, nowStrOverride: '00:00', workDayStart: '00:00', intervalMins: 2 }
        // First check that items that fit inside the time block work properly
        const res = tb.matchTasksToSlotsWithSplits(tasks, { blockList: timeBlocks, timeMap }, cfg)
        expect(res.timeBlockTextList[0]).toEqual(`* 00:02-00:04 line1 ${config.timeBlockTag}`)
        expect(res.timeBlockTextList[1]).toEqual(`* 00:04-00:05 line2 ${config.timeBlockTag}`)
        expect(res.blockList[0]).toEqual({ start: '00:06', end: '00:08', minsAvailable: 2 })
        expect(res.blockList[1]).toEqual({ start: '00:20', end: '00:24', minsAvailable: 4 })
        expect(res.timeMap[0]).toEqual({ start: '00:06', busy: false, index: 3 })
        expect(res.timeMap[1]).toEqual({ start: '00:20', busy: false, index: 10 })
        expect(res.timeMap[2]).toEqual({ start: '00:22', busy: false, index: 11 })
      })
      test('items that do not fit in slots get split', () => {
        // Now check that items that don't fit inside the time block get split properly
        // Even if the whole task can't find a slot
        const cfg = { ...config, nowStrOverride: '00:00', workDayStart: '00:00', intervalMins: 2 }
        const timeMap2 = [
          { start: '00:02', busy: false, index: 1 },
          { start: '00:04', busy: false, index: 2 },
          { start: '00:06', busy: false, index: 3 },
          /* block[0]: start:00:02 end:00:08 minsAvailable: 6 */
          { start: '00:20', busy: false, index: 10 },
          { start: '00:22', busy: false, index: 11 },
          /* block[1]: start:00:20 end:00:24 minsAvailable: 4 */
        ]
        const nonFittingTask = [{ content: "line3 '12m" }]
        const timeBlocks = [
          { start: '00:02', end: '00:08', minsAvailable: 6 },
          { start: '00:20', end: '00:24', minsAvailable: 4 },
        ]
        const res = tb.matchTasksToSlotsWithSplits(
          nonFittingTask,
          { blockList: timeBlocks, timeMap: timeMap2, timeBlockTextList: [] },
          cfg,
        )
        expect(res.timeBlockTextList[0]).toEqual(`* 00:02-00:08 line3 (1) ${config.timeBlockTag}`)
        expect(res.timeBlockTextList[1]).toEqual(`* 00:20-00:24 line3 (2) ${config.timeBlockTag}`)
        expect(res.timeBlockTextList.length).toEqual(2)
        expect(res.timeMap.length).toEqual(0)
        expect(res.blockList.length).toEqual(0)
      })
      test('items that do not fit in slots get split', () => {
        // now test line which had no time attached
        const timeBlocks = [{ start: '00:00', end: '00:20', minsAvailable: 20 }]
        const timeMap = [{ start: '00:00', busy: false, index: 1 }]
        const cfg = { ...config, nowStrOverride: '00:00', workDayStart: '00:00', intervalMins: 20, defaultDuration: 13 }
        const res = tb.matchTasksToSlotsWithSplits(
          [{ content: 'line4' }],
          { blockList: timeBlocks, timeMap: timeMap, timeBlockTextList: [] },
          cfg,
        )
        expect(res.timeBlockTextList).toEqual([`* 00:00-00:13 line4 ${config.timeBlockTag}`])
      })
    })
    test('findOptimalTimeForEvent ', () => {
      expect(tb.findOptimalTimeForEvent([], [], config)).toEqual([])
    })
  })

  describe('isTimeBlockLine ', () => {
    test('should return false if no timeblock', () => {
      expect(tb.isTimeBlockLine('01. no timeblock here :')).toEqual(false)
    })
    describe('RE_TIMEBLOCK_TYPE1 ', () => {
      test('should work with single time (no range) and no AM or PM', () => {
        expect(tb.isTimeBlockLine('12:30')).toEqual(true)
      })
      test('should work with range and no AM or PM', () => {
        expect(tb.isTimeBlockLine('12:30-14:45')).toEqual(true)
      })
      test('should work with single digits', () => {
        expect(tb.isTimeBlockLine('1:30')).toEqual(true)
      })
      test('should work with single digits', () => {
        expect(tb.isTimeBlockLine('1:38')).toEqual(true)
      })
      test('should not work with single digit mins', () => {
        expect(tb.isTimeBlockLine('1:8')).toEqual(false)
      })
      test('should work for 12:30AM-2:45pm (duration and caps)', () => {
        expect(tb.isTimeBlockLine('12:30AM-2:45pm')).toEqual(true)
      })
      test('should work for 12:30AM by itself', () => {
        expect(tb.isTimeBlockLine('12:30AM')).toEqual(true)
      })
    })
    describe('RE_TIMEBLOCK_TYPE2 ', () => {
      test('should work with at, like at 2AM', () => {
        expect(tb.isTimeBlockLine('at 4:30AM')).toEqual(true)
      })
      test('should work with just a number, like "at 2"', () => {
        expect(tb.isTimeBlockLine('at 4')).toEqual(true)
      })
      test('should work with just a number and a range, like "at 2-3"', () => {
        expect(tb.isTimeBlockLine('at 2-3')).toEqual(true)
      })
      test('should work with just a number and a range, like "at 2-3pm"', () => {
        expect(tb.isTimeBlockLine('at 2-3pm')).toEqual(true)
      })
    })
    describe('RE_TIMEBLOCK_TYPE3 ', () => {
      test('should work with at and mins on the ending time, like "at 9-11:30"', () => {
        expect(tb.isTimeBlockLine('at 9-11:30')).toEqual(true)
      })
    })
  })
  describe('findLongestStringInArray ', () => {
    test('should return longest string in array', () => {
      expect(tb.findLongestStringInArray(['a', 'bb', 'ccc', 'dddd'])).toEqual('dddd')
    })
    test('should return longest string in array wherever it is in array', () => {
      expect(tb.findLongestStringInArray(['aa', 'bbbbb', 'ccc', 'cc'])).toEqual('bbbbb')
    })
    test('should return empty string if no array', () => {
      expect(tb.findLongestStringInArray([])).toEqual('')
    })
  })
  describe('getTimeBlockString ', () => {
    test('should return null if no timeblock', () => {
      expect(tb.getTimeBlockString('01. no timeblock here :')).toEqual('')
    })
    describe('RE_TIMEBLOCK_TYPE1 ', () => {
      test('should work with single time (no range) and no AM or PM', () => {
        expect(tb.getTimeBlockString('12:30')).toEqual('12:30')
      })
      test('should work with range and no AM or PM', () => {
        expect(tb.getTimeBlockString('12:30-14:45')).toEqual('12:30-14:45')
      })
      test('should work with single digits', () => {
        expect(tb.getTimeBlockString('1:30')).toEqual('1:30')
      })
      test('should work with single digits', () => {
        expect(tb.getTimeBlockString('1:38')).toEqual('1:38')
      })
      test('should not work with single digit mins', () => {
        expect(tb.getTimeBlockString('1:8')).toEqual('')
      })
      test('should work for 12:30AM-2:45pm (duration and caps)', () => {
        expect(tb.getTimeBlockString('12:30AM-2:45pm')).toEqual('12:30AM-2:45pm')
      })
      test('should work for 12:30AM by itself', () => {
        expect(tb.getTimeBlockString('12:30AM')).toEqual('12:30AM')
      })
    })
    describe('RE_TIMEBLOCK_TYPE2 ', () => {
      test('should work with at, like at 4:30AM', () => {
        expect(tb.getTimeBlockString('at 4:30AM')).toEqual('at 4:30AM')
      })
      test('should work with just a number, like "at 2"', () => {
        expect(tb.getTimeBlockString('at 4')).toEqual('at 4')
      })
      test('should work with just a number and a range, like "at 2-3"', () => {
        expect(tb.getTimeBlockString('at 2-3')).toEqual('at 2-3')
      })
      test('should work with just a number and a range, like "at 2-3pm"', () => {
        expect(tb.getTimeBlockString('at 2-3pm')).toEqual('at 2-3pm')
      })
    })
    describe('RE_TIMEBLOCK_TYPE3 ', () => {
      test('should work with at and mins on the ending time, like "at 9-11:30"', () => {
        expect(tb.getTimeBlockString('at 9-11:30')).toEqual('at 9-11:30')
      })
    })
  })
})
