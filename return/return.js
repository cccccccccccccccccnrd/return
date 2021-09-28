let state = {}
let maps = {}

let counterInterval

const interval = 30
let counter = interval

const deviceSelect = document.querySelector('#device-select')
const updateInput = document.querySelector('#update-input')
const timestampDiv = document.querySelector('#timestamp')
const idInput = document.querySelector('#id')
const submitButton = document.querySelector('#submit')
const infoSmall = document.querySelector('#info')
const devicesDiv = document.querySelector('#devices')

submitButton.addEventListener('click', (event) => {
  if (/^\d+$/.test(idInput.value)) {
    infoSmall.innerText = 'Thank you for your submission.'
    /* alert('Thank you for your submission.') */
  } else {
    infoSmall.innerText = 'Please only submit a tracker ID.'
    /* alert('Please only submit a tracker ID.') */
  }
})

deviceSelect.addEventListener('change', (event) => {
  showMap(deviceSelect.value)
})

updateInput.addEventListener('change', (event) => {
  console.log(updateInput.checked)
  if (updateInput.checked) {
    startUpdating()
  } else {
    stopUpdating()
  }
})

async function getState () {
  const response = await fetch('/api')
  const json = await response.json()
  state = json
  console.log(state)
}

function stopUpdating () {
  clearInterval(counterInterval)
  document.querySelector('#counter').innerHTML = ''
}

function startUpdating () {
  counter = interval
  document.querySelector('#counter').innerHTML = interval

  counterInterval = setInterval(() => {
    if (counter === 1) {
      counter = interval
      replaceMaps()
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

  ids.forEach((id) => {
    const div = document.createElement('div')
    div.id = `map-${id}`
    div.className = 'map'
    document.querySelector('#maps').appendChild(div)

    const position = state.devices[id].routes[0]

    maps[id] = {}
    maps[id].map = L.map(`map-${id}`).setView([position.lat, position.lng], 18)
    maps[id].map.scrollWheelZoom.disable()
    L.tileLayer('https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
        attribution: ''
    }).addTo(maps[id].map)

    const latlngs = state.devices[id].routes.map((point) => [point.lat, point.lng])
    maps[id].line = L.polyline(latlngs, { color: 'black', fill: false }).addTo(maps[id].map)

    state.devices[id].routes.map((point, index) => {
      L.circle([point.lat, point.lng], {
        color: index === 0 ? 'black' : 'black',
        fillColor: index === 0 ? 'black' : 'black',
        fillOpacity: 1,
        radius: index === 0 ? 10 : 1
      }).addTo(maps[id].map).on('click', () => {
        window.open(`https://maps.google.com/?q=${point.lat},${point.lng}`, '_blank')
      })
    })
  })
  Object.keys(state.devices).map((id) => maps[id].map.invalidateSize())
}

function placeMap () {
  const div = document.createElement('div')
  div.id = `map-full`
  div.className = 'map map-full'
  document.querySelector('#map').appendChild(div)

  const colors = ['cyan', 'yellow', 'magenta']
  const ids = Object.keys(state.devices)
  const center = state.devices[ids[0]].routes[0]

  maps.full = {}
  maps.full.map = L.map(`map-full`).setView([center.lat, center.lng], 10)
  if (screen.width < 640) maps.full.map.scrollWheelZoom.disable()
  L.tileLayer('https://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}', {
      attribution: ''
  }).addTo(maps.full.map)
  
  ids.forEach((id, index) => {
    const latlngs = state.devices[id].routes.map((point) => [point.lat, point.lng])
    maps.full.line = L.polyline(latlngs, {
      color: colors[index],
      weight: 2,
      fill: false
    }).addTo(maps.full.map)

    state.devices[id].clusters.map((point, i) => {
      console.log(point)
      L.circle(point, {
        color: colors[index],
        fillColor: colors[index],
        fillOpacity: 0,
        weight: 2,
        radius: 10000
      }).addTo(maps.full.map)
    })

    state.devices[id].routes.map((point, i) => {
      L.circle([point.lat, point.lng], {
        color: i === 0 ? colors[index] : colors[index],
        fillColor: i === 0 ? colors[index] : colors[index],
        fillOpacity: 1,
        radius: i === 0 ? 10 : 1
      }).addTo(maps.full.map).on('click', () => {
        window.open(`https://maps.google.com/?q=${point.lat},${point.lng}`, '_blank')
      })
    })

    if (index === 0) devicesDiv.innerHTML = ''
    devicesDiv.innerHTML += `<div><div class="circle" style="background: ${colors[index]}"></div>${id}</div>`
  })

  maps.full.map.invalidateSize()
}

async function init (onlyTimestamp) {
  await getState()
  placeUi(onlyTimestamp)
  placeMaps()
  placeMap()

  const device = new URLSearchParams(window.location.search).get('device')
  if (device) {
    deviceSelect.selectedIndex = Object.keys(state.devices).findIndex((id) => device === id) + 1
    showMap(device)
  }
}

init()