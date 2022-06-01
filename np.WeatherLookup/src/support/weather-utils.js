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
      const { description, main } = weather
      const icon = getWeatherIcon(description)
      const { min, max } = temp
      const { day, night } = feels_like //day/night = feels like
      const date = new Date(dy.dt * 1000).toDateString()
      return { sunrise, sunset, temp, uvi, humidity, feels_like, description, main, icon, min, max, day, night, date }
    })
  } else {
    logError(pluginJson, `extractDailyForecastData: No weather data to extract for ${JSP(weather)}`)
  }
  return dailyForecast
}

export const getWeatherIcon = (description) => {
  const weatherDescText = [
    'showers',
    'rain',
    'sunny intervals',
    'partly sunny',
    'sunny',
    'clear sky',
    'cloud',
    'snow ',
    'thunderstorm',
    'tornado',
  ]
  const weatherDescIcons = ['🌦️', '🌧️', '🌤', '⛅', '☀️', '☀️', '☁️', '🌨️', '⛈', '🌪']
  let weatherIcon = ''
  for (let i = 0; i < weatherDescText.length; i++) {
    if (description.match(weatherDescText[i])) {
      weatherIcon = weatherDescIcons[i]
      break
    }
  }
  if (weatherIcon === '') {
    logError(pluginJson, `****** getWeatherIcon: No weather icon found for ${description}`)
  }
  return weatherIcon
}

export const getWeatherDescLine = (weather: { [string]: any }, unitsParam: string) => {
  const units = unitsParam === 'metric' ? 'C' : 'F'
  const { sunrise, sunset, temp, uvi, humidity, feels_like, description, main, icon, min, max, day, night, date } =
    weather
  return `${date}: ${icon} ${description} ${Math.floor(min)}°${units} - ${Math.floor(max)}°${units}`
}
