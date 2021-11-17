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
import { getTasksByType } from '../../dwertheimer.TaskAutomations/src/taskHelpers'
import { sortListBy } from '../../helpers/sorting'
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
  removeDateTagsFromArray,
  getTimeBlockTimesForEvents,
  type IntervalMap,
  type getTimeBlockingDefaults,
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

export function getTimeBlockingDefaults(): TimeBlockDefaults {
  const def = {
    todoChar: '*',
    timeBlockTag: `#🕑`,
    timeBlockHeading: 'Time Blocks',
    workDayStart: '08:00',
    workDayEnd: '18:00',
    durationMarker: "'",
    intervalMins: 5,
    removeDuration: true,
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

async function eraseTimeblocksWithTBTag(destNote: TNote, timeBlockTag) {
  const destNoteParas = destNote.paragraphs
  const parasToDelete = []
  for (let i = 0; i < destNoteParas.length; i++) {
    const p = destNoteParas[i]
    if (new RegExp(timeBlockTag, 'g').test(p.content)) {
      parasToDelete.push(p[i])
    }
  }
  // console.log(`parasToDelete:${parasToDelete.length}`)
  if (parasToDelete.length > 0) {
    // console.log(JSP(parasToDelete, 2))
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
function getTodaysTodoParagraphs(pNote: TNote | null = null): Array<TParagraph> {
  const note = pNote || Editor.note
  if (note) {
    const backlinks = [...(note.backlinks || {})] // an array of notes which link to this note

    const todayParas = []
    backlinks.forEach((link, i) => {
      // $FlowIgnore
      const subItems = link.subItems
      subItems.forEach((subItem, j) => {
        todayParas.push(subItem)
      })
    })
    // console.log(`LinkedItems: ${JSP(todayParas, null)}`)
    return todayParas
  } else {
    console.log(`timeblocking could not open Note`)
    return []
  }
}

function insertItemsIntoNote(sortedTodos, taskChar, timeBlockTag) {
  sortedTodos.forEach((todo) => {
    const line = createTimeBlockLine(todo.content, '08:00', '10:00', taskChar, timeBlockTag)
    if (Editor.note) {
      insertContentUnderHeading(Editor.note, 'Time Blocks', line)
    } else {
      console.log(`insertItemsIntoNote: There was no Editor note`)
    }
  })
}

async function getPopulatedTimeMapForToday(dateStr: string, intervalMins: number): Promise<IntervalMap> {
  // const todayEvents = await Calendar.eventsToday()
  const eventsArray: Array<TCalendarItem> = await getEventsForDay(dateStr)
  const eventsWithStartAndEnd = getTimedEntries(eventsArray)
  const eventsScheduledForToday = keepTodayPortionOnly(eventsWithStartAndEnd)
  const blankDayMap = getBlankDayMap(parseInt(intervalMins))
  const eventMap = blockOutEvents(eventsScheduledForToday, blankDayMap)
  return eventMap
}

export async function insertTodosAsTimeblocks(useQuickTemplate: boolean = true): Promise<void> {
  const date = getTodaysDateUnhyphenated()
  const dateStr = Editor.filename ? dateStringFromCalendarFilename(Editor.filename) : null
  const { timeBlockTag, todoChar, workDayStart, workDayEnd, timeBlockHeading, durationMarker, intervalMins } =
    getTimeBlockingDefaults()
  if (Editor.filename && dateStr && dateStr === date) {
    const todosParagraphs = getTodaysTodoParagraphs()
    const cleanTodayTodoParas = removeDateTagsFromArray(todosParagraphs)
    const tasksByType = cleanTodayTodoParas.length ? getTasksByType(cleanTodayTodoParas) : null // puts in object by type of task and enriches with sort info (like priority)
    if (tasksByType && tasksByType['open'].length) {
      const sortedTodos = tasksByType.length ? sortListBy(tasksByType['open'], '-priority') : []
      const nowTimeString = getTimeStringFromDate(new Date())
      const calendarMapWithEvents = await getPopulatedTimeMapForToday(dateStr, intervalMins)
      const eventsToTimeblock = getTimeBlockTimesForEvents(
        calendarMapWithEvents,
        sortedTodos,
        nowTimeString,
        workDayStart,
        workDayEnd,
      )
      if (Editor.note) eraseTimeblocksWithTBTag(Editor.note, timeBlockTag)
      insertItemsIntoNote(sortedTodos)
    }
  } else {
    showMessage(`You need to be in Today's Calendar Note to use this function`)
  }
}
