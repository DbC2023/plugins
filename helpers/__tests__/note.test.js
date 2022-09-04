/* global describe, test, expect, beforeAll */
import colors from 'chalk'
import * as n from '../note'
import DataStore from '@mocks/index'

const PLUGIN_NAME = `📙 ${colors.yellow('helpers/note')}`
const section = colors.blue

beforeAll(() => {
  global.DataStore = DataStore // so we see DEBUG logs in VSCode Jest debugs
})

// Jest suite
describe(`${PLUGIN_NAME}`, () => {
  describe(section('helpers/calendar.js'), () => {
    /*
     * convertOverdueTasksToToday()
     */
    describe('convertOverdueTasksToToday()' /* function */, () => {
      test('should find and return an overdue+ para', () => {
        const note = { datedTodos: [{ type: 'done', content: 'foo >2020-01-01+' }] }
        const result = n.convertOverdueTasksToToday(note, false, false)
        expect(result[0].content).toMatch(/>today/)
      })
      test('should not find and return a plain (non +) overdue para when 3rd pram is true', () => {
        const note = { datedTodos: [{ type: 'done', content: 'foo >2020-01-01' }] }
        const result = n.convertOverdueTasksToToday(note, false, true)
        expect(result).toEqual([])
      })
      test('should find and return a plain (non +) overdue para when 3rd pram is true', () => {
        const note = { datedTodos: [{ type: 'done', content: 'foo >2020-01-01' }] }
        const result = n.convertOverdueTasksToToday(note, false, false)
        expect(result[0].content).toMatch(/>today/)
      })
      test('should not find and return an overdue+ para if its not open', () => {
        const note = { datedTodos: [{ type: 'done', content: 'foo >2020-01-01+' }] }
        const result = n.convertOverdueTasksToToday(note, true, false)
        expect(result).toEqual([])
      })
      test('should find and return an overdue+ para if is open', () => {
        const note = { datedTodos: [{ type: 'open', content: 'foo >2020-01-01+' }] }
        const result = n.convertOverdueTasksToToday(note, true, false)
        expect(result[0].content).toMatch(/>today/)
      })
      test('should find and return a plain (non +) overdue para if is open', () => {
        const note = { datedTodos: [{ type: 'open', content: 'foo >2020-01-01' }] }
        const result = n.convertOverdueTasksToToday(note, true, false)
        expect(result[0].content).toMatch(/>today/)
      })
      test('should replace > 1 date if all dates are past', () => {
        const note = { datedTodos: [{ type: 'open', content: 'foo >2020-01-01 and >2021-12-31' }] }
        const result = n.convertOverdueTasksToToday(note, true, false)
        expect(result[0].content).toMatch(/>today/)
      })
      test('should return multiple paras if is open', () => {
        const note = {
          datedTodos: [
            { type: 'open', content: 'foo >2020-01-01+' },
            { type: 'scheduled', content: 'foo >2020-01-01' },
            { type: 'open', content: 'bar >2020-01-01' },
          ],
        }
        const result = n.convertOverdueTasksToToday(note, true, false)
        expect(result.length).toEqual(2)
        expect(result[1].content).toMatch(/bar/)
      })
    })
  })
})
