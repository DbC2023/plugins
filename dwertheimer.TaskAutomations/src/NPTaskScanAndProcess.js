// @flow

const pluginJson = '../plugin.json'
import { getDateOptions } from '@helpers/dateTime'
import { log, logError, logDebug, timer, clo } from '@helpers/dev'
import { convertOverdueTasksToToday, RE_PLUS_DATE } from '@helpers/note'
import { chooseOption } from '@helpers/userInput'

async function processLineClick(origPara: TParagraph, updatedPara: TParagraph): Promise<{ action: string, changed?: TParagraph }> {
  logDebug(pluginJson, `processLineClick "${origPara.note?.title || ''}": "${origPara.content || ''}"`)
  const range = origPara.contentRange
  if (origPara?.note?.filename) await Editor.openNoteByFilename(origPara.note.filename, false, range?.start || 0, range?.end || 0)
  const content = origPara?.content || ''
  const dateOpts = getDateOptions()
  // clo(dateOpts, `processLineClick dateOpts`)
  const opts = [
    { label: `✏️ Edit this task in note: "${origPara.note?.title || ''}"`, value: '__edit__' },
    { label: `> Change this task to >today (repeating until complete)`, value: '__yes__' },
    { label: `✓ Mark this task complete`, value: '__mark__' },
    { label: `🙅‍♂️ Mark this task cancelled`, value: '__canceled__' },
    { label: `❌ Skip - Do not change "${content}" (and continue)`, value: '__no__' },
    { label: '⎋ Cancel Review ⎋', value: '__xcl__' },
    { label: '------ Set Due Date To: -------', value: '-----' },
  ].concat(dateOpts)
  const res = await chooseOption(`Task: "${origPara.content}"`, opts)
  clo(res, `processLineClick after chooseOption res=`)
  if (res) {
    logDebug(pluginJson, `processLineClick on content: "${content}" res= "${res}"`)
    switch (res) {
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
        origPara.type = res === '__mark__' ? 'done' : 'cancelled'
        return { action: 'set', changed: origPara }
      case `__yes__`: {
        return { action: 'set', changed: updatedPara }
      }
      case `__no__`: {
        return { action: 'set', changed: origPara }
      }
    }
    if (res[0] === '>') {
      origPara.content = origPara.content.replace(RE_PLUS_DATE, res)
      return { action: 'set', changed: origPara }
    }
    logDebug(pluginJson, `processLineClick chosen: ${res} returning`)
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
  // const options = updates.map((p) => ({ label: showUpdatedTask ? p.content : note.paragraphs[Number(p.lineIndex) || 0].content, value: `${p.lineIndex}` })) //show the original value
  const options = updates.map((p) => ({ label: `${note.paragraphs[Number(p.lineIndex) || 0].content}`, value: `${p.lineIndex}` })) //show the original value
  const dateOpts = getDateOptions()
  const opts = [
    { label: '>> SELECT A TASK OR MARK THEM ALL <<', value: '-----' },
    ...options,
    { label: '----------------------------------------------------------------', value: '-----' },
    { label: `> Mark the above tasks as >today (repeating until complete)`, value: '__yes__' },
    { label: `✓ Mark the above tasks done/complete`, value: '__mark__' },
    { label: `🙅‍♂️ Mark the above tasks cancelled`, value: '__canceled__' },
    { label: `❌ Skip -- Do not change tasks in "${note?.title || ''}" (and continue)`, value: '__no__' },
    { label: `⎋ Cancel Review ⎋`, value: '__xcl__' },
    { label: '------ Set All Due Date(s) To: -------', value: '-----' },
  ].concat(dateOpts)
  const res = await chooseOption(`Note (${index + 1}/${totalNotesToUpdate}): "${note?.title || ''}"`, opts)
  logDebug(`NPnote`, `findNotesWithOverdueTasksAndMakeToday note:"${note?.title || ''}" user action: ${res}`)
  return res
}

type OverdueSearchOptions = {
  openOnly: boolean,
  foldersToIgnore: Array<string>,
  datePlusOnly: boolean,
  confirm: boolean,
  showUpdatedTask: boolean,
  showNote: boolean,
  replaceDate: boolean,
  singleNote: ?boolean,
  noteFolder: ?string | false,
}

/**
 * Review a single note get user input on what to do with it (either the whole note or the tasks on this note)
 * @param {Array<Array<TParagraph>>} notesToUpdate
 * @param {number} noteIndex
 * @param {OverdueSearchOptions} options
 * @returns {number} the new note index (e.g. to force it to review this note again) by default, just return the index you got. -2 means user canceled. noteIndex-1 means show this note again
 */
async function reviewSingleNote(notesToUpdate: Array<Array<TParagraph>>, noteIndex: number, options: OverdueSearchOptions): Promise<number> {
  const { showNote, confirm } = options
  let updates = notesToUpdate[noteIndex],
    currentTaskIndex = showNote ? -1 : 0,
    currentTaskLineIndex = updates[0].lineIndex,
    res
  const note = updates[0].note
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
            logDebug(`NPnote`, `reviewSingleNote ${note.paragraphs[Number(res) || 0].content}`)
            // edit a single task item
            clo(note.paragraphs[Number(res) || 0], `reviewSingleNote paraClicked=`)
            const origPara = note.paragraphs[Number(res) || 0]
            const index = updates.findIndex((u) => u.lineIndex === origPara.lineIndex) || 0
            const updatedPara = updates[index]
            const result = await processLineClick(origPara, updatedPara)
            clo(result, 'NPNote::reviewSingleNote result')
            if (result) {
              switch (result.action) {
                case 'set':
                  logDebug('NPNote::reviewSingleNote', `received set command; index= ${index}`)
                  clo(result.changed, 'NPNote::reviewSingleNote result')
                  if (result?.changed) {
                    updates[index] = result.changed
                    note.updateParagraph(updates[index])
                    logDebug('NPNote::reviewSingleNote', `after set command; updates[index].content= ${updates[index].content}`)
                    updates.splice(index, 1) //remove item which was updated from note's updates
                    logDebug(
                      'NPNote::reviewSingleNote',
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
              // clo(updates, `reviewSingleNote updates=`)
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
        logDebug(`NPNote::reviewSingleNote`, `about to update ${updates.length} todos in note "${note.filename || ''}" ("${note.title || ''}")`)
        note?.updateParagraphs(updates)
        logDebug(`NPNote::reviewSingleNote`, `Updated ${updates.length} todos in note "${note.filename || ''}" ("${note.title || ''}")`)
      } else {
        logDebug(`NPNote::reviewSingleNote`, `No update because makeChanges = ${String(makeChanges)}`)
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
 * {boolean} singleNote - run on the open note in the Editor
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
    singleNote = false /*, showUpdatedTask = true */,
    noteFolder = false,
  } = options
  const start = new Date()
  let notesWithDates
  if (singleNote) {
    notesWithDates = [Editor.note].filter((n) => n?.datedTodos?.length || 0 > 0)
  } else {
    if (noteFolder) {
      notesWithDates = [...DataStore.projectNotes, ...DataStore.calendarNotes]
        .filter((n) => (n?.filename ? n.filename.includes(`${noteFolder}/`) : false))
        .filter((n) => (n?.datedTodos ? n.datedTodos?.length > 0 : false))
    } else {
      notesWithDates = [...DataStore.projectNotes, ...DataStore.calendarNotes].filter((n) => (n?.datedTodos ? n.datedTodos?.length > 0 : false))
    }
  }
  if (!singleNote && foldersToIgnore) {
    notesWithDates = notesWithDates.filter((note) => foldersToIgnore.every((skipFolder) => !(note?.filename ? note.filename.includes(`${skipFolder}/`) : false)))
  }
  logDebug(`NPNote::findNotesWithOverdueTasksAndMakeToday`, `total notesWithDates: ${notesWithDates.length}`)
  // let updatedParas = []
  const notesToUpdate = []
  for (const n of notesWithDates) {
    if (n) {
      const updates = convertOverdueTasksToToday(n, openOnly, datePlusOnly, replaceDate)
      if (updates.length > 0) {
        notesToUpdate.push(updates)
      }
    }
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
      i = await reviewSingleNote(notesToUpdate, i, options) // result may decrement index to see the note again after one line change
      if (i === -2) break //user selected cancel
    }
  }
  logDebug(`NPNote::findNotesWithOverdueTasksAndMakeToday`, `Total convertOverdueTasksToToday scan took: ${timer(start)}`)
}
