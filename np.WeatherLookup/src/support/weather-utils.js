/*
https://openweathermap.org/api URLs:
https://api.openweathermap.org/data/3.0/onecall?lat={lat}&lon={lon}&exclude={part}&appid={API key}
http://api.openweathermap.org/geo/1.0/direct?q={city name},{state code},{country code}&limit={limit}&appid={API key}
*/
import { log, logError, clo, JSP, timer } from '@helpers/dev'

export const isWeatherKeyValid = (key) => key !== null && /[a-f0-9]{32}/.test(key)

export const getWeatherURLLatLong = (lat, lon, appid, units) =>
  `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${appid}&units=${units}`
// NOTE: There is a version 3.0, but it sends back a 401 error

export const extractDailyForecastData = (weather: { [string]: any }) => {
  let dailyForecast = []
  if (weather && weather.daily?.length > 0) {
    dailyForecast = weather.daily.map((dy) => {
      const { sunrise, sunset, temp, uvi, humidity, feels_like } = dy
      const weather = dy.weather[0]
      const { description, main, icon } = weather
      const { min, max } = temp
      const { day, night } = feels_like //day/night = feels like
      return { sunrise, sunset, temp, uvi, humidity, feels_like, description, main, icon, min, max, day, night }
    })
  } else {
    logError(pluginJson, `extractDailyForecastData: No weather data to extract for ${JSP(weather)}`)
  }
  return dailyForecast
}
