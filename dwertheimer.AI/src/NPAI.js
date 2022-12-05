// @flow

import pluginJson from '../plugin.json'
import { chooseOption, showMessage } from '@helpers/userInput'
import { log, logDebug, logError, logWarn, clo, JSP, timer } from '@helpers/dev'

const baseURL = 'https://api.openai.com/v1'
const modelsComponent = 'models'
const imagesGenerationComponent = 'images/generations'
// const completionsComponent = 'completions'

/**
 * Format a Fetch request object for the OpenAI API, including the Authorization header and the contents of the post if any
 * @param {string} method - GET, POST, PUT, DELETE
 * @param {string} body - JSON string to send with POST or PUT
 * @returns
 */
export const getRequestObj = (method: string = 'GET', body: any = null): any => {
  const { apiKey } = DataStore.settings
  if (apiKey.length) {
    const obj = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    }
    if (body && method !== 'GET') {
      // $FlowFixMe
      obj.body = JSON.stringify(body)
    }
    clo(obj, 'getRequestObj returning:')
    return obj
  } else {
    showMessage('Please set your API key in the plugin settings')
    logError(pluginJson, 'No API Key found')
  }
}

/**
 * Make a request to the GPT API
 * @param {string} component - the last part of the URL (after the base URL), e.g. "models" or "images/generations"
 * @param {string} requestType - GET, POST, PUT, etc.
 * @param {string} data - body of a POST/PUT request - can be an object (it will get stringified)
 * @returns {any|null} JSON results or null
 */
export async function makeRequest(component: string, requestType: string = 'GET', data: any = null): any | null {
  const url = `${baseURL}/${component}`
  logDebug(pluginJson, `makeRequest: about to fetch ${url}`)
  const result = await fetch(url, getRequestObj(requestType, data))
  if (result) {
    clo(result, `makeRequest() result of fetch to: "${url}"`)
    const resultJSON = JSON.parse(result)
    if (resultJSON) {
      return resultJSON
    } else if (resultJSON.error) {
      logError(pluginJson, `makeRequest received error: ${JSP(resultJSON.error)}`)
      await showMessage(`GPT API Returned Error: ${resultJSON.error.message}`)
    }
    return null
  } else {
    // must have failed, let's find out why
    fetch(url, getRequestObj(requestType, data))
      .then((result) => {
        logError(pluginJson, `makeRequest failed the first time but the second response was: ${JSP(result)}`)
      })
      .catch((error) => {
        logError(pluginJson, `makeRequest failed and response was: ${JSP(error)}`)
        showMessage(`Fetch failed: ${JSP(error)}`)
      })
  }
  return null
}

/**
 * Get the model list from OpenAI and ask the user to choose one
 * @returns {string|null} the model ID chosen
 */
export async function chooseModel(): Promise<string | null> {
  const models = (await makeRequest(modelsComponent))?.data
  if (models) {
    const modelOptions = models.map((model) => ({ label: model.id, value: model.id }))
    return await chooseOption('Choose a model', modelOptions)
  } else {
    logError(pluginJson, 'No models found')
  }
  return null
}

/**
 * Ask for a prompt and n results from user
 * @returns { prompt: string, n: number }
 */
export async function getPromptAndNumberOfResults(promptIn: string | null = null, nIn: number | null = null): Promise<{ prompt: string, n: number }> {
  const prompt = promptIn ?? (await CommandBar.showInput('Enter a prompt', 'Search for %@'))
  const n = nIn ?? (await CommandBar.showInput('Enter the number of results to generate', 'Ask for %@ results'))
  return { prompt, n: parseInt(n) }
}

/**
 * Create a request object for DALL-E image request
 * https://beta.openai.com/docs/api-reference/images/create
 * @param {string} prompt - A text description of the desired image(s). The maximum length is 1000 characters.
 * @param {number} numberOfResults - The number of images to generate. Must be between 1 and 10
 * @param {string} size - The size of the generated images. Must be one of 256x256, 512x512, or 1024x1024.
 * @param {string} response_format - The format in which the generated images are returned. Must be one of url or b64_json
 * @param {string} user - A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse.
 */
export function createImageRequestBody(prompt: string, n: number = 10, size: string = '1024x1024', response_format: string = 'url', user: string | null = null): any {
  const obj = { prompt, n, size, response_format }
  // $FlowIgnore
  if (user) obj.user = user
  return obj
}

/**
 * test connection to GPT API by getting models list and making a request for an image
 * Plugin entrypoint for command: "/COMMAND"
 * @param {*} incoming
 */
export async function testConnection(model: string | null = null) {
  try {
    logDebug(pluginJson, `testConnection running with model:${String(model)}`)

    let chosenModel = model
    // get models/engines (to choose pricing/capability)
    if (!model) {
      chosenModel = await chooseModel()
    }
    if (chosenModel) {
      clo(chosenModel, 'testConnection chosenModel')
    } else {
      logWarn(pluginJson, 'No model chosen')
    }
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

/**
 * test connection to GPT API by getting models list and making a request for an image
 * Plugin entrypoint for command: "/COMMAND"
 * @param {*} incoming
 */
export async function createAIImages(
  promptIn: string | null = null,
  nIn: number | null = null,
  sizeIn: string = '1024x1024',
  response_formatIn: string = 'url',
  userIn: string = '',
) {
  try {
    logDebug(pluginJson, `createImages running with prompt:${String(promptIn)} ${String(nIn)} ${sizeIn} ${response_formatIn} ${userIn}`)

    // get an image
    const start = new Date()
    const { prompt, n } = await getPromptAndNumberOfResults(promptIn, nIn)
    const request = (await makeRequest(imagesGenerationComponent, 'POST', createImageRequestBody(prompt, n, sizeIn, response_formatIn)))?.data
    const elapsed = timer(start)
    clo(request, `testConnection imageRequest result`)
    if (request) {
      const msg = `Call to DALL-E took ${elapsed}. ${request.length} results for "${prompt}":`
      Editor.insertTextAtCursor(msg)
      request.forEach((r, i) => Editor.insertTextAtCursor(`[Result${i}](${r.url})`))
    }
  } catch (error) {
    logError(pluginJson, JSP(error))
  }
}

// export async function getCompletions(promptIn: string | null = null, nIn: number = 10, modelIn: string | null = null, userIn: string = '') {
//   try {
//     logDebug(pluginJson, `getCompletions running with prompt:${String(promptIn)} ${String(nIn)} ${String(modelIn)} ${userIn}`)

//     const start = new Date()
//     const { prompt, n } = await getPromptAndNumberOfResults(promptIn, nIn)
//     const request = await makeRequest(completionsComponent, 'POST', createImageRequestBody(prompt, n, sizeIn))
//     const time = timer(start)
//     clo(request, `testConnection imageRequest result`)
//     if (request) {
//       const msg = `Call to DALL-E took ${time}. ${request.length} results for "${prompt}":`
//       Editor.insertTextAtCursor(msg)
//       request.forEach((r, i) => Editor.insertTextAtCursor(`[Result${i}](${r.url})`))
//     }
//   } catch (error) {
//     logError(pluginJson, JSP(error))
//   }
// }
