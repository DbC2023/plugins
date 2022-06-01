// @flow

import * as utils from './support/weather-utils'
import { log, logError, clo, JSP } from '@helpers/dev'
import { createRunPluginCallbackUrl, createPrettyRunPluginLink } from '@helpers/general'
import { chooseOption, getInput, showMessage } from '@helpers/userInput'
import pluginJson from '../plugin.json'

type WeatherParams = {
  appid: string,
  lat: ?string,
  lon: ?string,
  units: ?string,
}

type LocationOption = {
  lat: string,
  lon: string,
  name: string,
  country: string,
  state: string,
  label: string,
  value: string,
}

async function getLatLongForLocation(searchLocationStr: string = ''): Promise<LocationOption | null> {
  if (searchLocationStr?.length > 0) {
    const params = DataStore.settings
    const results = await getLatLongListForName(searchLocationStr, params)
    if (results && results.length > 0) {
      log(pluginJson, `Results: ${results?.length}`)
      const options = results.map((r, i) => ({
        lat: r.lat,
        lon: r.lon,
        name: r.name,
        country: r.country,
        state: r.state,
        label: `${r.name}, ${r.state}, ${r.country}`,
        value: i,
      }))
      clo(options, 'options')
      let chosenIndex = 0
      if (options.length > 1) {
        // ask user which one they wanted
        chosenIndex = await chooseOption(`Which of these?`, options, 0)
      }
      const location = options[chosenIndex]
      clo(location, `chosen location:`)
      return location
    } else {
      await showMessage(`No results found for "${searchLocationStr}"`)
      logError(pluginJson, `getLatLongForLocation: No results found for ${searchLocationStr}`)
      return null
    }
  } else {
    logError(pluginJson, `getLatLongForLocation: No location string to search for ${searchLocationStr}`)
  }
}

/**
 * Call the OpenWeatherMap API to get the weather for a particular location
 * @param {string} name
 * @param {string} params
 * @returns {Promise<Array<{}>} - array of potential locations
 */
export async function getLatLongListForName(name: string, params: WeatherParams): Promise<Array<{ [string]: any }>> {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${name}&appid=${params.appid}&limit=5`
  log(`weather-utils::getLatLongForName`, `url: ${url}`)
  try {
    const response = await fetch(url, { timeout: 3000 })
    if (response) {
      return JSON.parse(response)
    }
  } catch (error) {
    logError(`weather-utils::getLatLongForName`, `error: ${JSP(error)}`)
  }
  return []
}

function validateWeatherParams(params: WeatherParams): boolean {
  if (!params.appid || !utils.isWeatherKeyValid(params.appid)) {
    logError(pluginJson, `Missing appid`)
    return false
  }
  return true
}

/**
 * Get the weather for a lat/long
 * @param {LocationOption} location
 * @param {settings} params
 * @returns
 */
async function getWeatherForLocation(location: LocationOption, params: WeatherParams): Promise<{ [string]: any }> {
  const url = utils.getWeatherURLLatLong(location.lat, location.lon, params.appid, params.units)
  log(`weather-utils::getWeatherForLocation`, `url: \n${url}`)
  try {
    const res = await fetch(url, { timeout: 3000 })
    if (res) {
      let weather = JSON.parse(res)
      clo(weather, `weather:`)
      return weather
    }
  } catch (error) {
    logError(pluginJson, `getWeatherForLocation: error: ${JSP(error)}`)
  }
  return []
}

/*
 *
 * PLUGIN ENTRY POINTS BELOW THIS LINE
 *
 */

/**
 * Get URL for retrieving weather in a particular location
 * (Plugin entry point for /Get weather XCallbackURL)
 */
export async function insertWeatherCallbackURL(incoming: string = ''): Promise<string> {
  try {
    let locationString = incoming
    if (!locationString?.length)
      locationString = await CommandBar.textPrompt('Weather Lookup', 'Enter a location name to lookup weather for:', '')
    log(pluginJson, `insertWeatherCallbackURL: locationString: ${locationString}`)
    if (locationString?.length) {
      const location = await getLatLongForLocation(locationString)
      if (location) {
        let text = ''
        if (locationString.length) {
          text = createPrettyRunPluginLink(
            `${locationString} weather`,
            pluginJson['plugin.id'],
            pluginJson['plugin.commands'][0].name,
            [JSON.stringify(location), 'yes'],
          )
        } else {
          logError(pluginJson, `insertWeatherCallbackURL: No location to look for: "${locationString}"`)
        }
        if (incoming.length) {
          // this must have come from a template call
          return text
        } else {
          Editor.insertTextAtCursor(text)
        }
      }
    }
  } catch (error) {
    logError(pluginJson, `insertWeatherCallbackURL: error: ${JSP(error)}`)
  }
  return ''
}

/**
 * Get weather for a particular location (passed through variable or via user input)
 * (Plugin entry point for /Weather by Location Name)
 * @param {*} incoming
 * @returns
 */
export async function insertWeatherByLocation(incoming: ?string = ''): Promise<void> {
  // every command/plugin entry point should always be wrapped in a try/catch block
  try {
    const { appid } = DataStore.settings // appid is the Weather API key
    if (!appid || appid.length === 0) {
      logError('You must set a weather lookup key in the settings')
      Editor.appendParagraph(
        "This plugin requires a (free) API key for OpenWeatherMap (the weather lookup service). Get an API key here: https://home.openweathermap.org/users/sign_up and then open up this plugin's settings in the control panel and paste the API key.",
        'text',
      )
      return
    } else {
      let location = incoming
      if (location?.length === 0) {
        location = await getInput(`What location do you want to lookup?`)
      }
      if (location) {
        const result = await getLatLongForLocation(location)
      }
    }
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 * Look up weather for a particular location (passed through variable in xcallback or template)
 * @param {string} incoming - the JSON stringified location object to look for ({lat, lon, label})
 * @param {string} showPopup - 'yes' to show the weather text in a popup, 'no' to just return it
 * (Plugin entry point for /Weather by Lat/Long -- hidden -- accessible by xcallback)
 */
export async function weatherByLatLong(incoming: string = '', showPopup: string = 'no'): Promise<string> {
  try {
    if (incoming?.length) {
      const location = JSON.parse(incoming)
      let text = ''
      if (location.lat && location.lon) {
        log(pluginJson, `weatherByLatLong: have lat/lon for ${location.label}`)
        const weather = await getWeatherForLocation(location, DataStore.settings)
        const dfd = utils.extractDailyForecastData(weather)
        clo(dfd, `dfd:`)
      }
      if (showPopup && showPopup == 'yes' && text.length) {
        Editor.insertTextAtCursor(text)
      } else {
        return text
      }
    } else {
      logError(pluginJson, `weatherByLatLong: No location to look for; param was: "${incoming}"`)
    }
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
  return ''
}
