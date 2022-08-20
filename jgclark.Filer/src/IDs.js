// @flow
// ----------------------------------------------------------------------------
// Plugin to help link lines between notes with Line IDs
// Jonathan Clark
// last updated 15.8.2022 for v0.7.0+
// ----------------------------------------------------------------------------

import pluginJson from "../plugin.json"
import { getFilerSettings, addParasAsText } from './fileItems'
import { logDebug, logError, logWarn } from '@helpers/dev'
import { displayTitle } from '@helpers/general'
import { allNotesSortedByChanged } from '@helpers/note'
import { getSelectedParaIndex } from '@helpers/NPParagraph'
import { parasToText } from '@helpers/paragraph'
import { chooseHeading } from '@helpers/userInput'

//-----------------------------------------------------------------------------

/**
 * Add a 'blockId' to current line, and ask which note's heading (section)
 * to also add it to.
 */
export async function addIDAndAddToOtherNote(): Promise<void> {
  try {
    const { note, content, paragraphs, selectedParagraphs } = Editor
    if (content == null || selectedParagraphs == null || note == null) {
      // No note open, or no selectedParagraph selection (perhaps empty note), so don't do anything.
      logWarn(pluginJson, 'No note open, so stopping.')
      return
    }

    // Get config settings
    const config = await getFilerSettings()

    // Get current paragraph
    // TODO: why not use selectedParagraphs[0]?
    const firstSelParaIndex = getSelectedParaIndex()
    const para = paragraphs[firstSelParaIndex]

    // Add Line ID for the first paragraph (known as 'blockID' by API)
    note.addBlockID(para)
    note.updateParagraph(para)
    const newBlockID = para.blockId
    if (newBlockID) {
      logDebug(pluginJson, `- blockId added: '${newBlockID}'`)
    } else {
      logError(pluginJson, `- no blockId created. Stopping.`)
      return
    }

    // turn into text, for reasons given in moveParas()
    const selectedParasAsText = parasToText([para]) // i.e. turn single para into a single-iterm array
  
    // Decide where to copy the line to
    const notes = allNotesSortedByChanged()
    const res = await CommandBar.showOptions(
      notes.map((n) => n.title ?? 'untitled'),
      `Select note to copy the line to`,
    )
    const destNote = notes[res.index]
    // Note: showOptions returns the first item if something else is typed. And I can't see a way to distinguish between the two.

    // Ask to which heading to add the selectedParas
    const headingToFind = await chooseHeading(destNote, true, true, false)
    logDebug(pluginJson, `- Will add to note '${displayTitle(destNote)}' under heading: '${headingToFind}'`)

    // Add text to the new location in destination note
    addParasAsText(destNote, selectedParasAsText, headingToFind, config.whereToAddInSection)

    // NB: handily, the blockId goes with it as part of the para.content
    // logDebug(pluginJson, `- Inserting 1 para at index ${insertionIndex} into ${displayTitle(destNote)}`)
    // await destNote.insertParagraph(para.content, insertionIndex, paraType)  
  }
  catch (error) {
    logError(pluginJson, error.message)
  }
}
