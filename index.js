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
const cors = require('cors')
const express = require('express')
const db = require('monk')(
  `${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/return`,
  { authSource: 'admin' }
)
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

// 158656 is the test tracker!
const devices = [
  {
    url: 'https://www.finder-portal.com/viewmode_116381_ae3a760b73a46b97a4762b0444d59116d113d7bd.html',
    dropoff: 10,
    offline: true
  },
  {
    url: 'https://www.finder-portal.com/viewmode_116904_958d0a2f51d61ade24ba4647deee70ae9d482e29.html',
    dropoff: 10,
    offline: true
  },
  {
    url: 'https://www.finder-portal.com/viewmode_116376_dfd6e7ebd118eea1412e3e2011423ad4d78ccbef.html',
    dropoff: 10,
    offline: true
  },
  {
    url: 'https://www.finder-portal.com/viewmode_141569_280ca18776c4acaefa27865f1cbc0a4a80f501d9.html',
    dropoff: 10,
    offline: true
  },
  {
    url: 'https://www.finder-portal.com/viewmode_154662_a88a0c17cd5ac9b8ab3c6f022beb00d02b5858bd.html',
    dropoff: 10,
    offline: true
  },
  {
    url: 'https://www.finder-portal.com/viewmode_158656_35389e7d8b92ad447d45b5e2bafca0acf41dbb3f.html',
    dropoff: 10,
    offline: true
  },
  {
    url: 'https://www.finder-portal.com/viewmode_158991_3060f179a1ff878ceaea1e1cc6a3e6d5af7bc1c8.html',
    dropoff: 10,
    offline: true
  },
  {
    url: 'https://www.finder-portal.com/viewmode_159742_34a6ced3c7054db5e903cfffb1a48c1cf482e0a7.html',
    dropoff: 62,
    offline: true
  },
  {
    url: 'https://www.finder-portal.com/viewmode_1112764_e08e9752fcf0c1bc0a1b09f29c8b37b9e934c5e9.html',
    dropoff: 90,
    offline: true
  },
  {
    url: 'https://www.finder-portal.com/viewmode_1113168_0e1f30fc02fc9357b8ead44259027ba87c3f5735.html',
    dropoff: 3,
    offline: true
  },
  {
    url: 'https://www.finder-portal.com/viewmode_1117261_feb7aca1b8494570bfb2b0b867708985dfbc019a.html',
    dropoff: 1,
    offline: true
  },
  // {
  //   url: 'https://www.finder-portal.com/viewmode_1148423_5379434c00181d031887628bbe8c9c8c7849fdba.html',
  //   dropoff: 20,
  //   offline: true
  // },
  {
    url: 'https://v2.finder-portal.com/stand-alone-page/viewmode_1011115941_03a1c388af99247710459ed3a02c1e108862abcb',
    dropoff: 13
  }
]

const app = express()
app.use(cors())

app.use('/', express.static(path.join(__dirname, 'return')))
app.use('/opencall', express.static(path.join(__dirname, 'opencall')))

app.get('/api', (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify(state, null, 2))
})

app.listen(2224, () => {
  console.log(`serving on http://localhost:2224`)
})

const bot = new Telegraf(process.env.BOT_TOKEN)

bot.hears('/locations', ctx => {
  Object.keys(state.devices).forEach(devId => {
    const speed = state.devices[devId].routes[0].speed
    const lat = state.devices[devId].routes[0].lat
    const lng = state.devices[devId].routes[0].lng

    bot.telegram.sendMessage(
      process.env.CHAT_ID,
      `🛰 ${devId} is here (w/ ${speed} km/h)`
    )
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
    const latlngs = routes.map(point => [point.lat, point.lng])
    const dbscan = new clustering.DBSCAN()
    const findings = dbscan.run(latlngs, 0.00005, 3)

    const clusters = findings.map(
      cluster => latlngs[cluster[Math.floor(cluster.length / 2)]]
    )
    state.devices[id].clusters = clusters
    console.log(
      `predicted clusters for ${id}`,
      state.devices[id].clusters.length
    )
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
  fs.writeFileSync(
    path.join(__dirname, filename),
    JSON.stringify(payload, null, 2),
    'utf8'
  )
}

async function save () {
  const full = await retrieve()
  await dump(full[full.length - 1], 'dump.json')
}

function store () {
  returns
    .insert(state)
    .then(entries => {
      console.log('stored')
    })
    .catch(error => {
      console.log('while storing', error)
    })
}

// async function getCookie (url) {
//   const response = await fetch(url)
//   return response.headers.raw()['set-cookie'][0].split(';')[0]
// }

// async function getAllRoutes (id, cookie) {
//   const body = new URLSearchParams()
//   body.append('data', 'allRoutes')
//   body.append(`options[${id}]`, '5')

//   const response = await fetch(
//     'https://www.finder-portal.com/data/endpoints.php',
//     {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
//         cookie: cookie
//       },
//       body: body
//     }
//   )

//   const json = await response.json()
//   return json[id]
// }

async function getAllRoutes (id) {
  const currentTime = Math.floor(Date.now() / 1000)
  console.log(id)
  const response = await fetch(
    `https://connect.paj-gps.de/api/v1/trackerdata/1011115941/date_range?dateStart=0000000000&dateEnd=${currentTime}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PAJ_TOKEN}`
      }
    }
  )
  const json = await response.json()
  return json.success
}

async function fetchDevices (offline) {
  state.devices = {
    ...state.devices,
    ...(await devices.reduce(async (prevDevices, device) => {
      const devices = await prevDevices
      // const id = device.url.match(/\d+/)[0]
      const id = device.url.split('_')[1]

      if (device.hasOwnProperty('offline')) {
        if (offline) {
          const query = `devices.${id}`
          const findings = await returns.findOne(
            { [query]: { $exists: true } },
            { sort: { $natural: -1 } }
          )
          devices[id] = findings.devices[id]
          console.log(id, devices[id].routes.length, 'offline')
          return devices
        }

        return devices
      } else {
        // const cookie = await getCookie(device.url)
        // const routes = await getAllRoutes(id, cookie)
        const routes = await getAllRoutes(id)

        if (!state.devices[id]) {
          devices[id] = {}
        } else {
          devices[id] = state.devices[id]
        }

        devices[id].routes = routes
          .filter((point, i) => i % 6 === 0)
          .slice(0, -device.dropoff)
        console.log(id, devices[id].routes.length)
        return devices
      }
    }, {}))
  }

  return state.devices
}

async function observe () {
  Object.keys(state.devices).forEach(devId => {
    const position = state.devices[devId].routes[0]
    const speed = position.speed
    const lat = position.lat
    const lng = position.lng

    if (speed > 2) {
      if (!state.devices[devId].moves) {
        /* bot.telegram.sendMessage(process.env.CHAT_ID, "🛰: " + devId + " ➡️ 🌍" + "Speed: " + speed) */
        bot.telegram.sendMessage(
          process.env.CHAT_ID,
          `🛰 ${devId} is one the move (w/ ${speed} km/h). Visit https://return.gruppe5.org/?device=${devId}`
        )
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

async function update (offline) {
  try {
    await fetchDevices(offline)
    observe()
  } catch (error) {
    console.log('error while fetching devices', error)
  }

  state.lastUpdate = Date.now()
  console.log(`${state.lastUpdate} devices updated`)

  return state.devices
}

async function init () {
  setInterval(update, 1 * 60 * 1000)
  setInterval(store, 2 * 60 * 60 * 1000)
  await update(true)
  await store()
  analyse()
}

init()
