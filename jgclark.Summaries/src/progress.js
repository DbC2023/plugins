// @flow
//-----------------------------------------------------------------------------
// Progress update on some key goals to include in notes
// Jonathan Clark, @jgclark
// Last updated for v0.4.0, 12.1.2022
//-----------------------------------------------------------------------------

import {
  calcMentionStatsPeriod,
  getConfigSettings,
  getPeriodStartEndDates,
} from './summaryHelpers'
import { logAllEnvironmentSettings } from '../../helpers/NPdev'
import {
  unhyphenatedDate,
} from '../../helpers/dateTime'
import { rangeToString } from '../../helpers/general'


//-------------------------------------------------------------------------------

const progressHeading = `Progress Update`

function getSelectedParaIndex(): number {
  const { paragraphs, selection } = Editor
  // Get current selection, and its range
  if (selection == null) {
    console.log(`warning: No selection found, so stopping.`)
    return 0
  }
  const range = Editor.paragraphRangeAtCharacterIndex(selection.start)
  // console.log(`  Cursor/Selection.start: ${rangeToString(range)}`)

  // Work out what selectedPara number(index) this selected selectedPara is
  let firstSelParaIndex = 0
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i]
    if (p.contentRange?.start === range.start) {
      firstSelParaIndex = i
      break
    }
  }
  // console.log(`  firstSelParaIndex = ${firstSelParaIndex}`)
  return firstSelParaIndex
}


/**
 * Work out the @mention stats of interest so far this week/month, and write out to current note.
 * Default to looking at week to date ("wtd") but allow month to date ("mtd") as well.
 * @author @jgclark
 * 
 * @param {String} interval - currently "wtd" (week-to-date) or "mtd" (month-to-date)
*/
export async function insertProgressUpdate(intervalType?: string): Promise<void> {
  // If no intervalType passed, default to "wtd"
  const interval = intervalType ?? 'wtd'
  // Get config settings from Template folder _configuration note
  let config = await getConfigSettings()

  // Get time period
  const [fromDate, toDate, periodString, periodPartStr] = await getPeriodStartEndDates("", interval)
  if (fromDate == null || toDate == null) {
    console.log('insertProgressUpdate: Error calculating dates for week to date')
    return
  }
  const fromDateStr = unhyphenatedDate(fromDate)
  const toDateStr = unhyphenatedDate(toDate)
  console.log(`\tcalculating ${interval} for ${periodString} (= ${fromDateStr} - ${toDateStr}):`)
  // Get day of week (Sunday is first day of the week) or day of month
  const dateWithinInterval = (interval === 'wtd') ? (new Date()).getDay() + 1 : (new Date()).getDate()

  // // Calc hashtags stats (returns two maps)
  // const hOutputArray = []
  // let results = await calcHashtagStatsPeriod(fromDateStr, toDateStr)
  // const hCounts = results?.[0]
  // const hSumTotals = results?.[1]
  // if (hSumTotals == null || hCounts == null) {
  //   console.log('no hSumTotals value')
  //   return
  // }

  // // Custom sort method to sort arrays of two values each
  // // const sortedHCounts = new Map(
  // //   [...(hCounts?.entries() ?? [])].sort(([key1, _v1], [key2, _v2]) =>
  // //     key1.localeCompare(key2),
  // //   ),
  // // )

  // // First process more complex 'SumTotals', calculating appropriately
  // for (const [key, value] of hSumTotals) {
  //   // .entries() implied
  //   const hashtagString = config.showAsHashtagOrMention ? key : key.slice(1)
  //   const count = hCounts.get(key)
  //   if (count != null) {
  //     const total: string = value.toFixed(0)
  //     const average: string = (value / count).toFixed(1)
  //     hOutputArray.push(
  //       `${hashtagString}\t${count}\t(total ${total}\taverage ${average})`,
  //     )
  //     hCounts.delete(key) // remove the entry from the next map, as not longer needed
  //   }
  // }
  // // Then process simpler 'Counts'
  // for (const [key, value] of hCounts) {
  //   // .entries() implied
  //   const hashtagString = config.showAsHashtagOrMention ? key : key.slice(1)
  //   hOutputArray.push(`${hashtagString}\t${value}`)
  // }
  // // If there's nothing to report, let's make that clear, otherwise sort output
  // if (hOutputArray.length > 0) {
  //   hOutputArray.sort()
  // } else {
  //   hOutputArray.push('(none)')
  // }

  // Calc mentions stats (returns two maps)
  const mOutputArray = []
  let results = await calcMentionStatsPeriod(fromDateStr, toDateStr)
  const mCounts = results?.[0]
  const mSumTotals = results?.[1]
  if (mCounts == null || mSumTotals == null) {
    return
  }

  // First process more complex 'SumTotals', calculating appropriately
  for (const [key, value] of mSumTotals) {
    // .entries() implied
    const mentionString = key.slice(1) // show without leading '@' to avoid double counting issues
    const count = mCounts.get(key)
    if (count != null) {
      const total = value.toFixed(0)
      const average = (value / count).toFixed(1)
      mOutputArray.push(
        `${mentionString}\t${count}\t(total ${total}\taverage ${average})`,
      )
      mCounts.delete(key) // remove the entry from the next map, as not longer needed
    }
  }
  // Then process simpler 'Counts'
  for (const [key, value] of mCounts) {
    const mentionString = key.slice(1) // show without leading '@' to avoid double counting issues
    mOutputArray.push(`${mentionString}\t${value}`)
  }
  // If there's nothing to report, let's make that clear, otherwise sort output
  if (mOutputArray.length > 0) {
    mOutputArray.sort()
  } else {
    mOutputArray.push('(none)')
  }

  if (Editor == null) {
    console.log(`error: no note is open`)
  } else {
    let currentLineIndex = getSelectedParaIndex()
    if (currentLineIndex === 0) {
      console.log(`error: couldn't find correct cursor position, so will append to note instead.`)
      currentLineIndex = Editor.paragraphs.length - 1
    }
    // console.log(`\tinserting results to current note (${Editor.filename ?? ''}) at line ${currentLineIndex}`)
    Editor.insertHeading(
      `${progressHeading}: Day ${dateWithinInterval} for ${periodString}`, // TODO: make this from ~ String(config.mentionCountsHeading),
      currentLineIndex,
      3,
    )
    Editor.insertParagraph(mOutputArray.join('\n'), currentLineIndex + 1, 'text')
    console.log(`\tappended results to current note for day ${dateWithinInterval}.`)
  }
}