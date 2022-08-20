# What's changed in 📦 Filer plugin?
Please see the [Readme for this plugin](https://github.com/NotePlan/plugins/tree/main/jgclark.Filer) for more details, including the available settings.

## [1.0.0-beta1] - 2022-08-18
### Change to Commands
- existing command **/move paragraphs** renamed to **/move paragraph or selection**. This moves this paragraph (or selected paragraphs) to a different note
- added command **/move paragraph block** moves all paragraphs in the current block to a different note. Use the settings to determine how far before and after the current paragraph the block will extend.
- retired the command alias **/file paragraphs**, as **/move paragraphs** is clearer

## [0.9.2] - 2022-08-16
### Fixed
- was failing to offer the last heading in a note to move/copy lines to

## [0.9.1] - 2022-08-15
### Added
- where the command is working out which lines to include in the block, it will now show them highlighted while it's asking which note to move them to. This provides a useful way of checking it's going to do what you intend. (Though it's unlikely to be very visible on small screen devices.) (_This won't work on versions of NotePlan before v3.6.2._)
- more logging available when needed

## [0.9.0] - 2022-08-05
### Changed
- Split a setting into two: 'Include lines from start of Section in the Block?' and 'Use a tighter definition of when a Block finishes?'  This gives more control over the number of lines that are automatically selected to move. _You can still manually select a specific range of lines to move._
- Updated logging framework

## [0.8.1] - 2022-06-27
### Added
- new **/new note from clipboard** command (alias **nnc**) added back in from 0.7.0 beta
- now formats date links using your system's default date formatter

## [0.8.0] - 2022-06-25
### Added
- 4 new commands, particularly to help keyboard warriors quickly move items to the most frequently-used Daily and Weekly notes. Each moves lines to the current weekly note, using the same selection strategy as /mp. The move happens in the background, leaving you in the flow in your current note.
  - **/quick move to Today's note** (alias **/qmtd**) -- Note: this is different from the existing 'Move Task To Today ⌘0' shortcut, which actually _schedules_ not moves.
  - **/quick move to Tomorrow's note** (alias **/qmtm**) -- Note: this is different from the existing 'Move Task To Tomorrow ⌘1' shortcut, which actually _schedules_ not moves.
  - **/quick move to Weekly note** (alias **/qmw**) -- Note: weekly notes available from NotePlan v3.6
  - **/quick move to Next Weekly note** (alias **/qmnw**) -- Note: weekly notes available from NotePlan v3.6
- They could be mapped to shortcut keys to make using them even faster.

### Changed
- **/nns** is now an alias to the longer name **/new note from selection**

## [0.7.0] - 2022-06-24
### Added
- new **/add sync'd copy to note** command (alias **/asc**) that adds a 'line ID' to current line and copy it to a section in the specified other note. (Note: this requires the new "Synced Lines" Lab feature in v3.5.2 to be turned on.)
- new command **/move blocks**. This uses the new 'Extended Block` definition (from 0.6.0) to move a contiguous 'block' of lines. The existing **/move paragraphs** command remains, but now doesn't use the extended definition. (I've split them out this way, to make it possible to use both without needing to change the settings.)
- add ability to default moving lines to the _end_ of a heading's section, not just the _start_ of it. See setting 'Where to add in section'.
- following a NotePlan improvement, **/move paragraphs** now creates the destination daily note if it doesn't already exist.

### Changed
- switch to newer logging system under-the-hood
<!-- - refactored code to allow re-use of my paragraph block finding code. -->

## [0.6.0] - 2022-02-12
### Added
- new alias **/move paragraphs** for the main **/mp** command.
- **/mp** now creates the destination daily note if it doesn't already exist
- new setting 'whereToAddInSection'. This allows moving lines to the 'end' of a heading's section, not just the 'start' of it.
- new setting 'useExtendedBlockDefinition'. This controls whether all the lines in the current heading's section are included in the block to move (true) or whether only the following ones that are more deeply indented are included (false; this is the default). In both cases a block is closed by a blank line or a separator (horizontal line).

### Changed
- will now use the Settings window available from the Plugin Preferences pane (from NotePlan v3.4), in preference to the fiddly _configuration note.

## [0.5.1..0.5.0] - 2021-10-03
### Added
- new setting 'addDateBacklink' can now be specified. The default for this is still 'true'.
- **/nns** (new note from selection) command moved from NoteHelpers plugin.
### Changed
- minor improvement to the heading selection dialog
### Fixed
- moving to the special '(bottom of note)' pseudo-heading

## [0.4.0..0.4.3] - 2021-07-29
### Changed
- will prepend at a smarter point (i.e. after any frontmatter or metadata lines)
- minor improvement to folder list display
- update README
### Fixed
- fixes to /nns (not working with subfolders)

## [0.3.0..0.3.3] - 2021-06-11
### Added
- add **/mp** (move) as an alias to **/fp** (file)
- removed restriction to move to just project notes
- can now move any indented paragraphs after the selected line
- creates a `>date` backlink when moving from a calendar note (requested by @Dimitry). Can be turned off by the 'addDateBacklink' setting (see above).
### Changed
- update code to work with today's API fixes
- bug fixes and additions to README

## [0.2.0..0.2.2] - 2021-05-26
### Added
- add ability to move paragraphs to top or bottom of note. (Top of note comes after title if there is one.)
- now works when moving to notes with _no title or headings at all_ [Issue 10 by @dwertheimer ]
- first release
