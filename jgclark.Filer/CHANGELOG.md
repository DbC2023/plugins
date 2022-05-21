# What's changed in 📦 Filer plugin?
Please see the [Readme for this plugin](https://github.com/NotePlan/plugins/tree/main/jgclark.Filer) for more details, including the available settings.

<!-- ### Fixed
- `/move paragraphs` sometimes not removing all the paragraphs from the note they are moved from -->
<!-- ### Added
- ??? /fp and /mp now create the destination daily note if it doesn't already exist
- [when environment() API call is available] ??? will use system locale in dates, where possible
-->

## [0.7.0] - 2022-05-17
### Added
- new **/add sync'd copy to note** command (alias **/asc**) that adds a 'line or block ID' to current line and copy it to a section in the specified other note. (NB: this requires the new "Synced Blocks" Lab feature in v3.5.2 to be turned on.)
- add ability to default to moving to the end of a heading's section, not the start of it. See setting 'Where to add in section'.

### Changed
- switch to newer logging system under-the-hood
<!-- - refactored code to allow re-use of my paragraph block finding code. -->

## [0.6.0] - 2022-02-12
### Added
- new alias `/move paragraphs` for the main `/mp` command.
- `/mp` now creates the destination daily note if it doesn't already exist
- new setting `whereToAddInSection`. This allows moving lines to the 'end' of a heading's section, not just the 'start' of it.
- new setting `useExtendedBlockDefinition`. This controls whether all the lines in the current heading's section are included in the block to move (true) or whether only the following ones that are more deeply indented are included (false; this is the default). In both cases a block is closed by a blank line or a separator (horizontal line).

### Changed
- will now use the Settings window available from the Plugin Preferences pane (from NotePlan v3.4), in preference to the fiddly _configuration note.

## [0.5.1] - 2021-10-03
### Fixed
- moving to the special '(bottom of note)' pseudo-heading

## [0.5.0] - 2021-08-29
### Added
- new setting `addDateBacklink` can now be specified in the `Filer` section in your _configuration note. The default for this is still `true`.
- `/nns` (new note from selection) command moved from NoteHelpers plugin.

### Changed
- minor improvement to the heading selection dialog

## [0.4.0..0.4.3] - 2021-07-29
### Changed
- will prepend at a smarter point (i.e. after any frontmatter or metadata lines)
- minor improvement to folder list display
- update README

### Fixed
- fixes to /nns (not working with subfolders)

## [0.3.0..0.3.3] - 2021-06-11
### Added
- add `/mp` (move) as an alias to `/fp` (file)
- removed restriction to move to just project notes
- can now move any indented paragraphs after the selected line
- creates a `>date` backlink when moving from a calendar note (requested by @Dimitry). Can be turned off by the `pref_addDateBacklink` setting (see above).
### Changed
- update code to work with today's API fixes
- bug fixes and additions to README

## [0.2.0..0.2.2] - 2021-05-26
### Added
- add ability to move paragraphs to top or bottom of note. (Top of note comes after title if there is one.)
- now works when moving to notes with _no title or headings at all_ [Issue 10 by @dwertheimer ]
- first release
