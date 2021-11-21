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
  makeAllItemsTodos,
  type IntervalMap,
  type TimeBlockDefaults,
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
    intervalMins: 15 /* minimum block size */,
    removeDuration: true,
    defaultDuration: 15,
    mode: 'priority-split',
  }
  return def
}

const editorOrNote = (note) => (Editor.filename === note?.filename || !note ? Editor : note)

// This is just for debug
function logEventDetails(input) {
  input.forEach((event) => {
    const isSameDay = !event.endDate ? true : differenceInCalendarDays(event.date, event.endDate) === 0
    // console.log(`JSP:\n${JSP(event, 2)}`)
  })
}

async function insertContentUnderHeading(destNote: TNote, headingToFind: string, parasAsText: string) {
  let insertionIndex = 1 // top of note by default
  //   console.log(`insertionIndex:${insertionIndex}`)
  for (let i = 0; i < destNote.paragraphs.length; i++) {
    const p = destNote.paragraphs[i]
    if (p.content.trim() === headingToFind && p.type === 'title') {
      insertionIndex = i + 1
      break
    }
  }
  // console.log(
  //   `NPTimeblocking::insertContentUnderHeading: Inserting at index ${insertionIndex} this content:\n${parasAsText}`,
  // )
  // const where = Editor.filename === destNote.filename ? Editor : destNote
  await editorOrNote(destNote).insertParagraph(parasAsText, insertionIndex, 'text')
}

export async function deleteParagraphsContainingString(destNote: TNote, timeBlockTag) {
  const destNoteParas = destNote.paragraphs
  const parasToDelete = []
  for (let i = 0; i < destNoteParas.length; i++) {
    const p = destNoteParas[i]
    if (new RegExp(timeBlockTag, 'gm').test(p.content)) {
      parasToDelete.push(p)
    }
  }
  // console.log(`parasToDelete:${parasToDelete.length}`)
  if (parasToDelete.length > 0) {
    // console.log(JSP(parasToDelete, 2))
    destNote.removeParagraphs(parasToDelete) //This line crashes the app
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
function getTodaysReferences(pNote: TNote | null = null): Array<TParagraph> {
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

async function insertItemsIntoNote(note, list, config) {
  const { timeBlockHeading } = config
  if (list && list.length > 0 && note) {
    // $FlowIgnore
    await insertContentUnderHeading(note, timeBlockHeading, list.join('\n'))
  } else {
    await showMessage('No >today items to schedule')
  }
}

async function getPopulatedTimeMapForToday(
  dateStr: string,
  intervalMins: number,
  config: TimeBlockDefaults,
): Promise<IntervalMap> {
  // const todayEvents = await Calendar.eventsToday()
  const eventsArray: Array<TCalendarItem> = await getEventsForDay(dateStr)
  const eventsWithStartAndEnd = getTimedEntries(eventsArray)
  const eventsScheduledForToday = keepTodayPortionOnly(eventsWithStartAndEnd)
  const blankDayMap = getBlankDayMap(parseInt(intervalMins))
  const eventMap = blockOutEvents(eventsScheduledForToday, blankDayMap, config)
  return eventMap
}

export async function insertTodosAsTimeblocks(note: TNote = null, useQuickTemplate: boolean = true): Promise<void> {
  const config = getTimeBlockingDefaults()
  const date = getTodaysDateUnhyphenated()
  const dateStr = Editor.filename ? dateStringFromCalendarFilename(Editor.filename) : null
  const { timeBlockTag, intervalMins } = config
  if (dateStr && dateStr === date) {
    const backlinkParas = getTodaysReferences()
    const todosParagraphs = makeAllItemsTodos(backlinkParas) //some items may not be todos but we want to pretend they are and timeblock for them
    const cleanTodayTodoParas = removeDateTagsFromArray(todosParagraphs)
    const tasksByType = cleanTodayTodoParas.length ? getTasksByType(cleanTodayTodoParas) : null // puts in object by type of task and enriches with sort info (like priority)
    if (tasksByType && tasksByType['open'].length) {
      const sortedTodos = tasksByType['open'].length ? sortListBy(tasksByType['open'], '-priority') : []
      const nowTimeString = getTimeStringFromDate(new Date())
      const calendarMapWithEvents = await getPopulatedTimeMapForToday(dateStr, intervalMins, config)
      // calendarMapWithEvents.forEach((todo, i) => console.log(`calendarMapWithEvents[${i}]=${JSP(todo, 2)}`))
      // sortedTodos.forEach((todo, i) => console.log(`sortedTodos[${i}]=${JSP(todo, 2)}`))
      const eventsToTimeblock = getTimeBlockTimesForEvents(calendarMapWithEvents, sortedTodos, config)
      const { timeBlockTextList } = eventsToTimeblock
      // $FlowIgnore -- Delete any previous timeblocks we created
      deleteParagraphsContainingString(editorOrNote(note), timeBlockTag)
      await insertItemsIntoNote(editorOrNote(note), timeBlockTextList, config)
    }
  } else {
    await showMessage(`You need to be in Today's Calendar Note to use this function`)
  }
}
