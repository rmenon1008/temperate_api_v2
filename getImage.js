const unsplashCreateApi = require('unsplash-js').createApi;
const fetch = require('node-fetch-commonjs');
const colorThief = require('color-thief-node');
const convert = require('color-convert');
const Jimp = require('jimp');

const unsplash = unsplashCreateApi({
    accessKey: 'tXFLxzt5UxuMgj5_60nkd4WuOuhsYHHZqIpPj3TtaXk',
    fetch: fetch,
});

const COLLECTION_MAP = {
    'aerial': { code: '1166960', title: "Aerial", description: "" },
    'mountains': { code: 'jv5Ha3-e9cM', title: "Mountains", description: "" },
    'plants': { code: '961484', title: "Plants", description: "" },
    'architecture': { code: '761929', title: "Architecture", description: "" },
    'space': { code: '4332580', title: "Space", description: "" },
    'ocean-life': { code: '8527448', title: "Ocean life", description: "" },
    'attractions': { code: '4724911', title: "Attractions", description: "" },
}

const collections = {};

const updateAllCollections = async () => {
    console.log("Updating all collections");
    initCollections(3);
    await Promise.all(Object.keys(collections).map(async (key) => {
        await updateSingleCollection(collections[key]);
    }));
}

const initCollections = (duplicates) => {
    console.log("Initializing collections (" + duplicates + "x)")
    for (const key in COLLECTION_MAP) {
        for (let i = 0; i < duplicates + 1; i++) {
            const newKey = key + (i > 1 ? "_" + i : "");
            collections[newKey] = JSON.parse(JSON.stringify(COLLECTION_MAP[key]));
        }
    }
}

const updateSingleCollection = async (collection) => {
    console.log("Updating collection: " + collection.title);
    await unsplash.photos.getRandom({
        count: 1,
        collections: collection.code,
        content_filter: 'high',
    }).then(json => {
        const res = json.response[0]
        collection.url = res.urls.raw + '&fm=jpg&fit=crop&w=2560&q=80';
        collection.credit = res.user.name;
        collection.profile = res.user.links.html + "?utm_source=Temperate&utm_medium=referral";
        collection.count = 0;
    }).catch(err => {
        console.log('Error getting photos from API:');
        console.log(err);
    })

    const smallImageUrl = collection.url.replace('w=2560', 'w=19&h=11');
    const colors = await getBestColors(smallImageUrl);

    collection.color = "#" + convert.rgb.hex(colors.sharper);
    collection.primaryColor = "#" + convert.rgb.hex(colors.main);
    collection.bgColor = "#" + convert.rgb.hex(colors.background);
}

const getBestColors = async (url) => {
    const candidateColors = addColorVariants(await colorThief.getPaletteFromURL(url, 5));
    const pixels = await getPixelArrayFromURL(url, startRow=5, endRow=Infinity, startCol=0, endCol=9);

    let colorContrastsMain = {};
    for (color in candidateColors) {
        colorContrastsMain[color] = 0;
        for (pixel in pixels) {
            const contrast = getContrast(candidateColors[color], pixels[pixel]);
            colorContrastsMain[color] += contrast;
        }
    }
    const bestMainIndex = Object.keys(colorContrastsMain).reduce((a, b) => colorContrastsMain[a] > colorContrastsMain[b] ? a : b);
    const bestMain = candidateColors[bestMainIndex];

    let colorContrastsBackground = {};
    for (color in candidateColors) {
        colorContrastsBackground[color] = getContrast(candidateColors[color], bestMain);
    }
    const bestBackgroundIndex = Object.keys(colorContrastsBackground).reduce((a, b) => colorContrastsBackground[a] > colorContrastsBackground[b] ? a : b);
    const bestBackground = candidateColors[bestBackgroundIndex];
    
    const brightened = lighten(bestMain, 15, 97);
    const darkened = darken(bestMain, 15, 10);
    const bestSharper = getContrast(brightened, bestBackground) > getContrast(darkened, bestBackground) ? brightened : darkened;

    return {
        main: bestMain,
        background: bestBackground,
        sharper: bestSharper,
    }
}

const getPixelArrayFromURL = async (url, startRow=0, endRow=Infinity, startCol=0, endCol=Infinity) => {
    const image = await Jimp.read(url);
    const pixels = [];

    for (let x = startCol; x < Math.min(image.bitmap.width, endCol); x++) {
        for (let y = startRow; y < Math.min(image.bitmap.height, endRow); y++) {
            const pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
            pixels.push([pixel.r, pixel.g, pixel.b]);
        }
    }

    return pixels;
}

const addColorVariants = (colors) => {
    const newColors = [];
    for (const color of colors) {
        newColors.push(color);
        newColors.push(lighten(color));
        newColors.push(darken(color));
    }
    return newColors;
}

function lighten(color, amount = 7, max = 95) {
    let HSL = convert.rgb.hsl(color);
    HSL[2] = Math.min(max, HSL[2] + amount);
    return convert.hsl.rgb(HSL);
}

function darken(color, amount = 7, min = 18) {
    let HSL = convert.rgb.hsl(color);
    HSL[2] = Math.max(min, HSL[2] - amount);
    return convert.hsl.rgb(HSL);
}

function getContrast(color1, color2) {
    // Using the WCAG 2.0 relative luminance formula
    // https://www.w3.org/TR/WCAG20/#relativeluminancedef

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);

    if (lum1 > lum2) {
        return (lum1 + 0.05) / (lum2 + 0.05);
    }
    return (lum2 + 0.05) / (lum1 + 0.05);
}

function getLuminance(color) {
    const rgb = color.map((val) => {
        val /= 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

module.exports = {
    updateAllCollections,
    updateSingleCollection,
    imageCollections: collections,
}