import fetch from 'node-fetch';
import { createApi } from 'unsplash-js';
import schedule from 'node-schedule'
import cors from 'cors';
import { getPaletteFromURL, getColorFromURL } from 'color-thief-node';
import express from 'express';
import { getAverageColor } from 'fast-average-color-node';
import fs from 'fs';
import convert from 'color-convert';
import hbs from 'hbs';
import path from 'path';
import { fileURLToPath } from 'url';
var app = express();

const unsplash = createApi({
    accessKey: 'tXFLxzt5UxuMgj5_60nkd4WuOuhsYHHZqIpPj3TtaXk',
    fetch: fetch,
});

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

var collections = {
    'aerial': { code: 'agh4f_CE_Ng', title: "Aerial", description: "Images of earth taken from above", count: 0 },
    'mountains': { code: '401930', title: "Mountains", description: "The best views of the world", count: 0 },
    'plants': { code: '5060893', title: "Plants", description: "Soothing leafy greens", count: 0 },
    'architecture': { code: '3348849', title: "Architecture", description: "Beautiful buildings photographed", count: 0 },
    'space': { code: '-kijxEFCtEQ', title: "Space", description: "Looking to the skies", count: 0 },
    'ocean-life': { code: '8527448', title: "Oceans", description: "Landscapes and wildlife from the deep blue", count: 0 },
    'attractions': { code: '69748172', title: "Attractions", description: "World famous destinations", count: 0 },

    'aerial_2': { code: 'agh4f_CE_Ng', title: "Aerial", description: "Images of earth taken from above", count: 0 },
    'mountains_2': { code: '401930', title: "Mountains", description: "The best views of the world", count: 0 },
    'plants_2': { code: '5060893', title: "Plants", description: "Soothing leafy greens", count: 0 },
    'architecture_2': { code: '3348849', title: "Architecture", description: "Beautiful buildings photographed", count: 0 },
    'space_2': { code: '-kijxEFCtEQ', title: "Space", description: "Looking to the skies", count: 0 },
    'ocean-life_2': { code: '8527448', title: "Oceans", description: "Landscapes and wildlife from the deep blue", count: 0 },
    'attractions_2': { code: '69748172', title: "Attractions", description: "World famous destinations", count: 0 },

    'aerial_3': { code: 'agh4f_CE_Ng', title: "Aerial", description: "Images of earth taken from above", count: 0 },
    'mountains_3': { code: '401930', title: "Mountains", description: "The best views of the world", count: 0 },
    'plants_3': { code: '5060893', title: "Plants", description: "Soothing leafy greens", count: 0 },
    'architecture_3': { code: '3348849', title: "Architecture", description: "Beautiful buildings photographed", count: 0 },
    'space_3': { code: '-kijxEFCtEQ', title: "Space", description: "Looking to the skies", count: 0 },
    'ocean-life_3': { code: '8527448', title: "Oceans", description: "Landscapes and wildlife from the deep blue", count: 0 },
    'attractions_3': { code: '69748172', title: "Attractions", description: "World famous destinations", count: 0 },
}

var collectionsAlt = []
const NUM_ALTERNATIVES = 2;

// Runs every day at midnight (PST)

schedule.scheduleJob('0 3 * * *', () => {
    updatePhotos();
});
updatePhotos();

function updatePhotos() {
    console.log('Getting new daily photos');

    const keys = Object.keys(collections);
    for (var i = 0; i < keys.length; i++) {
        var collection = collections[keys[i]];
        updateSingle(collection);
    }

}

async function updateSingle(collection) {
    // console.log('Getting photo for ' + collection.name);
    await unsplash.photos.getRandom({
        count: 1,
        collections: collection.code,
        content_filter: 'high',
    }).then(json => {
        // Get the photo url
        var res = json.response[0]
        collection.url = res.urls.raw + '&fm=jpg&fit=crop&w=2560&q=80&fit=max'; //url
        collection.credit = res.user.name; //name
        collection.profile = res.user.links.html + "?utm_source=Temperate&utm_medium=referral";  //profile
    }).catch(err => {
        console.log('Error getting photos from API:');
        console.log(err);
    });
    // console.log(collection.url)
    // console.log('Trying to find the best color for the image');
    const colors = await getBestColor(collection.url.replace("&fm=jpg&fit=crop&w=2560&q=80&fit=max", "&fm=jpg&fit=crop&w=192&h=108&q=80"));
    collection.color = colors.primary;
    collection.primaryColor = colors.primaryLighter;
    collection.bgColor = colors.background;
}

async function getBestColor(url) {
    // Download the image and store in tmp folder
    var filename = 'tmp/' + Math.random().toString(36).substring(7) + '.jpg';
    var file = fs.createWriteStream(filename);
    var request = await fetch(url);
    await request.body.pipe(file);
    await file.on('finish', () => {
        file.close();
    });

    // Get the prominant colors from the image
    var colorPalette = await getPaletteFromURL(url, 5);
    for (var i = 0; i < 5; i++) {
        colorPalette.push(lighten(colorPalette[i]));
        colorPalette.push(darken(colorPalette[i]));
    }

    var bestColor = [0, 0, 0];
    var bestContrast = 0;

    const TempBg = await colorArea(filename, 0, 0.5, 0.5, 1)

    for (var i = 0; i < colorPalette.length; i++) {
        var contrast = await getContrastsArr(TempBg, colorPalette[i]);

        if (Math.abs(contrast) > Math.abs(bestContrast)) {
            bestContrast = contrast;
            bestColor = colorPalette[i];
        }

    }
    // Delete the tmp file when we're done with it
    fs.unlinkSync(filename);
    bestColor = capSaturation(bestColor);
    var bgColor = getBgColor(bestColor, colorPalette);
    const primary = "#" + convert.rgb.hex(bestColor);
    const background = "#" + convert.rgb.hex(bgColor);
    const primaryLighter = "#" + convert.rgb.hex(getLightestPrimary(bestColor, bgColor));
    console.log("Found color " + primary + "! with contrast " + bestContrast);
    return { primary, background, primaryLighter };
}

function getBgColor(primary, palette) {
    var bgColor = [0, 0, 0];
    var bestContrast = 0;
    for (var i = 0; i < palette.length; i++) {
        var contrast = getContrast(primary, palette[i]);
        if (Math.abs(contrast) > Math.abs(bestContrast)) {
            bestContrast = contrast;
            bgColor = palette[i];
        }
    }
    return bgColor;
}

function getContrast(c1, c2) {
    return Math.abs(getLum(c1) - getLum(c2));
}

function getContrastsArr(bgArray, color) {
    let contrast = 0;
    for (var i = 0; i < bgArray.length; i++) {
        contrast += Math.abs(getLum(bgArray[i]) - getLum(color)) ** 2;
    }
    return contrast;
}


function capSaturation(color) {
    var HSL = convert.rgb.hsl(color);
    HSL[1] = Math.min(75, HSL[1]);
    return convert.hsl.rgb(HSL);
}

function getLightestPrimary(primary, background) {
    const brightened = lighten(primary, 15, 97);
    const darkened = darken(primary, 15, 10);
    if (getContrast(brightened, background) > getContrast(darkened, background)) {
        return brightened;
    } else {
        return darkened;
    }
}

function lighten(color, amount = 10, max = 95) {
    var HSL = convert.rgb.hsl(color);
    HSL[2] = Math.min(max, HSL[2] + amount);
    return convert.hsl.rgb(HSL);
}

function darken(color, amount = 10, min = 18) {
    var HSL = convert.rgb.hsl(color);
    HSL[2] = Math.max(min, HSL[2] - amount);
    return convert.hsl.rgb(HSL);
}

async function colorArea(filename, left, right, top, bottom) {
    const width = 192;
    const height = 108;

    // console.log("width: " + width + " height: " + height);

    left = Math.floor(left * width);
    right = Math.floor(right * width);
    top = Math.floor(top * height);
    bottom = Math.floor(bottom * height);

    const dx = Math.floor(width / 40);
    const dy = Math.floor(height / 40);

    var colorArray = [];
    for (var x = left; x < right - dx; x += dx) {
        for (var y = top; y < bottom - dy; y += dy) {
            const color = await getAverageColor(filename, {
                left: x,
                top: y,
                width: dx,
                height: dy,
            });
            colorArray.push(color.value);
        }
    }
    return colorArray;
}

function aveColor(c1, c2) {
    var r = (c1[0] + c2[0]) / 2;
    var g = (c1[1] + c2[1]) / 2;
    var b = (c1[2] + c2[2]) / 2;
    return [r, g, b];
}

function getLum(color) {
    var R = color[0];
    var G = color[1];
    var B = color[2];
    var L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    return L;
}

app.get("/image/:category", (req, res, next) => {
    try {
        var cat = req.params.category;
        var collection = collections[cat];

        collection.count += 1;

        var data = {
            "url": collection.url,
            "color": collection.color,
            "primaryColor": collection.primaryColor,
            "bgColor": collection.bgColor,
            "credit": collection.credit,
            "profile": collection.profile,
        }
        res.json(data);
    } catch (err) {
        next(err);
    }
});

app.get("/image/:category/:offset", (req, res, next) => {
    try {
        var cat = req.params.category;
        var offset = req.params.offset;
        var collection = collectionsAlt[offset][cat];

        // collection.count += 1;

        var data = {
            "url": collection.url,
            "color": collection.color,
            "bgColor": collection.bgColor,
            "credit": collection.credit,
            "profile": collection.profile,
        }
        res.json(data);
    } catch (err) {
        next(err);
    }
});

// app.get("/image", (req, res, next) => {
//     // var keys = Object.keys(collections);
//     // var data = { collections }
//     res.json(collections);
// });

app.get("/image", (req, res, next) => {
    try {
        const keys = Object.keys(collections);
        let modified = {};
        for (let i = 0; i < keys.length; i++) {
            const collection = collections[keys[i]];
            if (!keys[i].includes('_')) {
                modified[keys[i]] = collection;
                modified[keys[i]].name = collection.title + ": " + collection.description;
                modified[keys[i]].preview = 'http://api.rohanmenon.com/static/images/' + keys[i] + '.png';
            }
        }
        res.json(modified);
    } catch (err) {
        next(err);
    }
});

app.get("/imagesAlt", (req, res, next) => {
    try {
        res.json(collectionsAlt);
    } catch (err) {
        next(err);
    }
});

app.get("/imageoptions", (req, res, next) => {
    try {
        const keys = Object.keys(collections);
        let modified = [];
        for (let i = 0; i < keys.length; i++) {
            const collection = collections[keys[i]];
            if (!keys[i].includes('_')) {
                let newOption = {}
                newOption = collection;
                newOption.key = keys[i];
                newOption.name = collection.title + ": " + collection.description;
                newOption.preview = 'http://api.rohanmenon.com/static/images/' + keys[i] + '.png';
                modified.push(newOption);
            }
        }
        res.json(modified);
    } catch (err) {
        next(err);
    }
});

module.exports = app;
