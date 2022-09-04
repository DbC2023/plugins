// @flow

import pluginJson from '../plugin.json'
import { JSP, clo, log, logError, logWarn, logDebug } from '@helpers/dev'
import { findNotesWithOverdueTasksAndMakeToday } from '@helpers/NPnote'

/**
 * Find and update date+ tags
 * (plugin entry point for "/Update >date+ tags in Notes")
 * @param {string} incoming - comes from xcallback - any string runs this command silently
 */
export async function updateDatePlusTags(incoming: string): Promise<void> {
  try {
    logDebug(pluginJson, `updateDatePlusTags: incoming="${incoming}" typeof=${typeof incoming}`)
    const confirmResults = incoming ? false : true
    const { datePlusOpenOnly, datePlusFoldersToIgnore, showUpdatedTask } = DataStore.settings
    await findNotesWithOverdueTasksAndMakeToday({
      openOnly: datePlusOpenOnly,
      foldersToIgnore: datePlusFoldersToIgnore,
      datePlusOnly: true,
      confirm: confirmResults,
      showUpdatedTask,
    })
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 * Find and update all overdue tasks, including >date and >date+
 * (plugin entry point for "/Update overdue tasks in Notes")
 * @param {string} incoming - comes from xcallback - any string runs this command silently
 */
export async function updateAllOverdueTasks(incoming: string): Promise<void> {
  try {
    logDebug(pluginJson, `updateAllOverdueTasks: incoming="${incoming}" typeof=${typeof incoming}`)
    const confirmResults = incoming ? false : true
    const { overdueOpenOnly, overdueFoldersToIgnore, showUpdatedTask } = DataStore.settings
    await findNotesWithOverdueTasksAndMakeToday({
      openOnly: overdueOpenOnly,
      foldersToIgnore: overdueFoldersToIgnore,
      datePlusOnly: false,
      confirm: confirmResults,
      showUpdatedTask,
    })
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}
