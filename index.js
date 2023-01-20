const cors = require('cors');
const express = require('express');
const fetch = require('node-fetch-commonjs');

const getWeather = require('./getWeather');

const app = express();
// app.set('view engine', 'hbs');
app.use(cors());

const ABSTRACT_API_KEY = '520e9572a104429d96d7bd8e926a734b';

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
