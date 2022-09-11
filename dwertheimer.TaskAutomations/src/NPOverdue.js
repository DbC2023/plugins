// @flow

import { getTodaysReferences } from '../../helpers/NPnote'
import pluginJson from '../plugin.json'
import { findNotesWithOverdueTasksAndMakeToday } from './NPTaskScanAndProcess'
import { JSP, clo, log, logError, logWarn, logDebug } from '@helpers/dev'
import { chooseFolder, showMessage } from '@helpers/userInput'

/**
 * Find and update date+ tags
 * (plugin entry point for "/Update >date+ tags in Notes")
 * @param {string} incoming - comes from xcallback - any string runs this command silently
 */
export async function updateDatePlusTags(incoming: string): Promise<void> {
  try {
    logDebug(pluginJson, `updateDatePlusTags: incoming="${incoming}" typeof=${typeof incoming}`)
    const confirmResults = incoming ? false : true
    const { datePlusOpenOnly, datePlusFoldersToIgnore, showUpdatedTask, replaceDate } = DataStore.settings
    await findNotesWithOverdueTasksAndMakeToday({
      openOnly: datePlusOpenOnly,
      foldersToIgnore: datePlusFoldersToIgnore,
      datePlusOnly: true,
      confirm: confirmResults,
      showUpdatedTask,
      showNote: false,
      noteTaskList: null,
      noteFolder: false,
      replaceDate,
      overdueOnly: true,
    })
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 * Find and update all overdue tasks, including >date and >date+
 * DISPLAY EACH NOTE'S TASK FIRST, WITH OPTION TO EXPLORE EACH TASK
 * (plugin entry point for "/Review overdue tasks (by Note)")
 * @param {string} incoming - comes from xcallback - any string runs this command silently
 */
export async function reviewOverdueTasksByNote(incoming: string): Promise<void> {
  try {
    logDebug(pluginJson, `reviewOverdueTasksByNote: incoming="${incoming}" typeof=${typeof incoming}`)
    const confirmResults = incoming ? false : true
    const { overdueOpenOnly, overdueFoldersToIgnore, showUpdatedTask, replaceDate } = DataStore.settings
    await findNotesWithOverdueTasksAndMakeToday({
      openOnly: overdueOpenOnly,
      foldersToIgnore: overdueFoldersToIgnore,
      datePlusOnly: false,
      confirm: confirmResults,
      showUpdatedTask,
      showNote: true,
      noteTaskList: null,
      noteFolder: false,
      replaceDate,
      overdueOnly: true,
    })
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 * Find and update all overdue tasks, including >date and >date+
 *  DISPLAY EACH NOTE'S TASK FIRST, WITH OPTION TO EXPLORE EACH TASK
 * (plugin entry point for "/Review overdue tasks (by Task)")
 * @param {string} incoming - comes from xcallback - any string runs this command silently
 */
export async function reviewOverdueTasksByTask(incoming: string): Promise<void> {
  try {
    logDebug(pluginJson, `reviewOverdueTasksByTask: incoming="${incoming}" typeof=${typeof incoming}`)
    const confirmResults = incoming ? false : true
    const { overdueOpenOnly, overdueFoldersToIgnore, showUpdatedTask, replaceDate } = DataStore.settings
    await findNotesWithOverdueTasksAndMakeToday({
      openOnly: overdueOpenOnly,
      foldersToIgnore: overdueFoldersToIgnore,
      datePlusOnly: false,
      confirm: confirmResults,
      showUpdatedTask,
      showNote: false,
      noteFolder: false,
      noteTaskList: null,
      replaceDate,
      overdueOnly: true,
    })
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 * Find and update all overdue tasks, including >date and >date+ in Active Note in Editor
 *  DISPLAY EACH NOTE'S TASK FIRST, WITH OPTION TO EXPLORE EACH TASK
 * (plugin entry point for "/Review overdue tasks (by Task)")
 * @param {string} incoming - comes from xcallback - any string runs this command silently
 */
export async function reviewOverdueTasksInNote(incoming: string): Promise<void> {
  try {
    logDebug(pluginJson, `reviewOverdueTasksInNote: incoming="${incoming}" typeof=${typeof incoming}`)
    const confirmResults = incoming ? false : true
    const { overdueOpenOnly, overdueFoldersToIgnore, showUpdatedTask, replaceDate } = DataStore.settings
    await findNotesWithOverdueTasksAndMakeToday({
      openOnly: overdueOpenOnly,
      foldersToIgnore: overdueFoldersToIgnore,
      datePlusOnly: false,
      confirm: confirmResults,
      showUpdatedTask,
      showNote: true,
      replaceDate,
      noteFolder: false,
      noteTaskList: Editor.note?.datedTodos?.length ? Editor.note?.datedTodos : [],
      overdueOnly: true,
    })
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 *  Find all tasks in today's references (e.g. >dated today or >today)
 *  DISPLAY EACH NOTE'S TASK FIRST, WITH OPTION TO EXPLORE EACH TASK
 * (plugin entry point for "/Review/Reschedule Tasks Dated Today")
 * @param {string} incoming - comes from xcallback - any string runs this command silently
 */
export async function reviewEditorReferencedTasks(incoming: string): Promise<void> {
  try {
    logDebug(pluginJson, `reviewEditorReferencedTasks: incoming="${incoming}" typeof=${typeof incoming}`)
    if (Editor.note?.type !== 'Calendar') {
      await showMessage(`You must be in a Calendar Note to run this command.`)
      return
    }
    // clo(getTodaysReferences(Editor.note), `reviewEditorReferencedTasks todayReferences`)
    const confirmResults = incoming ? false : true
    const { overdueOpenOnly, overdueFoldersToIgnore, showUpdatedTask, replaceDate } = DataStore.settings
    const refs = getTodaysReferences(Editor.note)
    logDebug(pluginJson, `reviewEditorReferencedTasks refs.length=${refs.length}`)
    const openTasks = refs.filter((p) => p.type === 'open' && p.content !== '') //TODO: confirm with users that open-only is OK for this command
    logDebug(pluginJson, `reviewEditorReferencedTasks openTasks.length=${openTasks.length}`)
    // gather references by note
    const notes = openTasks.reduce((acc, r) => {
      if (r.note?.filename) {
        if (r.note.filename && !acc.hasOwnProperty(r.note.filename)) acc[r.note.filename] = []
        if (r.note?.filename) acc[r.note.filename].push(r)
      }
      return acc
    }, {})
    // generate an array for each note (key)
    const arrayOfNotesAndTasks = Object.keys(notes).reduce((acc, k) => {
      acc.push(notes[k])
      return acc
    }, [])
    // clo(arrayOfNotesAndTasks, `NPOverdue::reviewEditorReferencedTasks arrayOfNotesAndTasks`)
    logDebug(pluginJson, `reviewEditorReferencedTasks arrayOfNotesAndTasks.length=${arrayOfNotesAndTasks.length}`)
    await findNotesWithOverdueTasksAndMakeToday({
      openOnly: overdueOpenOnly,
      foldersToIgnore: overdueFoldersToIgnore,
      datePlusOnly: false,
      confirm: confirmResults,
      showUpdatedTask,
      showNote: true,
      replaceDate,
      noteFolder: false,
      noteTaskList: arrayOfNotesAndTasks,
      overdueOnly: false,
    })
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 * Find and update all overdue tasks, including >date and >date+ in a folder chosen by user
 *  DISPLAY EACH NOTE'S TASK FIRST, WITH OPTION TO EXPLORE EACH TASK
 * (plugin entry point for "/Review overdue tasks in <Choose Folder>")
 * @param {string} incoming - comes from xcallback - any string runs this command silently
 */
export async function reviewOverdueTasksInFolder(incoming: string): Promise<void> {
  try {
    logDebug(pluginJson, `reviewOverdueTasksInFolder: incoming="${incoming}" typeof=${typeof incoming}`)
    const confirmResults = incoming ? false : true
    const { overdueOpenOnly, overdueFoldersToIgnore, showUpdatedTask, replaceDate } = DataStore.settings
    await findNotesWithOverdueTasksAndMakeToday({
      openOnly: overdueOpenOnly,
      foldersToIgnore: overdueFoldersToIgnore,
      datePlusOnly: false,
      confirm: confirmResults,
      showUpdatedTask,
      showNote: true,
      replaceDate,
      noteTaskList: null,
      noteFolder: await chooseFolder('Choose Folder to Search for Overdue Tasks'),
      overdueOnly: true,
    })
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}
