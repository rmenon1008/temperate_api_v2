const cors = require('cors');
const express = require('express');
const fetch = require('node-fetch-commonjs');
const path = require('path');
const schedule = require('node-schedule');

const getWeather = require('./getWeather');
const { updateAllCollections, updateSingleCollection, imageCollections } = require('./getImage');

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

app.get("/imageoptions", (req, res, next) => {
    try {
        const keys = Object.keys(imageCollections);
        let modified = [];
        for (let i = 0; i < keys.length; i++) {
            const collection = imageCollections[keys[i]];
            if (!keys[i].includes('_')) {
                let newOption = {}
                newOption = collection;
                newOption.key = keys[i];
                newOption.name = collection.title + ": " + collection.description;
                newOption.preview = 'http://api.rohanmenon.com/static/previews/' + keys[i] + '.png';
                modified.push(newOption);
            }
        }
        res.json(modified);
    } catch (err) {
        next(err);
    }
});


app.get("/image/:category", (req, res, next) => {
    try {
        const collection = imageCollections[req.params.category];
        collection.count += 1;
        res.json(collection);
    } catch (err) {
        next(err);
    }
});

app.use('/static', express.static(path.join(__dirname, 'static')))

app.listen(3000, () => {
    console.log("Server running on port 3000");
});

schedule.scheduleJob('0 3 * * *', () => {
    updateAllCollections();
});
updateAllCollections();

module.exports = app;
