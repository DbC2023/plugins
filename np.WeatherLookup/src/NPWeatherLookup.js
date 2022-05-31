// @flow

import utils from './support/utils'
import { log, logError, clo, JSP } from '../../helpers/dev'
import { createRunPluginCallbackUrl } from '../../helpers/general'
import pluginJson from '../plugin.json'

export async function insertWeatherByLocation(incoming: ?string = ''): Promise<void> {
  // every command/plugin entry point should always be wrapped in a try/catch block
  try {
    const pluginSettings = DataStore.settings
    const { weatherAPIKey } = pluginSettings
    if (!weatherAPIKey || weatherAPIKey.length === 0) {
      logError('You must set a weather lookup key in the settings')
      Editor.appendParagraph(
        "This plugin requires a (free) API key for OpenWeatherMap (the weather lookup service). Get an API key here: https://home.openweathermap.org/users/sign_up and then open up this plugin's settings in the control panel and paste the API key.",
        'text',
      )
      return
    }
    if (incoming?.length) {
      // if incoming is set, this plugin/command run must have come from a runPlugin call (e.g. clicking on a noteplan:// xcallback link or a template call)
      Editor.appendParagraph(
        `You clicked the link! The message at the end of the link is "${incoming}". Now the rest of the plugin will run just as before...\n\n`,
        'text',
      )
    }

    // a call to a support function in a separate file
    const message = utils.uppercase('Hello World from Test Plugin!')

    log(pluginJson, `The plugin says: ${message}`)

    if (!incoming?.length) {
      // Create a XCallback URL that can run this command
      const url = createRunPluginCallbackUrl(pluginJson['plugin.id'], pluginJson['plugin.commands'][0].name, [
        'This text was in the link!',
      ])
      Editor.insertTextAtCursor(
        `This link could be used anywhere inside or outside of NotePlan to call this plugin:\n${url}\nGo ahead and click it! ^^^\nYou will see the results below:\n\n*****\n`,
      )
    }
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

export async function insertWeatherCallbackURL() {
  const locationString = await CommandBar.textPrompt('Location', 'Enter a location name to lookup weather for:', '')
  const url = createRunPluginCallbackUrl(pluginJson['plugin.id'], pluginJson['plugin.commands'][0].name, [
    String(locationString),
  ])
  Editor.insertTextAtCursor(
    `This link could be used anywhere inside or outside of NotePlan to call this plugin:\n${url}\nGo ahead and click it! ^^^\nYou will see the results below:\n\n*****\n`,
  )
}
