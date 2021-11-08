// @flow

/**
 * WHERE AM I?
 * The events are all loading. Need to now create a map of the events and look for empties
 */
import { differenceInCalendarDays, endOfDay, startOfDay, eachMinuteOfInterval, formatISO9075 } from 'date-fns'
import { getEventsForDay, type HourMinObj, listDaysEvents } from '../../jgclark.EventHelpers/src/eventsToNotes'
import { toLocaleTime, getTodaysDateUnhyphenated, dateStringFromCalendarFilename } from '../../helpers/dateTime'
import { showMessage } from '../../helpers/userInput'
import { logAllPropertyNames, getAllPropertyNames, JSP } from '../../helpers/dev'

/* TCalendarItem is a type for the calendar items:
    title: string,
    date: Date,
    endDate: Date | void,
    type: CalenderItemType,
    isAllDay?: boolean,
    calendar?: string,
    isCompleted ?: boolean,
    notes ?: string,
    url?: string
  ): TCalendarItem,
*/

// This is just for debug
function logEventDetails(input) {
  input.forEach((event) => {
    const isSameDay = differenceInCalendarDays(event.date, event.endDate) === 0
    console.log(`JSP:\n${JSP(event, 2)}`)
    console.log(
      `${event.title} isAllDay:${event.isAllDay} date:${event.date} endDate:${event.endDate} isSameDay=${isSameDay} ${event.availability}`,
    )
  })
}

/**
 *
 * @param {*} start
 * @param {*} end
 * @param {*} valueToSet
 * @param {*} options
 * @returns Array of objects with the following properties: [{"start":"2021-11-06 00:00","value":null},{"start":"2021-11-06 00:05","value":null},
 */
function createIntervalMap(start, end, valueToSet = null, options = { step: 5 }) {
  const intervals = eachMinuteOfInterval({ start, end }, options)
  return intervals.map((interval) => ({ start: formatISO9075(interval).slice(0, -3), value: valueToSet }))
}

function getBlankDayMap() {
  return createIntervalMap(startOfDay(new Date()), endOfDay(new Date()))
}

/**
 * @description This function takes a list of calendar items and returns a list of calendar items that are not all day
 * @param {*} input - array of calendar items
 * @returns arry of calendar items without all day events
 */
function getTimedEntries(input): Array<TCalendarItem> {
  return input.filter((event) => !event.isAllDay)
}

function keepTodayPortionOnly(input): Array<TCalendarItem> {
  return input.map((event) => {
    const diff = differenceInCalendarDays(event.date, event.endDate)
    if (diff === 0) {
      return event
    } else {
      // end date for our purposes is the end of the starting day
      const eventCopy = { title: event.title, date: event.date, endDate: event.endDate, isAllDay: event.isAllDay } // event is immutable
      const today = new Date()
      const todayWasStart = differenceInCalendarDays(event.date, today) === 0
      const todayWasEnd = differenceInCalendarDays(event.endDate, today) === 0
      //   console.log(`${event.title} todayWasStart:${todayWasStart} todayWasEnd:${todayWasEnd} start:${event.date}`)
      // TODO: confirm edge cases of this
      if (todayWasStart) {
        eventCopy.endDate = endOfDay(event.date)
      }
      if (todayWasEnd) {
        eventCopy.date = startOfDay(event.endDate)
      }
      if (!todayWasStart && !todayWasEnd) {
        eventCopy.date = startOfDay(today)
        eventCopy.endDate = endOfDay(today)
      }
      return eventCopy
    }
  })
}

function getTodaysTodos(pNote: TNote | null = null): Array<TParagraph> {
  const note = pNote || Editor.note
  const backlinks = [...note.backlinks] // an array of notes which link to this note
  backlinks.forEach((link, i) => console.log(JSP(link, 2)))
  console.log(`${JSON.stringify(backlinks)}`)
  return backlinks
}

export async function insertTodosAsTimeblocks(useQuickTemplate: boolean = true): Promise<void> {
  const date = getTodaysDateUnhyphenated()
  const dateStr = dateStringFromCalendarFilename(Editor.filename)
  if (Editor.filename && dateStr === date) {
    const todayEvents = await Calendar.eventsToday()
    let eArr: Array<TCalendarItem> = await getEventsForDay(dateStr)
    logEventDetails(eArr)
    eArr = getTimedEntries(eArr)
    eArr = keepTodayPortionOnly(eArr)
    const blankDayMap = getBlankDayMap()
    getTodaysTodos()
    // console.log(JSON.stringify(blankDayMap))
    // FIXME: I am here. Have an empty map of the day.
    // blankDayMap = [{"start":"2021-11-06 00:00","value":null},{"start":"2021-11-06 00:05","value":null},
    // Now need to filter the map to remove time before now
    // console.log(`insertTodosAsTimeblocks Events:\n${JSON.stringify(logEventDetails(eArr))}\n`)
  } else {
    showMessage(`You need to be in Today's Calendar Note to use this function`)
  }
}
