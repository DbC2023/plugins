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
import {
  createIntervalMap,
  getBlankDayMap,
  blockTimeFor,
  removeDateTagsAndToday,
  attachTimeblockTag,
  createTimeBlockLine,
  getTimedEntries,
  getTimeStringFromDate,
  blockOutEvents,
} from './timeblocking-helpers'

/* TCalendarItem is a type for the calendar items:
    title: string,
    date: Date,
    endDate: Date | void,
    type: CalenderItemType,
    isAllDay?: boolean,
    calendar?: string,
    isCompleted ?: boolean,
    notes ?: string,
    url?: string,
    availability?: AvailabilityType 0=busy; 1=free; 2=tentative; 3=unavailable 
    // NOTE: MIN NP VERSION NEEDS TO BE 3.3 TO USE AVAILABILITY
  ): TCalendarItem, 
*/

function getTimeBlockingDefaults() {
  const def = {
    todoChar: '*',
    timeBlockTag: `#🕑`,
    timeBlockHeading: 'Time Blocks',
    workDayStart: '08:00',
    workDayEnd: '18:00',
    durationMarker: "'",
  }
  return def
}

// This is just for debug
function logEventDetails(input) {
  input.forEach((event) => {
    const isSameDay = !event.endDate ? true : differenceInCalendarDays(event.date, event.endDate) === 0
    // console.log(`JSP:\n${JSP(event, 2)}`)
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
  const parasToDelete = []
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

function keepTodayPortionOnly(input): Array<TCalendarItem> {
  return input.map((event) => {
    const diff = !event.endDate ? 0 : differenceInCalendarDays(event.date, event.endDate)
    if (diff === 0) {
      return event
    } else {
      // end date for our purposes is the end of the starting day
      const eventCopy = { title: event.title, date: event.date, endDate: event.endDate, isAllDay: event.isAllDay } // event is immutable
      const today = new Date()
      const todayWasStart = differenceInCalendarDays(event.date, today) === 0
      const todayWasEnd = !event.endDate ? true : differenceInCalendarDays(event.endDate, today) === 0
      //   console.log(`${event.title} todayWasStart:${todayWasStart} todayWasEnd:${todayWasEnd} start:${event.date}`)
      // TODO: confirm edge cases of this
      if (todayWasStart) {
        eventCopy.endDate = endOfDay(event.date)
      }
      if (todayWasEnd) {
        eventCopy.date = startOfDay(event.endDate || event.date)
      }
      if (!todayWasStart && !todayWasEnd) {
        eventCopy.date = startOfDay(today)
        eventCopy.endDate = endOfDay(today)
      }
      // $FlowFixMe
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
  if (note) {
    const backlinks = [...(note.backlinks || {})] // an array of notes which link to this note

    const linkedItemsContent = []
    backlinks.forEach((link, i) => {
      const subItems = link.subItems
      subItems.forEach((subItem, j) => {
        linkedItemsContent.push(removeDateTagsAndToday(subItem.content))
      })
    })
    console.log(`LinkedItems: ${JSP(linkedItemsContent, null)}`)
    return linkedItemsContent
  } else {
    console.log(`timeblocking could not open Note`)
    return []
  }
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
    const eventMap = blockOutEvents(eArr, blankDayMap)
    todos.forEach((todo) => {
      const line = createTimeBlockLine(
        todo,
        '08:00',
        '10:00',
        getTimeBlockingDefaults().timeBlockTag,
        getTimeBlockingDefaults().timeBlockTag,
      )
      insertContentUnderHeading(Editor.note, 'Time Blocks', line)
    })
    const nowTimeString = getTimeStringFromDate(new Date())

    // console.log(JSON.stringify(blankDayMap))
    // FIXME: I am here. Have an empty map of the day.
    // blankDayMap = [{"start":"2021-11-06 00:00","value":null},{"start":"2021-11-06 00:05","value":null},
    // Now need to filter the map to remove time before now
    // console.log(`insertTodosAsTimeblocks Events:\n${JSON.stringify(logEventDetails(eArr))}\n`)
  } else {
    showMessage(`You need to be in Today's Calendar Note to use this function`)
  }
}
