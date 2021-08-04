# Changelog
See [website README for more details](https://github.com/NotePlan/plugins/tree/main/jgclark.EventHelpers), and how to configure.

### v.0.3.0 8.3.2021 @dwertheimer
- Updated ::toLocaleShortTime() to deal with locales and timeStrings.
- Updated events config to use:
 `locale: "en-US",
  timeOptions: { hour: '2-digit', minute: '2-digit', hour12: false }`
- Also added optional template for allday items (so you don't get an errant "-" etc):
`{{listTodaysEvents({template:"### START-END: TITLE",allday_template:"### TITLE"})}}`

### v0.2.7 3.8.2021
- adds ability to recognise time blocks of form `at 5-5:30pm` alongside the others
- adds ability to ignore misleading time-only time blocks in lines containing `@done(YYYY-MM-DD HH:MM)`

### v0.2.6 1.8.2021
- adds ability to customise the addMatchingEvents lines with template strings, not just prepended string
- fixed issue with running list today's events, due to change in configuration mechanism

### v0.2.4 30.07.2021 @dwertheimer
- (bump) Minor tweak to use template replacement from helperFunctions.js

### v0.2.3, 28.7.2021
- adds ability to pass a parameter to the `{{listTodaysEvents()}}` template command to customise how to present the list of today's events. See 'Using Event Lists from a Template' in the README.

### v0.2.2, 13.7.2021
- add: ability to add `[[event:ID]]` link when creating an event from a time block
- fix: time block parse error (tip off by @nikolaus)

### v0.2.1, 13.7.2021
- refactor to allow to be called from Daily Note Template as either:
  -  `{{listTodaysEvents()}}` or
  -  `{{listMatchingEvents()}}`

### v0.2.0, 12.7.2021
- add: `/add matching events`: adds matching events to today's note
- add: `/insert today's events as list`: insert list of Today's calendar events at cursor

### v0.1.1, 2.7.2021
- first release, with `/timeblock` command, and configuration system