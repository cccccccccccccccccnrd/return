const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const fetch = require('node-fetch')
const quadkey = require('quadkey')

const locations = [{
  name: 'amazon-bts2',
  area: [
    [48.280767416357835, 17.706282345710502],
    [48.27484701999053, 17.715573500060143]
  ]
}, {
  name: 'ceva-logistics',
  area: [
    [52.351921285404266, 16.79570695461055],
    [52.34631744573774, 16.804974611555108]
  ]
}, {
  name: 'dhl-eifeltor',
  area: [
    [50.88785527526279, 6.918926271128426],
    [50.88263490079002, 6.928267012916798]
  ]
}]
const zoom = 19

function tileToLng (x) {
  return (x / Math.pow(2, zoom) * 360 - 180)
}

function tileToLat (y) {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom)
  return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))))
}

function latToTile (lat) {
  return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)))
}

function lngToTile (lng) {
  return (Math.floor((lng + 180) / 360 * Math.pow(2, zoom)))
}

function divide (array, cap) {
  return Array(Math.ceil(array.length / cap)).fill().map((e, i) => array.slice(i * cap, i * cap + cap))
}

function getCoordinates (area) {
  const north = latToTile(area[0][0])
  const east = lngToTile(area[1][1])
  const south = latToTile(area[1][0])
  const west = lngToTile(area[0][1])
  const width = Math.abs(west - east) + 1
  const height = Math.abs(north - south) + 1

  return {
    width,
    height,
    latlngs: Array(width).fill('0').map((e, wi) => {
      return Array(height).fill('0').map((e, hi) => {
        return {
          lat: tileToLat(north + wi),
          lng: tileToLng(west + hi)
        }
      })
    }).flat()
  }
}

async function save (location, latlngs) {
  const folder = path.join(__dirname, `locations/${location.name}`)
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder)
  }
  
  await Promise.all(latlngs.map(async (point, index) => {
    await new Promise((resolve) => setTimeout(async () => {
      const quad = quadkey.toQuaKey(point.lat, point.lng, zoom)
      const response = await fetch(`https://t.ssl.ak.dynamic.tiles.virtualearth.net/comp/ch/${quad}?mkt=en&it=A&og=1955&n=z`)
      response.body.pipe(fs.createWriteStream(`${folder}/${index}.png`))
      console.log(location.name, index, quad)
      return resolve()
    }, 200 * index))
  }))
}

async function connect (location, width, height) {
  const folder = path.join(__dirname, `locations/${location.name}`)
  const tiles = fs.readdirSync(folder).filter((name => name.endsWith('.png'))).sort((a, b) => a.match(/\d+/)[0] - b.match(/\d+/)[0])
  const images = divide(tiles.map((file) => `${folder}/${file}`), height)

  fs.writeFileSync(`${folder}/images.json`, JSON.stringify(images))
  spawn('python3', [path.join(__dirname, 'connect.py'), location.name])
}

function init () {
  locations.forEach(async (location) => {
    const coordinates = getCoordinates(location.area)
    await save(location, coordinates.latlngs)
    await connect(location, coordinates.width, coordinates.height)
  })
}

init()