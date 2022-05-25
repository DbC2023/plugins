/* global describe, expect, test, toEqual */
import * as e from '../src/eventsToNotes'
import { clo } from '../../helpers/dev'

describe('eventsToNotes.js tests', () => {

  describe('sortByCalendarNameThenStartTime() using HH:MM-strings as times', () => {
    let mapForSorting: { cal: string, start: string, text: string }[] = []
    mapForSorting.push({ cal: 'calB', start: '09:00', text: 'event string 1' })
    mapForSorting.push({ cal: 'calA', start: '10:00', text: 'event string 2' })
    mapForSorting.push({ cal: 'calC', start: '11:00', text: 'event string 3' })
    mapForSorting.push({ cal: 'calB', start: '11:00', text: 'event string 4' })
    mapForSorting.push({ cal: 'calA', start: '23:00', text: 'event string 5' })
    mapForSorting.push({ cal: 'calC', start: '00:00', text: 'event string 6' })

    let sortedMap: { cal: string, start: string, text: string }[] = []
    sortedMap.push({ cal: 'calA', start: '10:00', text: 'event string 2' })
    sortedMap.push({ cal: 'calA', start: '23:00', text: 'event string 5' })
    sortedMap.push({ cal: 'calB', start: '09:00', text: 'event string 1' })
    sortedMap.push({ cal: 'calB', start: '11:00', text: 'event string 4' })
    sortedMap.push({ cal: 'calC', start: '00:00', text: 'event string 6' })
    sortedMap.push({ cal: 'calC', start: '11:00', text: 'event string 3' })

    test('should sort by calendar name then start time test for HH:MM style times', () => {
      const result = mapForSorting.sort(e.sortByCalendarNameThenStartTime())
      // clo(result)
      expect(result).toEqual(sortedMap)
    })
  })

  describe('sortByCalendarNameThenStartTime() using Dates', () => {
    let mapForSorting: { cal: string, start: Date, text: string }[] = []
    mapForSorting.push({ cal: 'calB', start: new Date(2021, 0, 1, 9, 0, 0), text: 'event string 1' })
    mapForSorting.push({ cal: 'calA', start: new Date(2021, 0, 1, 10, 0, 0), text: 'event string 2' })
    mapForSorting.push({ cal: 'calC', start: new Date(2021, 0, 1, 11, 0, 0), text: 'event string 3' })
    mapForSorting.push({ cal: 'calB', start: new Date(2021, 0, 1, 11, 0, 0), text: 'event string 4' })
    mapForSorting.push({ cal: 'calA', start: new Date(2021, 0, 1, 23, 0, 0), text: 'event string 5' })
    mapForSorting.push({ cal: 'calC', start: new Date(2021, 0, 1, 0, 0, 0), text: 'event string 6' })

    let sortedMap: { cal: string, start: Date, text: string }[] = []
    sortedMap.push({ cal: 'calA', start: new Date(2021, 0, 1, 10, 0, 0), text: 'event string 2' })
    sortedMap.push({ cal: 'calA', start: new Date(2021, 0, 1, 23, 0, 0), text: 'event string 5' })
    sortedMap.push({ cal: 'calB', start: new Date(2021, 0, 1, 9, 0, 0), text: 'event string 1' })
    sortedMap.push({ cal: 'calB', start: new Date(2021, 0, 1, 11, 0, 0), text: 'event string 4' })
    sortedMap.push({ cal: 'calC', start: new Date(2021, 0, 1, 0, 0, 0), text: 'event string 6' })
    sortedMap.push({ cal: 'calC', start: new Date(2021, 0, 1, 11, 0, 0), text: 'event string 3' })

    test('should sort by calendar name then start time test H:MM A style times', () => {
      const result = mapForSorting.sort(e.sortByCalendarNameThenStartTime())
      // clo(result)
      expect(result).toEqual(sortedMap)
    })
  })

  describe('smartStringReplace()', () => {
    let config = {
      calendarNameMappings: [],
      locale: "en-GB",
      timeOptions: ""
    }
    let format1 = "- (*|CAL|*) *|TITLE|**| URL|**|\n> NOTES|*\n*|ATTENDEES|*" // simpler
    let format2 = "### (*|CAL, |**|START|**|-END|*) *|TITLE|**|\nEVENTLINK|**| URL|**| with ATTENDEENAMES|**|\n> NOTES|*\n---\n(end)" // more complex
    let startDT = new Date(2021, 0, 1, 20, 0, 0)
    let endDT = new Date(2021, 0, 1, 22, 0, 0)
    let attendeesArray = ["✓ Jonathan Clark", "? James Bond", "x Martha", "? bob@example.com"]
    let attendeeNamesArray = ["Jonathan Clark", "Martha Clark", "bob@example.com"]
    let event1 = { calendar: 'Jonathan', title: 'title of event1', url: 'https://example.com/easy', date: startDT, endDate: endDT, notes: 'a few notes', attendees: attendeesArray, attendeeNames: attendeeNamesArray } // simple case
    let event2 = { calendar: 'Us', title: 'title of event2 with <brackets> & more', url: 'https://example.com/bothersomeURL/example', date: startDT, endDate: endDT, notes: 'a few notes with TITLE and URL', attendees: attendeesArray, attendeeNames: attendeeNamesArray } // case with inclusion
    let replacements1 = e.getReplacements(event1, config)
    let replacements2 = e.getReplacements(event2, config)

    test('event 1 format 1 easy', () => {
      const result = e.smartStringReplace(format1, replacements1)
      expect(result).toEqual('- (Jonathan) title of event1 https://example.com/easy\n> a few notes\n✓ Jonathan Clark, ? James Bond, x Martha, ? bob@example.com')
    })
    test('event 1 format 2 more complex', () => {
      const result = e.smartStringReplace(format2, replacements1)
      const expected = "### (Jonathan, 20:00:00-22:00:00) title of event1 https://example.com/easy with Jonathan Clark, Martha Clark, bob@example.com\n> a few notes\n---\n(end)"
      expect(result).toEqual(expected)
    })
    test('event 2 format 1 easy', () => {
      const result = e.smartStringReplace(format1, replacements2)
      const expected = "- (Us) title of event2 with <brackets> & more https://example.com/bothersomeURL/example\n> a few notes with TITLE and URL\n✓ Jonathan Clark, ? James Bond, x Martha, ? bob@example.com"
      expect(result).toEqual(expected)
    })
    test('event 2 format 2 more complex', () => {
      const result = e.smartStringReplace(format2, replacements2)
      const expected = "### (Us, 20:00:00-22:00:00) title of event2 with <brackets> & more https://example.com/bothersomeURL/example with Jonathan Clark, Martha Clark, bob@example.com\n> a few notes with TITLE and URL\n---\n(end)"
      expect(result).toEqual(expected)
    })

  })

})
