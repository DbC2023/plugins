/* eslint-disable max-len */
// @flow
//---------------------------------------------------------------------
// Regex definitions for NotePlan and its plugins
// @jgclark, last updated 15.1.2023
//---------------------------------------------------------------------
// 
// This file holds definitions that don't live in more specific helper files, and also lists other files with useful regexes.
//
// Note: these are mostly strings, not JavaScript RegExp objects. This allows for composition of more complex regexes from simpler building blocks.
// The main ways to use them are:
// - string.match(RE_NAME) -> array of matches
// - RE_NAME.test(string) -> boolean
//
// If you wish to use this with 'g' (global flag) or 'i' (case insensitive flag), you will need to create a RegExp object in one of two ways:
// - const RE_VAR = new RegExp(/.../gi)
// - const RE_VAR: RegExp = /.../gi
//---------------------------------------------------------------------

// Times, Dates
export const RE_SCHEDULED_DATES_G: RegExp = /[>@](today|tomorrow|yesterday|(([0-9]{4})(-((0[1-9]|1[0-2])(-(0[1-9]|1[0-9]|2[0-9]|3[0-1]))?|Q[1-4]|W0[1-9]|W[1-4]\d|W5[0-3]))?))/g // from Eduard
// In helpers/dateTime.js:
// - RE_TIME
// - RE_DATE
// - RE_YYYYMMDD_DATE
// - RE_DATE_CAPTURE
// - RE_ISO_DATE
// - RE_PLUS_DATE_G
// - RE_PLUS_DATE
// - RE_SCHEDULED_ISO_DATE
// - RE_DATE_TIME
// - RE_BARE_DATE
// - RE_BARE_DATE_CAPTURE
// - RE_FILE_EXTENSIONS_GROUP
// - RE_NP_DAY_SPEC
// - RE_NP_WEEK_SPEC
// - WEEK_NOTE_LINK
// - RE_BARE_WEEKLY_DATE
// - RE_BARE_WEEKLY_DATE_CAPTURE
// - RE_NP_MONTH_SPEC
// - RE_NP_QUARTER_SPEC
// - RE_NP_YEAR_SPEC

// @done(...)
// In helpers/dateTime.js
// - RE_DATE_INTERVAL
// - RE_OFFSET_DATE
// - RE_OFFSET_DATE_CAPTURE

// Note filenames and links
// In helpers/dateTime.js
// - RE_WEEKLY_NOTE_FILENAME
// - MONTH_NOTE_LINK
// - RE_MONTHLY_NOTE_FILENAME
// - QUARTER_NOTE_LINK
// - RE_QUARTERLY_NOTE_FILENAME
// - YEAR_NOTE_LINK
// - RE_YEARLY_NOTE_FILENAME

// Paragraphs
// In helpers/paragraph.js:
// - RE_URI
// - RE_MARKDOWN_PATH
// - RE_SYNC_MARKER

// @done() markers
// In helpers/dateTime.js
// - RE_DONE_DATE_TIME
// - RE_DONE_DATE_TIME_CAPTURES
// - RE_DONE_DATE_OR_DATE_TIME_DATE_CAPTURE
// - RE_DONE_DATE_OPT_TIME

// Calendar / Event items
export const RE_EVENT_LINK: RegExp = /!\[.*\]\(\d{4}-[01]\d-[0123]\d\s[0-2]\d:[0-5]\d:.*?:.*?:[A-F0-9-]{36,37}:.*?:.*?:.*?:.*?:.*?:(.+?):.*?:.*?:(#[A-F0-9]{6})\)/
// In helpers / calendar.js:
// - RE_EVENT_ID

// Time Blocks
// In helpers / timeblocks.js:  (note the duplication)
// - RE_ISO_DATE
// - RE_HOURS
// - RE_HOURS_EXT
// - RE_MINUTES
// - RE_TIME
// - RE_TIME_EXT
// - RE_AMPM
// - RE_AMPM_OPT
// - RE_TIME_TO
// - RE_DONE_DATETIME
// - RE_DONE_DATE_OPT_TIME
// - RE_TIMEBLOCK_PART_A
// - RE_TIMEBLOCK_PART_B
// - RE_TIMEBLOCK_PART_C
// - RE_TIMEBLOCK
// - RE_TIMEBLOCK_APP
// - RE_ALLOWED_TIME_BLOCK_LINE_START
// - RE_TIMEBLOCK_FOR_THEMES

// URLs and Links
export const RE_MARKDOWN_LINKS_CAPTURE_G: RegExp = /\[([^\]]+)\]\(([^\)]+)\)/g
export const RE_MARKDOWN_LINK_PATH_CAPTURE: RegExp = /\[.+?\]\(([^\s]*?)\)/
export const RE_SIMPLE_URI_MATCH: RegExp = /(\w+:\/\/[\w\.\/\?\#\&\d\-\=%*,]+)/
export const RE_SIMPLE_BARE_URI_MATCH_G: RegExp = /[^\("'](\b(\w+:\/{1,3}[\w\.\/\?\#\&\d\-\=\@%*,]+))/ig

// Synced lines
export const RE_SYNC_MARKER: RegExp = /\^[A-Za-z0-9]{6}(?![A-Za-z0-9])/

// Misc
export const PUNCT_CLASS_STR = `[\[\]!"#\$%&'\(\)\*\+,\-\.\/:;<=>\?@\\\^_\`\{\|\}~]` // using info from https://stackoverflow.com/questions/39967107/regular-expression-using-punct-function-in-java
export const PUNCT_CLASS_STR_QUOTED = "[\\[\\]!\"#\\$%&'\\(\\)\\*\\+,\\-\\.\\/:;<=>\\?@\\\\\\^_\\`\\{\\|\\}~]" // version suitable for including in larger regexes

//---------------------------------------------------------------------

// NotePlan's markdown-regex.json file, turned into just the regex prefixed with NP_RE_
// Published by Eduard at https://drive.google.com/file/d/1L16QZ1487i0uVLuA-K3l0sEhWTq7p86r/view

export const NP_RE_title1: RegExp = /^\h*(# )(.*)/
export const NP_RE_title2: RegExp = /^\h*(## )(.*)/
export const NP_RE_title3: RegExp = /^\h*(### )(.*)/
export const NP_RE_title4: RegExp = /^\h*(####+ )(.*)/
export const NP_RE_title_mark1: RegExp = /^\h*(# )(.*)/
export const NP_RE_title_mark2: RegExp = /^\h*(## )(.*)/
export const NP_RE_title_mark3: RegExp = /^\h*(###+ )(.*)/
export const NP_RE_title_mark4: RegExp = /^\h*(####+ )(.*)/
export const NP_RE_bold: RegExp = /(^|\W)(?:(?!\1)|(?=^))((\*|_)\3)(?=\S)(.*?[^*_])(\3\3)(?!\2)(?=\W|$)/
export const NP_RE_italic: RegExp = /(^|\W)(?:(?!\1)|(?=^))(\*|_)(?=\S)((?:(?!\2).)*?[^*_])(\2)(?!\2)(?=\W|$)/
export const NP_RE_boldItalic: RegExp = /(\*\*\*)\w+(\s\w+)*(\*\*\*)/
export const NP_RE_bold_left_mark: RegExp = /(^|\W)(?:(?!\1)|(?=^))((\*|_)\3)(?=\S)(.*?[^*_])(\3\3)(?!\2)(?=\W|$)/
export const NP_RE_bold_right_mark: RegExp = /(^|\W)(?:(?!\1)|(?=^))(\*|_)\2(?=\S)(.*?[^*_])(\2\2)(?!\2)(?=\W|$)/
export const NP_RE_italic_left_mark: RegExp = /(^|\W)(?:(?!\1)|(?=^))(\*|_)(?=\S)((?:(?!\2).)*?[^*_])(\2)(?!\2)(?=\W|$)/
export const NP_RE_italic_right_mark: RegExp = /(^|\W)(?:(?!\1)|(?=^))(\*|_)(?=\S)((?:(?!\2).)*?[^*_])(\2)(?!\2)(?=\W|$)/
export const NP_RE_boldItalic_left_mark: RegExp = /(\*\*\*)\w+(\s\w+)*(\*\*\*)/
export const NP_RE_boldItalic_right_mark: RegExp = /(\*\*\*)\w+(\s\w+)*(\*\*\*)/
export const NP_RE_special_char: RegExp = /([\*\-]+)/
export const NP_RE_checked: RegExp = /(^\h*[\*\-]{1} |^\h*[0-9]+[\.\)] )(\[[x\-\>]\] )(.*)/
export const NP_RE_checked_todo_characters: RegExp = /(^\h*[\*\-]{1} |^\h*[0-9]+[\.\)] )(\[[x\-\>]\] )/
export const NP_RE_todo: RegExp = /(^\h*[\*\-]{1} |^\h*[0-9]+[\.\)] )(?:(?!\[[x\-\>]\] ))(?:\[\s\] )?/
export const NP_RE_tabbed: RegExp = /^(\t+)(?:[\*\-\>]{1} .*|[0-9]+[\.\)] .*)$/
export const NP_RE_quote_mark: RegExp = /(^\h*> )(.*)/
export const NP_RE_quote_content: RegExp = /(^\h*> )(.*)/
export const NP_RE_link: RegExp = /((\b([0-9a-zA-Z\-\.\+]+):\/\/[^：\s{}\[<>±„\"“]+(?<![\.,;!\"\]\*]))|[^：\*\s{}\(\)\[<>±„\"“]+\.(com|org|edu|gov|uk|net|in|co\.in|co\.uk|co|cn|ca|de|jp|fr|au|us|ru|ch|it|nl|se|no|es|mil|ac|kr|an|aq|at|bb|bw|cd|cy|dz|ec|ee|eg|et|fi|gh|gl|gr|hk|ht|hu|ie|il|iq|is|kh|kg|kz|lr|lv|nz|pe|pa|ph|pk|pl|pt|sg|tw|ua|me|tr|cc)(([\/%]+[^：\s{}\[<>±]*)(?<![\.,;!\"\]„\"“])|$|(?=[^a-zA-Z])))/ // for any URIs
export const NP_RE_schedule_to_date_link: RegExp = /[>@](today|tomorrow|yesterday|(([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|1[0-9]|2[0-9]|3[0-1])))( ((0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]( ?[aApP][mM])?))?/
export const NP_RE_done_date: RegExp = /@done\((([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|1[0-9]|2[0-9]|3[0-1]))( ((0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]( ?[aApP][mM])?))?\)/
export const NP_RE_schedule_from_date_link: RegExp = /<(([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|1[0-9]|2[0-9]|3[0-1]))/
export const NP_RE_note_title_link: RegExp = /(\[{2})(.*?\]*)(\]{2})/
export const NP_RE_code: RegExp = /(`)([^`]{1,})(`)/
export const NP_RE_code_left_backtick: RegExp = /(`)([^`]{1,})(`)/
export const NP_RE_code_right_backtick: RegExp = /(`)([^`]{1,})(`)/

// FIXME: Something's not right in final step of making regex.
// const ORIG_HASHTAG_STR = `(\s|^|[\"\'\(\[\{\*\_])(?!#[\d[:punct:]]+(\s|$))(#([^[:punct:]\s]|[\-_\/])+?\(.*?\)|#([^[:punct:]\s]|[\-_\/])+)`
// const ORIG_HASHTAG_STR_QUOTED = `(\\s|^|[\\"\\'\\(\\[\\{\\*\\_])(?!#[\\d[:punct:]]+(\\s|$))(#([^[:punct:]\\s]|[\\-_\\/])+?\\(.*?\\)|#([^[:punct:]\\s]|[\\-_\\/])+)`
// const HASHTAG_STR_FOR_JS = ORIG_HASHTAG_STR_QUOTED.replace(/\[:punct:\]/g, PUNCT_CLASS_STR_QUOTED)
// export const NP_RE_hashtag_G: RegExp = new RegExp(HASHTAG_STR_FOR_JS, 'g')

// FIXME: When above is fixed, fix this too
// const ORIG_ATTAG_STR = `(\s|^|[\\"\'\(\[\{\*\_])(?!@[\d[:punct:]]+(\s|$))(@([^[:punct:]\s]|[\-_\/])+?\(.*?\)|@([^[:punct:]\s]|[\-_\/])+)`
// const ATTAG_STR_FOR_JS = ORIG_ATTAG_STR.replace(/\[:punct:\]/g, PUNCT_CLASS_STR_QUOTED)
// export const NP_RE_attag_G: RegExp = new RegExp(ATTAG_STR_FOR_JS, 'g')

// To which I have added one:
export const NP_RE_checklist: RegExp = /^\h*\+\s(?:(?!\[[x\-\>]\] ))(?:\[\s\] )?/  // open checklist item
