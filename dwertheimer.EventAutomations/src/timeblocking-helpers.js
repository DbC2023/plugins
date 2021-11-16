// @flow

import {
  differenceInCalendarDays,
  endOfDay,
  startOfDay,
  eachMinuteOfInterval,
  formatISO9075,
  addMinutes,
  differenceInMinutes,
  format,
} from 'date-fns'
import { logAllPropertyNames, getAllPropertyNames, JSP } from '../../helpers/dev'
import { fieldSorter, sortListBy } from '../../helpers/sorting'
import {
  toLocaleTime,
  getTodaysDateUnhyphenated,
  dateStringFromCalendarFilename,
  removeDateTags,
  toISODateString,
  todaysDateISOString,
} from '../../helpers/dateTime'
import { timeblockRegex1, timeblockRegex2 } from '../../helpers/markdown-regex'

export type IntervalMap = Array<{ start: string, busy: string | boolean, index: number }>
type OpenBlock = { start: string, end: string, minsAvailable: number, title?: string }
type BlockArray = Array<OpenBlock>
type TimeBlocksWithMap = { timeMap: IntervalMap, blockList?: BlockArray, timeBlockTextList?: Array<string> }
type TimeBlockTextList = Array<string>
type BlockTimeOptions = { mode: string }
type BlockData = { start: string, end: string, title?: string }
export type TimeBlockDefaults = {
  todoChar: string,
  timeBlockTag: string,
  timeBlockHeading: string,
  workDayStart: string,
  workDayEnd: string,
  durationMarker: string,
  intervalMins: number,
  removeDuration: boolean,
  nowStrOverride?: string /* for testing */,
}
/**
 * Create a map of the time intervals for the day
 * @param {*} start
 * @param {*} end
 * @param {*} valueToSet
 * @param {*} options
 * @returns Array of objects with the following properties: [{"start":"00:00","busy":false},{"start":"00:05","busy":false}...]
 */
export function createIntervalMap(
  time: { start: Date, end: Date },
  valueToSet: false | string = false,
  options: { step: number } = { step: 5 },
): IntervalMap {
  const { start, end } = time
  if (options?.step > 0) {
    // $FlowFixMe - incompatible with undefined
    const intervals = eachMinuteOfInterval({ start, end }, options)
    return intervals.map((interval, i) => {
      const start = formatISO9075(interval).slice(0, -3)
      const time = start.split(' ')[1]
      return { start: time, busy: valueToSet, index: i }
    })
  }
  return []
}

export function getBlankDayMap(intervalMins: number): IntervalMap {
  return createIntervalMap({ start: startOfDay(new Date()), end: endOfDay(new Date()) }, false, { step: intervalMins })
}

export function removeDateTagsAndToday(tag: string): string {
  return removeDateTags(tag).replace(/ >today/, '')
}

export function blockTimeFor(
  timeMap: IntervalMap,
  blockdata: BlockData,
  config: TimeBlockDefaults,
): { newMap: IntervalMap, itemText: string } {
  const { start, end, title } = blockdata
  const newMap = timeMap.map((t) => {
    if (t.start >= start && t.start < end) {
      t.busy = title ?? true
    }
    return t
  })
  const itemText = typeof title === 'boolean' ? '' : createTimeBlockLine({ title, start, end }, config)
  return { newMap, itemText }
}

export function attachTimeblockTag(content: string, timeblockTag: string): string {
  const regEx = new RegExp(` ${timeblockTag}`, 'g') //replace the existing tag if it's there
  return `${content.replace(regEx, '')} ${timeblockTag}`
}

export function createTimeBlockLine(blockData: BlockData, config: TimeBlockDefaults): string {
  if (blockData.title && blockData.title.length > 0) {
    //FIXME: what is this newContentLine and whaaaaaaat?
    let newContentLine = blockData.title
    if (config.removeDuration) {
      newContentLine = removeDurationParameter(newContentLine, config.durationMarker)
    }
    newContentLine = attachTimeblockTag(newContentLine, config.timeBlockTag)

    return `${config.todoChar} ${blockData.start}-${blockData.end} ${newContentLine || blockData.title || ''}`
  }
  return ''
}

/**
 * @description This function takes a list of calendar items and returns a list of calendar items that are not all day
 * @param {*} input - array of calendar items
 * @returns arry of calendar items without all day events
 */
export function getTimedEntries(input: Array<TCalendarItem>): Array<TCalendarItem> {
  return input.filter((event) => !event.isAllDay)
}

/**
 * Return the time as a string in the format "HH:MM"
 * @param {*} date
 * @returns {string} - the time string in the format "HH:MM"
 */
export function getTimeStringFromDate(date: Date): string {
  return formatISO9075(date).split(' ')[1].slice(0, -3)
}

export function blockOutEvents(
  events: Array<TCalendarItem>,
  timeMap: IntervalMap,
  config: TimeBlockDefaults,
): IntervalMap {
  let newTimeMap = [...timeMap]
  events.forEach((event) => {
    const start = getTimeStringFromDate(event.date)
    const end = event.endDate ? getTimeStringFromDate(event.endDate) : ''
    const obj = event.endDate
      ? blockTimeFor(newTimeMap, { start, end, title: event.title }, config)
      : { newMap: newTimeMap }
    newTimeMap = obj.newMap
  })
  return newTimeMap
}

// $FlowIgnore - can't find a Flow type for RegExp
export const durationRegEx = (durationMarker: string) =>
  new RegExp(`\\s*${durationMarker}(([0-9]+\\.?[0-9]*|\\.[0-9]+)h)*(([0-9]+\\.?[0-9]*|\\.[0-9]+)m)*`, 'mg')

export const removeDurationParameter = (text: string, durationMarker: string): string =>
  text.replace(durationRegEx(durationMarker), '').trim()

/**
 * @description Scans a line for a delimiter and a time signature, e.g. '2h5m or '2.5h
 * @param {*} line - input line
 * @returns { Int } number of minutes in duration (or zero)
 */
export function getDurationFromLine(line: string, durationMarker: string): number {
  const regex = durationRegEx(durationMarker)
  const match = regex.exec(line)
  let mins = 0
  const duration = match ? match[0] : 0
  if (match) {
    const hours = match[2] ? Number(match[2]) : 0
    const minutes = match[4] ? Number(match[4]) : 0
    mins = Math.ceil(hours * 60 + minutes)
  }
  return mins
}

/**
 * @description Remove >date and >today tags from a paragraphs array and return only the most important parts
 * @param {*} paragraphsArray
 * @returns
 */
export function removeDateTagsFromArray(paragraphsArray: Array<TParagraph>): Array<TParagraph> {
  return paragraphsArray.map((p) => {
    return {
      ...p,
      indents: p.indents,
      type: p.type,
      content: removeDateTagsAndToday(p.content),
      rawContent: removeDateTagsAndToday(p.rawContent),
    }
  })
}

/**
 * @description Get the day map with only the slots that are open
 * @param {*} timeMap
 * @param {*} nowStr
 * @param {*} workDayStart
 * @param {*} workDayEnd
 * @returns
 */
export function filterTimeMapToOpenSlots(timeMap: IntervalMap, config: TimeBlockDefaults): IntervalMap {
  const nowStr = config.nowStrOverride ?? getTimeStringFromDate(new Date())
  return timeMap.filter((t) => {
    // console.log(t.start >= nowStr, t.start >= config.workDayStart, t.start < config.workDayEnd, !t.busy)
    return t.start >= nowStr && t.start >= config.workDayStart && t.start < config.workDayEnd && !t.busy
  })
}

/**
 * Take in an HH:MM time string and return a Date object for that time
 * Used for comparing times in a day
 * @param {string} dateString - in form "YYYY-MM-DD"
 * @param {string} timeString - in form "HH:MM" e.g. "08:20"
 * @returns
 */
export const makeDateFromTimeString = (dateString: string, timeString: string): Date => {
  return new Date(`${dateString} ${timeString}:00`)
}

export function calculateSlotDifferenceInMins(
  block: BlockData,
  config: TimeBlockDefaults,
  includeLastSlotTime: boolean = true,
): OpenBlock {
  const startTime = makeDateFromTimeString('2021-01-01', block.start)
  let endTime = makeDateFromTimeString('2021-01-01', block.end)
  endTime = includeLastSlotTime ? addMinutes(endTime, config.intervalMins) : endTime
  return {
    start: getTimeStringFromDate(startTime),
    end: getTimeStringFromDate(endTime),
    minsAvailable: differenceInMinutes(endTime, startTime),
  }
}

/**
 * Given an array of open timeslots from a day's IntervalMap, sends back
 * an array of the contiguous slots (assumes busy/unavailable slots have been
 * eliminated before calling this function (eg using filterTimeMapToOpenSlots()).
 * @param {IntervalMap} timeMap
 * @param {number} intervalMins
 * @returns array of OpenBlock objects
 */
export function findTimeBlocks(timeMap: IntervalMap, config: TimeBlockDefaults): BlockArray {
  const blocks: Array<OpenBlock> = []
  if (timeMap.length) {
    let lastSlot = timeMap[0]
    let blockStart = timeMap[0]
    for (let i = 1; i < timeMap.length; i++) {
      const slot = timeMap[i]
      if (slot.index === lastSlot.index + 1 && i <= timeMap.length - 1) {
        lastSlot = slot
        continue
      } else {
        // there was a break in continuity
        blocks.push(calculateSlotDifferenceInMins({ start: blockStart.start, end: lastSlot.start }, config, true))
        blockStart = slot
        lastSlot = slot
      }
    }
    if (timeMap.length && lastSlot === timeMap[timeMap.length - 1]) {
      // pick up the last straggler edge case
      blocks.push(calculateSlotDifferenceInMins({ start: blockStart.start, end: lastSlot.start }, config, true))
    }
  }
  return blocks
}

export function addMinutesToTimeText(startTimeText: string, minutesToAdd: number): string {
  const startTime = makeDateFromTimeString('2021-01-01', startTimeText)
  return getTimeStringFromDate(addMinutes(startTime, minutesToAdd))
}

export function findOptimalTimeForEvent(timeMap: IntervalMap, todo: { [string]: [mixed] }, config: TimeBlockDefaults) {
  const newMap = timeMap.map((t) => {})
  // FIXME: HERE
}

/**
 * Blocks time for the block specified and returns a new IntervalMap, new BlockList, and new TextList of time blocks
 * @param {*} tbm
 * @param {*} block
 * @param {*} config
 * @returns TimeBlocksWithMap
 */
export function blockTimeAndCreateTimeBlockText(
  tbm: TimeBlocksWithMap,
  block: BlockData,
  config: TimeBlockDefaults,
): TimeBlocksWithMap {
  const timeBlockTextList = tbm.timeBlockTextList || []
  const obj = blockTimeFor(tbm.timeMap, block, config) //returns newMap, itemText
  timeBlockTextList.push(obj.itemText)
  const timeMap = filterTimeMapToOpenSlots(obj.newMap, config)
  const blockList = findTimeBlocks(timeMap, config)
  return { timeMap, blockList, timeBlockTextList }
}

export function matchTasksToSlotsWithSplits(
  sortedTaskList: Array<TParagraph>,
  tmb: TimeBlocksWithMap,
  config: TimeBlockDefaults,
): TimeBlocksWithMap {
  let { timeMap: newMap, blockList: newBlockList } = tmb
  const { durationMarker } = config
  let timeBlockTextList = []
  sortedTaskList.forEach((task) => {
    if (newBlockList && newBlockList.length) {
      const taskDuration = getDurationFromLine(task.content, durationMarker) || 15 // default time is 15m
      const taskTitle = removeDateTagsAndToday(task.content)
      let scheduling = true
      let schedulingCount = 0
      let scheduledMins = 0
      // $FlowIgnore - flow doesn't like .length below but it is safe
      for (let i = 0; i < newBlockList.length && scheduling; i++) {
        if (newBlockList && newBlockList[i]) {
          let block = newBlockList[i]
          const blockDuration = block.minsAvailable
          let endTime = ''
          while (scheduling && scheduledMins < taskDuration) {
            if (taskDuration <= blockDuration) {
              endTime = addMinutesToTimeText(block.start, taskDuration)
              scheduling = false
            } else {
              const minsToUse = Math.min(block.minsAvailable, taskDuration - scheduledMins)
              endTime = addMinutesToTimeText(block.start, minsToUse)
              schedulingCount++
              scheduledMins += minsToUse
            }
            const blockData = {
              start: block.start,
              end: endTime,
              title: `${taskTitle}${schedulingCount ? ` (${schedulingCount})` : ''}`,
            }
            const newTimeBlockWithMap = blockTimeAndCreateTimeBlockText(
              { timeMap: newMap, blockList: newBlockList, timeBlockTextList },
              blockData,
              config,
            )
            // Re-assign newMap, newBlockList, and timeBlockTextList for next run
            ;({ timeMap: newMap, blockList: newBlockList, timeBlockTextList } = newTimeBlockWithMap)
            if (newBlockList && newBlockList.length) {
              block = newBlockList[0]
            } else {
              break
            }
            if (!scheduling) break
          }
        }
      }
    }
  })
  return { timeMap: newMap, blockList: newBlockList, timeBlockTextList }
}

export function getTimeBlockTimesForEvents(
  timeMap: IntervalMap,
  todos: Array<TParagraph>,
  config: TimeBlockDefaults,
  options: BlockTimeOptions = { mode: 'priority-split' },
): TimeBlocksWithMap {
  let newInfo = { timeMap, blockList: [], timeBlockTextList: [] }
  const blocksAvailable = findTimeBlocks(timeMap, config)
  if (blocksAvailable?.length && options.mode) {
    switch (options.mode) {
      case 'priority-split': {
        // Go down priority list and split events if necessary
        const sortedTaskList = sortListBy(todos, [('-priority', 'duration')])
        newInfo = matchTasksToSlotsWithSplits(sortedTaskList, { blockList: blocksAvailable, timeMap }, config)
        // const { timeBlockTextList, timeMap, blockList } = newInfo

        break
      }
      case 'place-largest-first': {
        const sortedTaskList = sortListBy(todos, [('-duration', '-priority')])
        const sortedBlockList = sortListBy(blocksAvailable, ['-minsAvailable'])
        break
      }
      default: {
        break
      }
    }
  }
  return newInfo
}

// These Regexs are used by the app, but don't work in JS
// export function isTimeBlockLine(contentString: string): boolean {
//   const regex1Test = new RegExp(timeblockRegex1, 'mg').exec(contentString)
//   const regex2Test = new RegExp(timeblockRegex2, 'mg').exec(contentString)
//   return regex1Test || (regex1Test && regex2Test)
// }
