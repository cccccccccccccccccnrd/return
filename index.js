//        ___           ___           ___           ___           ___           ___     
//       /\  \         /\  \         /\  \         /\__\         /\  \         /\__\    
//      /::\  \       /::\  \        \:\  \       /:/  /        /::\  \       /::|  |   
//     /:/\:\  \     /:/\:\  \        \:\  \     /:/  /        /:/\:\  \     /:|:|  |   
//    /::\~\:\  \   /::\~\:\  \       /::\  \   /:/  /  ___   /::\~\:\  \   /:/|:|  |__ 
//   /:/\:\ \:\__\ /:/\:\ \:\__\     /:/\:\__\ /:/__/  /\__\ /:/\:\ \:\__\ /:/ |:| /\__\
//   \/_|::\/:/  / \:\~\:\ \/__/    /:/  \/__/ \:\  \ /:/  / \/_|::\/:/  / \/__|:|/:/  /
//      |:|::/  /   \:\ \:\__\     /:/  /       \:\  /:/  /     |:|::/  /      |:/:/  / 
//      |:|\/__/     \:\ \/__/     \/__/         \:\/:/  /      |:|\/__/       |::/  /  
//      |:|  |        \:\__\                      \::/  /       |:|  |         /:/  /   
//       \|__|         \/__/                       \/__/         \|__|         \/__/    

require('dotenv').config()
const path = require('path')
const fs = require('fs')
const fetch = require('node-fetch')
const express = require('express')
const db = require('monk')(`${ process.env.DB_USER }:${ process.env.DB_PASS }@${ process.env.DB_HOST }/return`, { authSource: 'admin' })
const returns = db.get('returns')
const Telegraf = require('telegraf')
const clustering = require('density-clustering')

db.then(() => {
  console.log('connected to db')
})

const state = {
  lastUpdate: Date.now(),
  devices: {}
}

const devices = [
  'https://www.finder-portal.com/viewmode_116381_ae3a760b73a46b97a4762b0444d59116d113d7bd.html',
  'https://www.finder-portal.com/viewmode_116904_958d0a2f51d61ade24ba4647deee70ae9d482e29.html',
  'https://www.finder-portal.com/viewmode_116376_dfd6e7ebd118eea1412e3e2011423ad4d78ccbef.html',
  'https://www.finder-portal.com/viewmode_141569_280ca18776c4acaefa27865f1cbc0a4a80f501d9.html'
]

const app = express()

app.use('/', express.static(path.join(__dirname, 'return')))
app.use('/first', express.static(path.join(__dirname, 'first')))

app.get('/api', (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify(state, null, 2))
})

app.listen(2224, () => {
  console.log(`serving`)
})

const bot = new Telegraf(process.env.BOT_TOKEN)

bot.hears('/locations', (ctx) => {
  Object.keys(state.devices).forEach((devId) => {
    const speed = state.devices[devId].routes[0].speed
    const lat = state.devices[devId].routes[0].lat
    const lng = state.devices[devId].routes[0].lng

    bot.telegram.sendMessage(process.env.CHAT_ID, `🛰 ${devId} is here (w/ ${speed} km/h)`)
    bot.telegram.sendLocation(process.env.CHAT_ID, lat, lng)
  })
})

bot.startPolling()

async function analyse () {
  await save()
  const data = load('dump.json')
  const ids = Object.keys(data.devices)

  ids.forEach((id, index) => {
    const routes = data.devices[id].routes
    const latlngs = routes.map((point) => [point.lat, point.lng])
    const dbscan = new clustering.DBSCAN()
    const findings = dbscan.run(latlngs, 0.00005, 3)

    const clusters = findings.map((cluster) => latlngs[cluster[Math.floor(cluster.length / 2)]])
    state.devices[id].clusters = clusters
    console.log(`predicted clusters for ${id}`, state.devices[id].clusters.length)
    /* dump(clusters, 'clusters.json') */
  })
}

function load (filename) {
  const data = fs.readFileSync(path.join(__dirname, filename), 'utf8')
  return JSON.parse(data)
}

async function retrieve () {
  return await returns.find({})
}

function dump (payload, filename) {
  fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(payload, null, 2), 'utf8')
}

async function save () {
  const full = await retrieve()
  await dump(full[full.length - 1], 'dump.json')
}

function store () {
  returns.insert(state)
    .then((entries) => {
      console.log('stored')
    })
    .catch((error) => {
      console.log('while storing', error)
    })
}

async function getCookie(url) {
  const response = await fetch(url)
  return response.headers.raw()['set-cookie'][0].split(';')[0]
}

async function getAllRoutes(id, cookie) {
  const body = new URLSearchParams()
  body.append('data', 'allRoutes')
  body.append(`options[${id}]`, '5')

  const response = await fetch('https://www.finder-portal.com/data/endpoints.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      cookie: cookie
    }, 
    body: body
  })

  const json = await response.json()
  return json[id]
}

async function fetchDevices () {
  state.devices = await devices.reduce(async (prevDevices, url) => {
    const devices = await prevDevices
    const id = url.match(/\d+/)[0]
    const cookie = await getCookie(url)
    const routes = await getAllRoutes(id, cookie)

    if (!state.devices[id]) {
      devices[id] = {}
    } else {
      devices[id] = state.devices[id]
    }

    devices[id].routes = routes.filter((point, i) => i % 6 === 0)
    console.log(id, devices[id].routes.length)
    return devices
  }, {})

  return state.devices
}

async function observe () {
  Object.keys(state.devices).forEach((devId) => {
    const position = state.devices[devId].routes[0]
    const speed = position.speed
    const lat = position.lat
    const lng = position.lng

    if (speed > 2) {
      if (!state.devices[devId].moves) {
        /* bot.telegram.sendMessage(process.env.CHAT_ID, "🛰: " + devId + " ➡️ 🌍" + "Speed: " + speed) */
        bot.telegram.sendMessage(process.env.CHAT_ID, `🛰 ${devId} is one the move (w/ ${speed} km/h). Visit https://return.gruppe5.org/?device=${devId}`)
        bot.telegram.sendLocation(process.env.CHAT_ID, lat, lng)
        state.devices[devId].moves = true
        state.devices[devId].stopped = false
      }
    } else if (!state.devices[devId].stopped) {
      /* bot.telegram.sendMessage(process.env.CHAT_ID, "🛰: " + devId + " 📍" + " LAT: " + lat + " LNG: " + lng) */
      bot.telegram.sendMessage(process.env.CHAT_ID, `🛰 ${devId} stopped`)
      bot.telegram.sendLocation(process.env.CHAT_ID, lat, lng)
      state.devices[devId].stopped = true
      state.devices[devId].moves = false
    }
  })
}

async function update () {
  await fetchDevices()
  observe()
  
  state.lastUpdate = Date.now()
  console.log(`${state.lastUpdate} devices updated`)

  return state.devices
}

async function init () {
  setInterval(update, 30 * 1000)
  setInterval(store, 2 * 60 * 60 * 1000)
  await update()
  await store()
  analyse()
}

init()
