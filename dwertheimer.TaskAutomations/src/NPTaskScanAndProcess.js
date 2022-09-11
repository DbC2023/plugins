// @flow

const pluginJson = '../plugin.json'
import { getDateOptions } from '@helpers/dateTime'
import { log, logError, logDebug, timer, clo } from '@helpers/dev'
import { convertOverdueTasksToToday, RE_PLUS_DATE } from '@helpers/note'
import { chooseOption, showMessage } from '@helpers/userInput'

export type OverdueSearchOptions = {
  openOnly: boolean,
  foldersToIgnore: Array<string>,
  datePlusOnly: boolean,
  confirm: boolean,
  showUpdatedTask: boolean,
  showNote: boolean,
  replaceDate: boolean,
  noteTaskList: null | Array<Array<TParagraph>>,
  noteFolder: ?string | false,
  overdueOnly: ?boolean /* used for reviewing today's references etc */,
}

type RescheduleUserAction = '__yes__' | '__mark__' | '__canceled__' | '__remove__' | '__skip__' | '__xcl__' | string /* >dateOptions */ | number /* lineIndex of item to pop open */

/**
 * Get shared CommandBar options to be displayed for both full notes or individual tasks
 * @param {TPara} origPara
 * @param {boolean} isSingleLine
 * @returns {$ReadOnlyArray<{ label: string, value: string }>} the options for feeding to a command bar
 */
function getSharedOptions(origPara: TParagraph | { note: TNote }, isSingleLine: boolean): $ReadOnlyArray<{ label: string, value: string }> {
  const dateOpts = getDateOptions()
  // clo(dateOpts, `promptUserToActOnLine dateOpts`)
  const note = origPara.note
  const taskText = isSingleLine ? `this task` : `the above tasks`
  const contentText = isSingleLine ? `"${origPara?.content || ''}"` : `tasks in "${note?.title || ''}"`
  return [
    { label: `> Change ${taskText} to >today (repeating until complete)`, value: '__yes__' },
    { label: `✓ Mark ${taskText} done/complete`, value: '__mark__' },
    { label: `🙅‍♂️ Mark ${taskText} cancelled`, value: '__canceled__' },
    { label: `⌫ Remove the >date from ${taskText}`, value: '__remove__' },
    { label: `➡️ Skip - Do not change "${contentText}" (and continue)`, value: '__skip__' },
    { label: '⎋ Cancel Review ⎋', value: '__xcl__' },
    { label: '------ Set Due Date To: -------', value: '-----' },
    ...dateOpts,
  ]
}

/**
 * Open a note, highlight the task being looked at and prompt user for a choice of what to do with one specific line
 * @param {*} origPara
 * @returns {Promise<RescheduleUserAction | false>} the user choice or false
 */
async function promptUserToActOnLine(origPara: TParagraph /*, updatedPara: TParagraph */): Promise<RescheduleUserAction | false> {
  logDebug(pluginJson, `promptUserToActOnLine "${origPara.note?.title || ''}": "${origPara.content || ''}"`)
  const range = origPara.contentRange
  if (origPara?.note?.filename) await Editor.openNoteByFilename(origPara.note.filename, false, range?.start || 0, range?.end || 0)
  const sharedOpts = getSharedOptions(origPara, true)
  const opts = [
    { label: `✏️ Edit this task in note: "${origPara.note?.title || ''}"`, value: '__edit__' },
    { label: `␡ Delete this line (be sure!)`, value: '__delete__' },
    ...sharedOpts,
  ]
  const res = await chooseOption(`Task: "${origPara.content}"`, opts)
  clo(res, `promptUserToActOnLine after chooseOption res=`)
  return res
}

/**
 * Given a user choice on a specific action to take on a line, process the line accordingly
 * @param {TParagraph} origPara
 * @param {TParagraph} updatedPara
 * @param {RescheduleUserAction|false} userChoice
 * @returns
 * @jest (limited) tests exist
 */
export async function processUserActionOnLine(
  origPara: TParagraph,
  updatedPara: TParagraph,
  userChoice: RescheduleUserAction | false,
): Promise<{ action: string, changed?: TParagraph }> {
  if (userChoice) {
    const content = origPara?.content || ''
    logDebug(pluginJson, `processUserActionOnLine on content: "${content}" res= "${userChoice}"`)
    switch (userChoice) {
      case '__edit__': {
        const input = await CommandBar.textPrompt('Edit task contents', `Change text:\n"${content}" to:\n`, updatedPara.content)
        if (input) {
          origPara.content = input
          // clo(origPara, `chooseOption returning`)
          return { action: 'set', changed: origPara }
        } else {
          return { action: 'cancel' }
        }
      }
      case `__mark__`:
      case '__canceled__':
        origPara.type = userChoice === '__mark__' ? 'done' : 'cancelled'
        return { action: 'set', changed: origPara }
      case '__remove__':
        while (RE_PLUS_DATE.test(origPara.content)) {
          origPara.content = origPara.content.replace(RE_PLUS_DATE, '').replace(/ {2,}/, ' ').trim()
        }
        return { action: 'set', changed: origPara }
      case `__delete__`:
        return { action: 'delete' }
      case `__yes__`: {
        return { action: 'set', changed: updatedPara }
      }
      case `__no__`: {
        return { action: 'set', changed: origPara }
      }
      case '__skip__':
        return { action: 'skip', changed: origPara }
    }
    if (typeof userChoice === 'string' && userChoice[0] === '>') {
      origPara.content = origPara.content.replace(RE_PLUS_DATE, userChoice)
      return { action: 'set', changed: origPara }
    }
    logDebug(pluginJson, `processUserActionOnLine chosen: ${userChoice} returning`)
  }
  return { action: 'cancel' }
}

/**
 * Helper function to show overdue tasks in note & allow user selection
 * @param {TNote} note
 * @param {*} updates
 * @param {*} index
 * @param {*} totalNotesToUpdate
 * @returns
 */
async function showOverdueNote(note: TNote, updates: Array<TParagraph>, index: number, totalNotesToUpdate: number) {
  const range = updates[0].contentRange
  await Editor.openNoteByFilename(note.filename, false, range?.start || 0, range?.end || 0)
  // const options = updates.map((p) => ({ label: `${note?.paragraphs?[Number(p.lineIndex) || 0]?.content}`, value: `${p.lineIndex}` })) //show the original value
  clo(note, `showOverdueNote: note[${index}]=`)
  const options = updates.map((p, i) => {
    logDebug(
      pluginJson,
      `showOverdueNote updates.map[${i}] note.title=${note.title || ''} note?.paragraphs=${note?.paragraphs.length} p.lineIndex=${p.lineIndex} p.content=${p.content}`,
    )
    if (note.paragraphs.length <= p.lineIndex) {
      //seems like this is an API bug which shouldn't be possible
      return { label: `Error: LineIndex=${p.lineIndex}; paragraphs=${note.paragraphs.length}`, value: `0` }
    } else {
      return { label: `${note?.paragraphs[Number(p.lineIndex) || 0]?.content}`, value: `${p.lineIndex}` }
    }
  }) //show the original value
  const opts = [
    { label: '>> SELECT A TASK OR MARK THEM ALL <<', value: '-----' },
    ...options,
    { label: '----------------------------------------------------------------', value: '-----' },
    ...getSharedOptions({ note }, false),
  ]
  const res = await chooseOption(`Note (${index + 1}/${totalNotesToUpdate}): "${note?.title || ''}"`, opts)
  logDebug(`NPnote`, `showOverdueNote note:"${note?.title || ''}" user action: ${res}`)
  return res
}

/**
 * Review a single note get user input on what to do with it (either the whole note or the tasks on this note)
 * @param {Array<Array<TParagraph>>} notesToUpdate
 * @param {number} noteIndex
 * @param {OverdueSearchOptions} options
 * @returns {number} the new note index (e.g. to force it to review this note again) by default, just return the index you got. -2 means user canceled. noteIndex-1 means show this note again
 */
async function reviewNote(notesToUpdate: Array<Array<TParagraph>>, noteIndex: number, options: OverdueSearchOptions): Promise<number> {
  const { showNote, confirm } = options
  let updates = notesToUpdate[noteIndex],
    currentTaskIndex = showNote ? -1 : 0,
    currentTaskLineIndex = updates[0].lineIndex,
    res
  const note = updates[0].note
  logDebug(pluginJson, `reviewNote starting review of note: "${note?.title || ''}" tasksToUpdate=${updates.length}`)
  clo(updates, `reviewNote updates`)
  if (note) {
    if (updates.length > 0) {
      let makeChanges = !confirm
      if (confirm) {
        do {
          if (!updates.length) return currentTaskIndex
          if (showNote) {
            res = await showOverdueNote(note, updates, noteIndex, notesToUpdate.length)
          } else {
            res = currentTaskLineIndex // skip note and process each task as if someone clicked it to edit
          }
          if (!isNaN(res)) {
            // this was an index of a line to edit
            logDebug(`NPnote`, `reviewNote ${note.paragraphs[Number(res) || 0].content}`)
            // edit a single task item
            clo(note.paragraphs[Number(res) || 0], `reviewNote paraClicked=`)
            const origPara = note.paragraphs[Number(res) || 0]
            const index = updates.findIndex((u) => u.lineIndex === origPara.lineIndex) || 0
            const updatedPara = updates[index]
            const choice = await promptUserToActOnLine(origPara /*, updatedPara */)
            const result = await processUserActionOnLine(origPara, updatedPara, choice)
            clo(result, 'NPNote::reviewNote result')
            if (result) {
              switch (result.action) {
                case 'set':
                  logDebug('NPNote::reviewNote', `received set command; index= ${index}`)
                  clo(result.changed, 'NPNote::reviewNote result')
                  if (result?.changed) {
                    updates[index] = result.changed
                    note.updateParagraph(updates[index])
                    logDebug('NPNote::reviewNote', `after set command; updates[index].content= ${updates[index].content}`)
                    updates.splice(index, 1) //remove item which was updated from note's updates
                    logDebug(
                      'NPNote::reviewNote',
                      `after splice/remove this line from updates.length=${updates.length} noteIndex=${noteIndex} ; will return noteIndex=${
                        updates.length ? noteIndex - 1 : noteIndex
                      }`,
                    )
                  }
                  // if there are still updates on this note, subtract one so the i++ in the caller function will increment
                  // it and show this note again for the other tasks to be update
                  // if there are no updates, do nothing and let the i++ take us to the next note
                  return updates.length ? noteIndex - 1 : noteIndex
                case 'cancel': {
                  const range = note.paragraphs[updates[0].lineIndex].contentRange
                  await Editor.openNoteByFilename(note.filename, false, range?.start || 0, range?.end || 0, true)
                  return -2
                }
                case 'delete': {
                  updates.splice(index, 1) //remove item which was updated from note's updates
                  origPara.note?.removeParagraph(origPara)
                  return updates.length ? noteIndex - 1 : noteIndex
                }
                case 'skip': {
                  updates.splice(index, 1) //remove item which was updated from note's updates
                  return updates.length ? noteIndex - 1 : noteIndex
                }
              }
              //user selected an item in the list to come back to later (in splitview)
              // const range = note.paragraphs[Number(res) || 0].contentRange
              // await Editor.openNoteByFilename(note.filename, false, range?.start || 0, range?.end || 0, true)
              // if (range) Editor.select(range.start,range.end-range.start)
              // makeChanges = false
            }
          } else {
            switch (res) {
              case '__xcl__': {
                // const range = note.paragraphs[updates[0].lineIndex].contentRange
                // await Editor.openNoteByFilename(note.filename, false, range?.start || 0, range?.end || 0, true)
                return -2
              }
              case '__yes__':
                makeChanges = true
                break
              case '__mark__':
              case '__canceled__':
                updates = updates.map((p) => {
                  p.type = res === '__mark__' ? 'done' : 'cancelled'
                  return p
                })
                makeChanges = true
                break
            }
            if (typeof res === 'string' && res[0] === '>') {
              updates = updates.map((p) => {
                const origPara = note.paragraphs[p.lineIndex]
                p.content = origPara.content.replace(RE_PLUS_DATE, String(res))
                return p
              })
              // clo(updates, `reviewNote updates=`)
              makeChanges = true
            }
          }
          if (currentTaskIndex > -1) {
            currentTaskIndex = currentTaskIndex < updates.length - 2 ? currentTaskIndex++ : -1
            currentTaskLineIndex = updates[currentTaskIndex].lineIndex
          }
        } while (currentTaskIndex !== -1)
      }
      if (makeChanges) {
        // updatedParas = updatedParas.concat(updates)
        logDebug(`NPNote::reviewNote`, `about to update ${updates.length} todos in note "${note.filename || ''}" ("${note.title || ''}")`)
        note?.updateParagraphs(updates)
        logDebug(`NPNote::reviewNote`, `Updated ${updates.length} todos in note "${note.filename || ''}" ("${note.title || ''}")`)
      } else {
        logDebug(`NPNote::reviewNote`, `No update because makeChanges = ${String(makeChanges)}`)
      }
      // clo(updatedParas,`overdue tasks to be updated`)
    }
  }
  return noteIndex
}

/**
 * Search the DataStore looking for notes with >date and >date+ tags which need to be converted to >today tags going forward
 * If plusTags are found (today or later), then convert them to >today tags
 * @param {OverdueSearchOptions} - options object with the following characteristics:
 * {TNote} note
 * {boolean} openOnly - if true, only find/convert notes with >date tags that are open tasks
 * {Array<string>} foldersToIgnore (e.g. tests/templates)
 * {boolean} datePlusOnly - true = only find/convert notes with >date+ tags (otherwise all overdue tasks)
 * {boolean} confirm - should NotePlan pop up a message about how many changes are about to be made
 * {boolean} showNote - show the note as review is happening
 * {boolean} replaceDate - whether to replace date with >today or just tack it on (leaving date in place)
 * {boolean} noteTaskList - run on the open note in the Editor
 * {string} noteFolder - one specific folder to look in (or false)
 * @author @dwertheimer
 */
export async function findNotesWithOverdueTasksAndMakeToday(options: OverdueSearchOptions): Promise<void> {
  const {
    openOnly = true,
    foldersToIgnore = [],
    datePlusOnly = true,
    confirm = false,
    /* showNote = true, // unused variable */
    replaceDate = true,
    noteTaskList = null /*, showUpdatedTask = true */,
    noteFolder = false,
    overdueOnly = true,
  } = options
  const start = new Date()
  let notesWithDates
  if (noteTaskList) {
    notesWithDates = noteTaskList
  } else {
    if (noteFolder) {
      notesWithDates = [...DataStore.projectNotes, ...DataStore.calendarNotes]
        .filter((n) => (n?.filename ? n.filename.includes(`${noteFolder}/`) : false))
        .filter((n) => (n?.datedTodos ? n.datedTodos?.length > 0 : false))
    } else {
      notesWithDates = [...DataStore.projectNotes, ...DataStore.calendarNotes].filter((n) => (n?.datedTodos ? n.datedTodos?.length > 0 : false))
    }
  }
  if (!noteTaskList && foldersToIgnore) {
    notesWithDates = notesWithDates.filter((note) =>
      foldersToIgnore.every((skipFolder) => !(note?.filename && typeof note.filename === 'string' ? note.filename.includes(`${skipFolder}/`) : false)),
    )
  }
  logDebug(`NPNote::findNotesWithOverdueTasksAndMakeToday`, `total notesWithDates: ${notesWithDates.length}`)
  // let updatedParas = []
  let notesToUpdate = []
  if (!noteTaskList) {
    for (const n of notesWithDates) {
      if (n) {
        const updates = convertOverdueTasksToToday(n, openOnly, datePlusOnly, replaceDate)
        if (updates.length > 0) {
          notesToUpdate.push(updates)
        }
      }
    }
  } else {
    notesToUpdate = noteTaskList
  }
  logDebug(`NPNote::findNotesWithOverdueTasksAndMakeToday`, `total notes with overdue dates: ${notesToUpdate.length}`)
  if (!notesToUpdate.length && confirm) {
    await showMessage('Did not find any overdue tasks...congratulations!')
  }

  // loop through all notes and process each individually
  for (let i = 0; i < notesToUpdate.length; i++) {
    logDebug(
      `NPNote::findNotesWithOverdueTasksAndMakeToday`,
      `starting note loop:${i} of ${notesToUpdate.length} notes;  number of updates left: notesToUpdate[i].length=${notesToUpdate[i].length}`,
    )
    if (notesToUpdate[i].length) {
      i = await reviewNote(notesToUpdate, i, options) // result may decrement index to see the note again after one line change
      if (i === -2) break //user selected cancel
    }
  }
  logDebug(`NPNote::findNotesWithOverdueTasksAndMakeToday`, `Total convertOverdueTasksToToday scan took: ${timer(start)}`)
}
