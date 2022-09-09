// @flow

const pluginJson = '../plugin.json'
import { getThemeChoice } from './NPThemeChooser'
import * as masterTheme from './support/masterTheme.json'
import { chooseOption, showMessageYesNo, showMessage } from '@helpers/userInput'
import { log, logError, logDebug, timer, clo, JSP } from '@helpers/dev'

/**
 * Choose a style from the master style template (in this plugin in /src/support/masterTheme.json)
 * Plugin entrypoint for command: "/Add a Style to Current Theme"
 */
export async function chooseStyle() {
  try {
    // clo(masterTheme, `NPStyleChooser::chooseStyle masterTheme=`) //if you want to console.log the whole theme file
    const { styles } = masterTheme // pluck just the styles property from the theme file
    const keys = Object.keys(styles)
    // @QualitativeEasing: Add a description to each key in the masterTheme
    const optionText = keys.map((k) => ({ label: `${k}${styles[k].description ? ` (${styles[k].description})` : ''}`, value: k }))
    const chosenStyle = await chooseOption(`Choose a Style`, optionText, '')
    if (chosenStyle !== '') {
      const allThemes = Editor.availableThemes
      const myThemeName = await getThemeChoice('', `What theme do you want to add it to?`)
      logDebug(pluginJson, `User chose theme: "${myThemeName}`)
      const myThemeObj = allThemes.filter((t) => t.name === myThemeName)[0]
      // Editor.availableThemes sends back the themes wrapped in an object with extra data (.name && .filename)
      // so to get the actual theme file data, we look under the .values property
      const myThemeObjStyles = myThemeObj.values.styles
      clo(myThemeObj, `NPStyleChooser::chooseStyle myThemeObj=`)
      let writeIt = true
      if (myThemeObjStyles.hasOwnProperty('chosenStyle')) {
        const replace = await showMessageYesNo(`The key "${chosenStyle}" already exists in theme: "${myThemeName}". Replace it?`)
        if (replace && replace === 'yes') {
          myThemeObjStyles[chosenStyle] = styles[chosenStyle]
        } else {
          writeIt = false
        }
      } else {
        myThemeObj.values.styles = { ...myThemeObjStyles, ...styles[chosenStyle] }
      }
      if (writeIt) {
        // save out the revised theme
        const result = DataStore.saveJSON(myThemeObj.values, `../../../Themes/${myThemeObj.filename}`)
        if (!result) {
          await showMessage(`Could not add style ${chosenStyle} to theme: ${myThemeObj.filename}`)
        }
      }
    }
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}
