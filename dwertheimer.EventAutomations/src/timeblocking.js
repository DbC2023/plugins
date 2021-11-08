// @flow

/**
 * WHERE AM I?
 * The events are all loading. Need to now create a map of the events and look for empties
 * have the insertion ready to go but need to know times to insert
 */
import { differenceInCalendarDays, endOfDay, startOfDay, eachMinuteOfInterval, formatISO9075 } from 'date-fns'
import { getEventsForDay, type HourMinObj, listDaysEvents } from '../../jgclark.EventHelpers/src/eventsToNotes'
import {
  toLocaleTime,
  getTodaysDateUnhyphenated,
  dateStringFromCalendarFilename,
  removeDateTags,
  toISODateString,
  todaysDateISOString,
} from '../../helpers/dateTime'
import { showMessage } from '../../helpers/userInput'
import { calcSmartPrependPoint } from '../../helpers/paragraph'
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

function getTimeBlockingDefaults() {
  let def = {
    todoChar: '*',
    timeBlockTag: `#🕑`,
    timeBlockHeading: 'Time Blocks',
    workDayStart: '08:00',
    workDayEnd: '18:00',
  }
  return def
}

// This is just for debug
function logEventDetails(input) {
  input.forEach((event) => {
    const isSameDay = differenceInCalendarDays(event.date, event.endDate) === 0
    // console.log(`JSP:\n${JSP(event, 2)}`)
  })
}

/**
 * Create a map of the time intervals for the day
 * @param {*} start
 * @param {*} end
 * @param {*} valueToSet
 * @param {*} options
 * @returns Array of objects with the following properties: [{"start":"00:00","busy":false},{"start":"00:05","busy":false}...]
 */
function createIntervalMap(start, end, valueToSet = false, options = { step: 5 }) {
  const intervals = eachMinuteOfInterval({ start, end }, options)
  return intervals.map((interval) => {
    const start = formatISO9075(interval).slice(0, -3)
    const time = start.split(' ')[1]
    return { start: time, busy: valueToSet }
  })
}

function getBlankDayMap() {
  return createIntervalMap(startOfDay(new Date()), endOfDay(new Date()))
}

function blockTimeFor(timeMap, start, end, itemName = true) {
  return timeMap.map((t) => {
    if (t.start >= start && t.start <= end) {
      t.busy = itemName
    }
    return t
  })
}

async function insertContentUnderHeading(destNote: TNote, headingToFind: string, parasAsText: string) {
  const destNoteParas = destNote.paragraphs
  let insertionIndex = 1 // top of note by default
  //   console.log(`insertionIndex:${insertionIndex}`)
  for (let i = 0; i < destNoteParas.length; i++) {
    const p = destNoteParas[i]
    if (p.content.trim() === headingToFind && p.type === 'title') {
      insertionIndex = i + 1
      break
    }
  }
  //   console.log(`  Inserting at index ${insertionIndex}`)
  await destNote.insertParagraph(parasAsText, insertionIndex, 'empty')
}

async function eraseAllTimeblocks(destNote: TNote) {
  const timeBlockTag = getTimeBlockingDefaults().timeBlockTag
  const destNoteParas = destNote.paragraphs
  let parasToDelete = []
  for (let i = 0; i < destNoteParas.length; i++) {
    const p = destNoteParas[i]
    if (new RegExp(timeBlockTag, 'g').test(p.content)) {
      parasToDelete.push(p[i])
    }
  }
  console.log(`parasToDelete:${parasToDelete.length}`)
  if (parasToDelete.length > 0) {
    console.log(JSP(parasToDelete, 2))
    // destNote.removeParagraphs(parasToDelete) //This line crashes the app
  }
}

function removeDateTagsAndToday(tag: string): string {
  const t = removeDateTags(tag)
  return t.replace(/>today/, '')
}

function attachTimeblockTag(content: string): string {
  const timeblockTag = getTimeBlockingDefaults().timeBlockTag
  const regEx = new RegExp(timeblockTag, 'g')
  return content.replace(regEx, '') + timeblockTag
}

function createTimeBlockLine(content: string, start: string, end: string): string {
  const taskChar = getTimeBlockingDefaults().todoChar
  const newContentLine = attachTimeblockTag(content)
  return `${taskChar} ${start}-${end} ${newContentLine}`
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

/**
 * Get linked items from the references section (.backlinks)
 * @param { note | null} pNote
 * @returns
 * Backlinks format: {"type":"note","content":"_Testing scheduled sweeping","rawContent":"_Testing scheduled sweeping","prefix":"","lineIndex":0,"heading":"","headingLevel":0,"isRecurring":0,"indents":0,"filename":"zDELETEME/Test scheduled.md","noteType":"Notes","linkedNoteTitles":[],"subItems":[{},{},{},{}]}
 * backlinks[0].subItems[0] =JSLog: {"type":"open","content":"scheduled for 10/4 using app >today","rawContent":"* scheduled for 10/4 using app >today","prefix":"* ","contentRange":{},"lineIndex":2,"date":"2021-11-07T07:00:00.000Z","heading":"_Testing scheduled sweeping","headingRange":{},"headingLevel":1,"isRecurring":0,"indents":0,"filename":"zDELETEME/Test scheduled.md","noteType":"Notes","linkedNoteTitles":[],"subItems":[]}
 */
function getTodaysTodos(pNote: TNote | null = null): Array<TParagraph> {
  const note = pNote || Editor.note
  const backlinks = [...note.backlinks] // an array of notes which link to this note

  const linkedItemsContent = []
  backlinks.forEach((link, i) => {
    const subItems = link.subItems
    subItems.forEach((subItem, j) => {
      linkedItemsContent.push(removeDateTagsAndToday(subItem.content))
    })
  })
  console.log(`LinkedItems: ${JSP(linkedItemsContent, null)}`)

  return linkedItemsContent
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
    console.log(`blankDayMap: ${JSP(blankDayMap, null)}`)
    const todos = getTodaysTodos()
    eraseAllTimeblocks(Editor.note)
    // testing
    todos.forEach((todo) => {
      const line = createTimeBlockLine(todo, '08:00', '10:00')
      insertContentUnderHeading(Editor.note, 'Time Blocks', line)
    })

    // console.log(JSON.stringify(blankDayMap))
    // FIXME: I am here. Have an empty map of the day.
    // blankDayMap = [{"start":"2021-11-06 00:00","value":null},{"start":"2021-11-06 00:05","value":null},
    // Now need to filter the map to remove time before now
    // console.log(`insertTodosAsTimeblocks Events:\n${JSON.stringify(logEventDetails(eArr))}\n`)
  } else {
    showMessage(`You need to be in Today's Calendar Note to use this function`)
  }
}
