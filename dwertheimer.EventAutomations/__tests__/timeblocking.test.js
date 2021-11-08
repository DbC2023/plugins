import * as tb from '../src/timeblocking'

// Jest suite
describe('timeblocking', () => {
  test('dwertheimer.EventAutomations - timeblocking.blockTimeFor', () => {})

  test('dwertheimer.EventAutomations - timeblocking.blockTimeFor', () => {
    expect(tb.isTask(noteWithTasks.paragraphs[1])).toBe(true)
    expect(tb.isTask(noteWithOutTasks.paragraphs[1])).toBe(false)
  })
})
