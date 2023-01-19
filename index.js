var cors = require('cors');
var express = require('express');
var fetch = require('node-fetch-commonjs');

var app = express();

app.set('view engine', 'hbs');
app.use(cors());

const PIRATE_API_KEY = 'FVnljLZ86C6OP4bHRvsEC2HpHY2bHBku19EPD2vD';
const ABSTRACT_API_KEY = '520e9572a104429d96d7bd8e926a734b';

const WEATHER_TTL_MS = 30 * 60000
const WEATHER_CLOSE_DISTANCE = 3

const cachedWeather = []

function convertToOldFormat(newFormat) {
    try {
        var oldFormat = {
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

        for (var i = 0; i < newFormat.hourly.data.length; i++) {
            oldFormat.forecast.forecastday[0].hour.push({
                time_epoch: newFormat.hourly.data[i].time,
                temp_c: newFormat.hourly.data[i].temperature,
                feelslike_c: newFormat.hourly.data[i].apparentTemperature,
                chance_of_rain: newFormat.hourly.data[i].precipProbability,
                chance_of_snow: 0
            });
        }
    } catch (error) {
        console.log(error);
    }

    return oldFormat;
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

app.get("/weather/:loc", (req, res, next) => {
    try {
        const lat = req.params.loc.split(',')[0];
        const lon = req.params.loc.split(',')[1];
        getWeather(lat, lon).then(weather => {
            res.json(weather);
        });
    } catch (error) {
        next(error);
    }
});

app.get("/weather", (req, res, next) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        // get the lat and long of the ip
        const geolocationQueryURL = `https://ipgeolocation.abstractapi.com/v1/?api_key=${ABSTRACT_API_KEY}&ip_address=${ip}`;
        fetch(geolocationQueryURL).then(data => {
            data.json().then(json => {
                getWeather(json.latitude, json.longitude).then(weather => {
                    res.json(weather);
                });
            });
        });
    } catch (error) {
        next(error);
    }
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});

module.exports = app;
