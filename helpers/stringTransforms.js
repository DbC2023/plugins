// @flow
//-----------------------------------------------------------------------------
// String Manipulation functions
// by @jgclark, @dwertheimer
//-----------------------------------------------------------------------------

import {
  getNPWeekStr,
  RE_ISO_DATE,
  todaysDateISOString,
} from '@helpers/dateTime'
import { clo, JSP, logDebug, logError, logInfo } from '@helpers/dev'
import {
  RE_MARKDOWN_LINKS_CAPTURE_G,
  RE_SYNC_MARKER
} from '@helpers/regex'


/**
 * TODO(@dwertheimer): move 'removeDateTagsAndToday' from dateTime.js to here
 */


/**
 * Change [title](URI) markdown links to <a href="URI">title</a> HTML style
 * @author @jgclark
 * @tests in jest file
 * @param {string} original 
 */
export function changeMarkdownLinkToHTMLLink(original: string): string {
  let output = original
  const captures = Array.from(original.matchAll(RE_MARKDOWN_LINKS_CAPTURE_G) ?? [])
  if (captures.length > 0) {
    clo(captures, `${String(captures.length)} results from markdown link matches:`)
    // Matches come in pairs, so process a pair at a time
    for (const capture of captures) {
      const linkTitle = capture[1]
      const linkURL = capture[2]
      output = output.replace(`[${linkTitle}](${linkURL})`, `<a href="${linkURL}">${linkTitle}</a>`)
    }
  }
  return output
}

/**
 * Strip `>today` and scheduled dates of form `>YYYY-MM-DD` that point to today from the input string
 * TODO: write tests
 * @author @jgclark
 * @param {string} original 
 * @returns {string} altered string
 */
export function stripTodaysDateRefsFromString(original: string): string {
  let output = original
  const REGEX = new RegExp(`>(${todaysDateISOString}|today)`, "g")
  const captures = output.match(REGEX) ?? []
  if (captures.length > 0) {
    clo(captures, `results from >(${todaysDateISOString}|today) match:`)
    for (const capture of captures) {
      output = output.replace(capture, '').replace(/\s{2,}/, ' ').trimRight()
    }
  }
  return output
}

/**
 * Strip refs to this week (of form `>YYYY-Www`) from the input string
 * TODO: all
 * @author @jgclark
 * @param {string} original 
 * @returns {string} altered string
 */
export function stripThisWeeksDateRefsFromString(original: string): string {
  let output = original
  const thisWeekStr = getNPWeekStr(new Date())
  const REGEX = new RegExp(`>${thisWeekStr}`, "g")
  const captures = output.match(REGEX) ?? []
  if (captures.length > 0) {
    clo(captures, `results from >${thisWeekStr} match:`)
    for (const capture of captures) {
      output = output.replace(capture, '').replace(/\s{2,}/, ' ').trimRight()
    }
  }
  return output
}

/**
 * Strip all `<YYYY-MM-DD` dates from the input string
 * @author @jgclark
 * @tests in jest file
 * @param {string} original 
 * @returns {string} altered string
 */
export function stripBackwardsDateRefsFromString(original: string): string {
  let output = original
  const REGEX = new RegExp(`<${RE_ISO_DATE}`, "g")
  const captures = Array.from(output.matchAll(REGEX) ?? [])
  if (captures.length > 0) {
    clo(captures, `results from <YYYY-MM-DD match:`)
    for (const capture of captures) {
      output = output.replace(capture[0], '').replace(/\s{2,}/, ' ').trimRight()
    }
  }
  return output
}

/**
 * Strip wiki link [[...]] markers from string, leaving the note title
 * @author @jgclark
 * @tests in jest file
 * @param {string} original 
 * @returns {string} altered string
 */
export function stripWikiLinksFromString(original: string): string {
  let output = original
  const captures = Array.from(original.matchAll(/\[\[(.*?)\]\]/g) ?? [])
  if (captures.length > 0) {
    clo(captures, 'results from [[notelinks]] match:')
    for (const capture of captures) {
      output = output.replace(capture[0], capture[1])
    }
  }
  return output
}

/**
 * Strip all #hashtags from string, 
 * TODO: or if second parameter passed, just the tags that match that string
 * TODO: write tests
 * @param {string} original 
 * @param {string?} specificItemToStrip 
 * @returns {string} changed line
 */
export function stripHashtagsFromString(original: string, specificItemToStrip?: string): string {
  // TODO: use specificItemToStrip
  // TODO: write tests
  let output = original
  // Note: the regex from @EduardMe's file is /(\s|^|\"|\'|\(|\[|\{)(?!#[\d[:punct:]]+(\s|$))(#([^[:punct:]\s]|[\-_\/])+?\(.*?\)|#([^[:punct:]\s]|[\-_\/])+)/ but :punct: doesn't work in JS, so here's my simplified version
  const captures = output.match(/(?:\s|^|\"|\(|\)|\')(#[A-Za-z]\w*)/g)
  if (captures.length > 0) {
    clo(captures, 'results from hashtag matches:')
    for (const capture of captures) {
      const match = capture.slice(1)
      // logDebug('hashtag match', match)
      output = output.replace(match, '').replace(/\s{2,}/, ' ').trimRight()
    }
  }
  return output
}

/**
 * Strip all @mentions from string, 
 * TODO: or if second parameter passed, just the mentions that match that string
 * TODO: deal with @mention(...) cases as well
 * TODO: write tests
 * @param {string} original 
 * @param {string?} specificItemToStrip 
 * @returns {string} changed line
 */
export function stripMentionsFromString(original: string, specificItemToStrip?: string): string {
  let output = original
  // Note: the regex from @EduardMe's file is /(\s|^|\"|\'|\(|\[|\{)(?!@[\d[:punct:]]+(\s|$))(@([^[:punct:]\s]|[\-_\/])+?\(.*?\)|@([^[:punct:]\s]|[\-_\/])+)/ but :punct: doesn't work in JS, so here's my simplified version
  const captures = output.match(/(?:\s|^|\"|\(|\)\')(@[A-Za-z][\w\d\.\-\(\)]*)/g)
  if (captures) {
    clo(captures, 'results from mention matches:')
    for (const capture of captures) {
      const match = capture.slice(1)
      // logDebug('mention match', match)
      output = output.replace(match, '').replace(/\s{2,}/, ' ').trimRight()
    }
  }
  return output
}

/**
 * Strip `^abcdef` blockIDs from string
 * @author @jgclark
 * @tests in jest file
 * @param {string} original 
 * @returns {string} changed line
 */
export function stripBlockIDsFromString(original: string): string {
  let output = original
  const REGEX = new RegExp(RE_SYNC_MARKER, "g")
  const captures = Array.from(output.matchAll(REGEX) ?? [])
  if (captures.length > 0) {
    clo(captures, 'results from blockID match:')
    for (const capture of captures) {
      output = output.replace(capture[0], '').replace(/\s{2,}/, ' ').trimRight()
    }
  }
  return output
}