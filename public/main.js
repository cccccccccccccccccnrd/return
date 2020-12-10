let state = {}
let maps = {}

const interval = 30
let counter = interval

const deviceSelect = document.querySelector('#device-select')
const timestampDiv = document.querySelector('#timestamp')

deviceSelect.addEventListener('change', (event) => {
  showMap(deviceSelect.value)
})

async function getState () {
  const response = await fetch('api')
  const json = await response.json()
  state = json
}

function startCounter() {
  setInterval(() => {
    if (counter === 1) {
      counter = interval
    } else {
      counter--
    }
    document.querySelector('#counter').innerHTML = counter
  }, 1000)
}

function showMap (id) {
  window.history.pushState({}, {}, `/?device=${id}`)
  document.querySelectorAll('.map').forEach((map) => {
    if (id === 'all') {
      map.classList.remove('hidden')
    } else {
      if (`map-${id}` === map.id) {
        map.classList.remove('hidden')
      } else {
        map.classList.add('hidden')
      }
    }
  })

  Object.keys(state.devices).map((id) => maps[id].map.invalidateSize())
}

function placeUi (onlyTimestamp) {
  if (!onlyTimestamp) {
    startCounter()

    const ids = Object.keys(state.devices)
    ids.forEach((id) => {
      const opt = document.createElement('option')
      opt.value = id
      opt.innerHTML = id
      deviceSelect.appendChild(opt)
    })
  }

  timestampDiv.innerHTML = new Date(state.lastUpdate).toLocaleDateString('en', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  })
}

function replaceMaps () {
  document.querySelectorAll('.map').forEach((map) => map.remove())
  init(true)
}

function placeMaps () {
  const ids = Object.keys(state.devices)
  console.log(ids)
  ids.forEach((id) => {
    const div = document.createElement('div')
    div.id = `map-${id}`
    div.className = 'map'
    document.querySelector('#maps').appendChild(div)

    const position = state.devices[id][0]

    maps[id] = {}
    maps[id].map = L.map(`map-${id}`).setView([position.lat, position.lng], 18)
    L.tileLayer('https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
        attribution: ''
    }).addTo(maps[id].map)

    const latlngs = state.devices[id].map((point) => [point.lat, point.lng])
    maps[id].line = L.polyline(latlngs, { color: 'blue', fill: false }).addTo(maps[id].map)

    state.devices[id].map((point, index) => {
      L.circle([point.lat, point.lng], {
        color: index === 0 ? 'red' : 'blue',
        fillColor: index === 0 ? 'red' : 'blue',
        fillOpacity: 1,
        radius: index === 0 ? 40 : 10
      }).addTo(maps[id].map)
    })
  })
  Object.keys(state.devices).map((id) => maps[id].map.invalidateSize())
}

async function init (onlyTimestamp) {
  await getState()
  placeUi(onlyTimestamp)
  placeMaps()

  const device = new URLSearchParams(window.location.search).get('device')
  if (device) {
    deviceSelect.selectedIndex = Object.keys(state.devices).findIndex((id) => device === id) + 1
    showMap(device)
  }
}

setInterval(replaceMaps, interval * 1000)
init()