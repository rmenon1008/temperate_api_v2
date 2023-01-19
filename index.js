// import cors from 'cors';
// import express from 'express';

var cors = require('cors');
var express = require('express');
var fetch = require('node-fetch-commonjs');

var app = express();

app.set('view engine', 'hbs');
app.use(cors());

const PIRATE_API_KEY = 'FVnljLZ86C6OP4bHRvsEC2HpHY2bHBku19EPD2vD';
const ABSTRACT_API_KEY = '520e9572a104429d96d7bd8e926a734b';

app.get("/weather/:loc", (req, res, next) => {
    try {
        const loc = req.params.loc;
        const queryURL = `https://api.pirateweather.net/forecast/${PIRATE_API_KEY}/${loc}`;
        fetch(queryURL).then(data => {
            data.json().then(json => {
                res.json(json);
            });
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
                const lat = json.latitude;
                const long = json.longitude;
                
                // get the weather of the lat and long
                const weatherQueryURL = `https://api.pirateweather.net/forecast/${PIRATE_API_KEY}/${lat},${long}`;
                fetch(weatherQueryURL).then(data => {
                    data.json().then(json => {
                        res.json(json);
                    });
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
// export default app;
