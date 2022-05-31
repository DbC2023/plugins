/*
https://openweathermap.org/api URLs:
https://api.openweathermap.org/data/3.0/onecall?lat={lat}&lon={lon}&exclude={part}&appid={API key}
http://api.openweathermap.org/geo/1.0/direct?q={city name},{state code},{country code}&limit={limit}&appid={API key}
*/
import { log, logError, clo, JSP, timer } from '@helpers/dev'

const weatherURLBase = `https://api.openweathermap.org/data/3.0/onecall?`

export const isWeatherKeyValid = (key) => key !== null && /[a-f0-9]{32}/.test(key)
