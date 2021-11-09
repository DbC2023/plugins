// @flow

import { differenceInCalendarDays, endOfDay, startOfDay, eachMinuteOfInterval, formatISO9075, format } from 'date-fns'
import { logAllPropertyNames, getAllPropertyNames, JSP } from '../../helpers/dev'
import {
  toLocaleTime,
  getTodaysDateUnhyphenated,
  dateStringFromCalendarFilename,
  removeDateTags,
  toISODateString,
  todaysDateISOString,
} from '../../helpers/dateTime'

type IntervalMap = Array<{ start: string, busy: string | boolean }>

/**
 * Create a map of the time intervals for the day
 * @param {*} start
 * @param {*} end
 * @param {*} valueToSet
 * @param {*} options
 * @returns Array of objects with the following properties: [{"start":"00:00","busy":false},{"start":"00:05","busy":false}...]
 */
export function createIntervalMap(
  start: Date,
  end: Date,
  valueToSet: false | string = false,
  options: { step: number } = { step: 5 },
): IntervalMap {
  if (options?.step > 0) {
    // $FlowFixMe - incompatible with undefined
    const intervals = eachMinuteOfInterval({ start, end }, options)
    return intervals.map((interval) => {
      const start = formatISO9075(interval).slice(0, -3)
      const time = start.split(' ')[1]
      return { start: time, busy: valueToSet }
    })
    // .slice(0, -1)
  }
  return []
}

export function getBlankDayMap(): IntervalMap {
  return createIntervalMap(startOfDay(new Date()), endOfDay(new Date()))
}

export function removeDateTagsAndToday(tag: string): string {
  return removeDateTags(tag).replace(/ >today/, '')
}

export function blockTimeFor(
  timeMap: IntervalMap,
  startString: string,
  endString: string,
  itemName: boolean | string = true,
): IntervalMap {
  const newMap = timeMap.map((t) => {
    if (t.start >= startString && t.start < endString) {
      t.busy = itemName
    }
    return t
  })
  return newMap
}

export function attachTimeblockTag(content: string, timeblockTag: string): string {
  const regEx = new RegExp(` ${timeblockTag}`, 'g') //replace the existing tag if it's there
  return `${content.replace(regEx, '')} ${timeblockTag}`
}

export function createTimeBlockLine(
  content: string,
  start: string,
  end: string,
  taskChar: string = '*',
  timeBlockTag: string = '#TimeBlock',
): string {
  const newContentLine = attachTimeblockTag(content, timeBlockTag)
  return `${taskChar} ${start}-${end} ${newContentLine}`
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

export function blockOutEvents(events: Array<TCalendarItem>, timeMap: IntervalMap): IntervalMap {
  let newTimeMap = [...timeMap]
  events.forEach((event) => {
    const start = getTimeStringFromDate(event.date)
    const end = event.endDate ? getTimeStringFromDate(event.endDate) : ''
    newTimeMap = event.endDate ? blockTimeFor(newTimeMap, start, end, event.title) : newTimeMap
  })
  return newTimeMap
}

/**
 * @description Scans a line for a delimiter and a time signature, e.g. '2h5m or '2.5h
 * @param {*} line - input line
 * @returns { Int } number of minutes in duration (or zero)
 */
export function getDurationFromLine(line: string, durationMarker: string): number {
  const regex = new RegExp(`${durationMarker}(([0-9]+\\.?[0-9]*|\\.[0-9]+)h)*(([0-9]+\\.?[0-9]*|\\.[0-9]+)m)*`, 'mg')
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
