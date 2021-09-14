//  _____            _             _____ _____   _____   _______             _                        _____ _____ 
// |  __ \ /\       | |           / ____|  __ \ / ____| |__   __|           | |                 /\   |  __ \_   _|
// | |__) /  \      | |  ______  | |  __| |__) | (___      | |_ __ __ _  ___| | _____ _ __     /  \  | |__) || |  
// |  ___/ /\ \ _   | | |______| | | |_ |  ___/ \___ \     | | '__/ _` |/ __| |/ / _ \ '__|   / /\ \ |  ___/ | |  
// | |  / ____ \ |__| |          | |__| | |     ____) |    | | | | (_| | (__|   <  __/ |     / ____ \| |    _| |_ 
// |_| /_/    \_\____/            \_____|_|    |_____/     |_|_|  \__,_|\___|_|\_\___|_|    /_/    \_\_|   |_____|
//                                                                      

movement = [false, false, false, false, false]
stopped = [false, false, false, false, false]

var myArgs = process.argv.slice(2);
console.log("CHAT_ID: -" + myArgs[0])
console.log("TOKEN: " + myArgs[1])

mov_threshold = myArgs[2]

if(typeof mov_threshold === 'undefined') {
  console.log('Variable "comment" is undefined.');
}

// importing npm modules
const path = require('path')
const fetch = require('node-fetch')
const express = require('express')

// object managing the state, bascially the main object
let state = {
  lastUpdate: Date.now(),
  devices: {}
}

// URLs of all devices that need to be tracked
/* const devices = [
  'https://www.finder-portal.com/viewmode_69219_0d8d9a77846c4b30832ccac9d2b716d60de42f92.html',
  'https://www.finder-portal.com/viewmode_69221_c281b30b2637ac75efb2424f553334cf9d2e28f4.html',
  'https://www.finder-portal.com/viewmode_69222_1b56359903a998f721926c296f1a251591dbfdb1.html',
  'https://www.finder-portal.com/viewmode_69223_2c49dbca1bd3236cd3560e1bc354f05ebf40979d.html',
  'https://www.finder-portal.com/viewmode_69224_71d674a0ffc66991c63c0c1f5d33709e3ff0bec7.html'
] */

const devices = [
  'https://www.finder-portal.com/viewmode_116381_ae3a760b73a46b97a4762b0444d59116d113d7bd.html',
  'https://www.finder-portal.com/viewmode_116376_dfd6e7ebd118eea1412e3e2011423ad4d78ccbef.html',
  'https://www.finder-portal.com/viewmode_116904_958d0a2f51d61ade24ba4647deee70ae9d482e29.html'
]

//////////// webserver, where the content is stored and can be accessed //////////
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
//////////////////////////////////////////////////////////////////////////////////

/////////////////////////// initialise Telegram Bot //////////////////////////////
chat_id = "-"
chat_id = chat_id.concat(myArgs[0])
token = myArgs[1]

const Telegraf = require('telegraf')
/* const bot      = new Telegraf(token)
bot.start((ctx) => ctx.reply('GPS Bot'))

bot.hears('update', (ctx) => {
    console.log('ctx:', ctx.update.message.chat.id)
    ctx.reply('Wait a second, I will send you the current locations of your trackers...')
    movement = [false, false, false, false, false]
    stopped = [false, false, false, false, false]
    update()
  })

bot.hears('my_id', (ctx) => {
  console.log('ctx:', ctx.update.message.chat.id)
  ctx.reply('Chat-ID' + ctx.update.message.chat.id)
})

bot.startPolling()

bot.telegram.sendMessage(chat_id, 'Telegram GPS Bot has been started'); */
//////////////////////////////////////////////////////////////////////////////////


// function to receive cookie, we need the cookie in order to do the POST request
async function getCookie(url) {
  const response = await fetch(url)
  return response.headers.raw()['set-cookie'][0].split(';')[0]
}

// function to get routes from finder-portal websites, this is basically the api request
async function getAllRoutes(id, cookie) {
  // defining the content we want to request from the site, stored in body 
  // URLSearchParams builds single string from body functions that the server can understand
  const body = new URLSearchParams()
  // body consisting of 'data' and 'allRoutes'
  body.append('data', 'allRoutes')
  // body also needs options[id of the device] and 5, that's just how the API is build
  body.append(`options[${id}]`, '5')

  // server contact, sending out request
  const response = await fetch('https://www.finder-portal.com/data/endpoints.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      cookie: cookie
    }, 
    body: body
  })

  // waiting for response and storing as json
  const json = await response.json()
  // returning response according to id
  return json[id]
}

// MAIN FUNCTION, updating state of all devices
async function update () {
  
  // state object contains everything we want to track, currently lastUpdate variable and devices objects
  // reduce function to track if previous object is finished getting all parameters
  // this has to be done because of asynchronous workflow because we are fetching data from a server (where we never know how long it takes)
  state.devices = await devices.reduce(async (prevDevices, url) => {
    // waiting until all promises are fulfilled
    const devices = await prevDevices

    // extracting ID from URL with regex
    const id = url.match(/\d+/)[0]
    // getting cookie
    const cookie = await getCookie(url)
    // getting routes
    const routes = await getAllRoutes(id, cookie)
    // adding routes to devices objects according to the correct URL
    devices[id] = routes
    // returning devices to the reduce function for the next run
    return devices
  }, {}) // adding an empty object for the first time, so it starts immediately because there are no promises to be fulfilled
  // adding lastUpdate variable to our state object
  state.lastUpdate = Date.now()
  console.log(`${state.lastUpdate} devices updated`)

    // Define Actions on movement of devices, notifications via Telegram
    i = 0;
    for (states in devices){
      dev_id = Object.keys(state.devices)[i]
      speed = state.devices[dev_id][0].speed
      lat = state.devices[dev_id][0].lat
      lng = state.devices[dev_id][0].lng

      if (speed > mov_threshold ){
        if (movement[i] == false) {
          console.notify("🛰: " + dev_id + " ➡️ 🌍" + "Speed: " + speed)
          movement[i] = true;
          stopped[i] = false;
        }
      } else{
        if (stopped[i] == false) {
          console.notify("🛰: " + dev_id + " 📍" + " LAT: " + lat + " LNG: " + lng)
          bot.telegram.sendLocation(chat_id, lat, lng)
          stopped[i] = true;
          movement[i] = false;
        }
      }
      i++;
    }
}

// define update time 
setInterval(update, 30 * 1000)
update()

// function for easy telegram logging
function logToTelegram() {
  const msg = Object.values(arguments).map((msg) => {
     if(typeof(msg) === "object") {
        return msg.stack ? msg.stack : JSON.stringify(msg)
     } else {
        return String(msg)
     }
  }).join("");

  return bot.telegram.sendMessage(chat_id, msg);
}

console.notify = function() {
      console.log(...arguments);
      logToTelegram(...arguments);

}