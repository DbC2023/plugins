# What's Changed in 🕸 Map of Contents plugin?

## [0.2.2] - 2022-08-18
### Changed
- updated to newer logging framework. No functional changes, I think.

## [0.2.1] - 17.7.2022
### Added
- fixed problem with #hashtag and @mention in search terms
- Note: there is an issue in NotePlan with created notes with @ or # in the title: they tend to disappear, which makes the refreshing of MOCs _into the existing MOC_ unreliable.

## [0.2.0] - 13.6.2022
### Added
- new option 'Sort order for results', and now defaults to 'alphabetical', with other options 'createdDate' and 'updatedDate' [requested by @John1]
- new option 'Case insensitive searching?', which defaults to false [suggested by @John1]

### Changed
- now matches search terms on whole words, not parts of words
- now ignores matches in paths of [markdown links](path), as well as in file:/... and https://... URLs [suggested by @John1]

## [0.1.0] - 9.6.2022
Initial release with new command to create Maps of Content (MOCs) **/make MOC**. _I regard this as experimental feature, and I particularly welcome feedback on its usefulness._
