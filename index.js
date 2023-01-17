import fetch from 'node-fetch';
import cors from 'cors';
import express from 'express';
var app = express();

app.set('view engine', 'hbs');
app.use(cors());

// Weather API Proxy
const API_KEY = '046da01711fa493ea63214619220602';
app.get("/weather/:ip", (req, res, next) => {
    try {
        var ip = req.params.ip;
        var queryURL = 'http://api.weatherapi.com/v1/forecast.json?key=' + API_KEY + '&q=' + ip + '&days=2';
        fetch(queryURL).then(data => {
            data.json().then(json => {
                var nextDay = json.forecast.forecastday[1].hour;
                var today = json.forecast.forecastday[0].hour.concat(nextDay);
                json.forecast.forecastday[0].hour = today;
                delete json.forecast.forecastday[1];
                res.json(json);
            });
        });
    } catch (error) {
        next(err);
    }
});

app.get("/weather", (req, res, next) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        var queryURL = 'http://api.weatherapi.com/v1/forecast.json?key=' + API_KEY + '&q=' + ip + '&days=2';
        fetch(queryURL).then(data => {
            data.json().then(json => {
                var nextDay = json.forecast.forecastday[1].hour;
                var today = json.forecast.forecastday[0].hour.concat(nextDay);
                json.forecast.forecastday[0].hour = today;
                delete json.forecast.forecastday[1];
                res.json(json);
            });
        });
    } catch (error) {
        next(err);
    }
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});

module.exports = app;
