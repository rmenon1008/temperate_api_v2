const fetch = require('node-fetch-commonjs');

const WEATHER_TTL_MS = 30 * 60000
const WEATHER_CLOSE_DISTANCE = 3

const PIRATE_API_KEY = 'FVnljLZ86C6OP4bHRvsEC2HpHY2bHBku19EPD2vD';

const cachedWeather = []

function convertToOldFormat(newFormat) {
    try {
        let oldFormat = {
            location: {
                lat: newFormat.latitude,
                lon: newFormat.longitude,
                tz_id: newFormat.timezone,
                localtime_epoch: newFormat.currently.time
            },
            current: {
                last_updated_epoch: newFormat.currently.time,
                temp_c: newFormat.currently.temperature,
                condition: {
                    text: newFormat.currently.summary
                },
                feelslike_c: newFormat.currently.apparentTemperature
            },
            forecast: {
                forecastday: [
                    {
                        astro: {
                            sunrise: newFormat.daily.data[0].sunriseTime,
                            sunset: newFormat.daily.data[0].sunsetTime
                        },
                        hour: []
                    }
                ]
            }
        };

        for (let i = 0; i < newFormat.hourly.data.length; i++) {
            oldFormat.forecast.forecastday[0].hour.push({
                time_epoch: newFormat.hourly.data[i].time,
                temp_c: newFormat.hourly.data[i].temperature,
                feelslike_c: newFormat.hourly.data[i].apparentTemperature,
                chance_of_rain: newFormat.hourly.data[i].precipProbability,
                chance_of_snow: 0
            });
        }

        return oldFormat;
    } catch (error) {
        console.log(error);
    }
}

const areLocationsClose = (l1, l2) => {
    dist = 6378.0 * Math.acos(Math.sin(l1.lat) * Math.sin(l2.lat)
        + Math.cos(l1.lat) * Math.cos(l2.lat) * Math.cos(l2.lon - l1.lon));
    return dist < WEATHER_CLOSE_DISTANCE;
}

const getWeather = async (lat, lon) => {
    for (let i = 0; i < cachedWeather.length; i++) {
        const cached = cachedWeather[i];
        if (areLocationsClose(cached.location, { lat: lat, lon: lon })) {
            if (cached.timeout > Date.now()) {
                console.log("Using cached weather");
                return cached.weather;
            } else {
                console.log("Cached weather expired");
                cachedWeather.splice(i, 1);
                break;
            }
        }
    }

    const weatherQueryURL = `https://api.pirateweather.net/forecast/${PIRATE_API_KEY}/${lat},${lon}?&units=si`;
    const data = await fetch(weatherQueryURL);
    const weather = convertToOldFormat(await data.json());
    cachedWeather.push({
        location: { lat: lat, lon: lon },
        timeout: Date.now() + WEATHER_TTL_MS,
        weather: weather,
    });
    return weather;
}

module.exports = getWeather;
