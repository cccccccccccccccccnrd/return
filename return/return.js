let state = {}
let maps = {}

let activeDevices
let colors

const devicesDiv = document.querySelector('#devices')

async function getState() {
  const response = await fetch('/api')
  const json = await response.json()
  state = json
  console.log(state)
}

function toggleDevice (id) {
  if (activeDevices.has(id)) {
    if (activeDevices.size < 2) return
    activeDevices.delete(id)
  } else {
    activeDevices.add(id)
  }

  document.querySelector(`#device-${id}`).classList.toggle('disabled')
  placeMap(Array.from(activeDevices))
}

function placeUi(ids) {
  const c = ['cyan', 'yellow', 'magenta', '#49fb35', '#ED0A3F']
  colors = ids.reduce((o, key, index) => ({...o, [key]: c[index]}), {})
  activeDevices = new Set(ids)
  devicesDiv.innerHTML = ''

  ids.forEach((id, index) => {
    // devicesDiv.innerHTML += `<div onclick="toggleDevice('${id}')" id="device-${id}" class="tooltip" class="device"><div class="circle" style="background: ${colors[id]}"><span class="tooltiptext" data-placement="top" >drop-off: Berlin <br> 08.02.2022</span></div>${id}</div>`
    devicesDiv.innerHTML += `<div onclick="toggleDevice('${id}')" id="device-${id}" class="device"><div class="circle" style="background: ${colors[id]}"></div>${id}</div>`
  })
}

function placeMap(ids) {
  console.log(ids)
  const map = document.querySelector('#map-full')

  if (map) {
    map.parentNode.removeChild(map)
  }

  const div = document.createElement('div')
  div.id = `map-full`
  div.className = 'map map-full'
  document.querySelector('#map').appendChild(div)

  const center = state.devices[ids[ids.length - 1]].routes[0]

  maps.full = {}
  maps.full.map = L.map(`map-full`).setView([center.lat, center.lng], 19)
  if (screen.width < 640) maps.full.map.scrollWheelZoom.disable()
  L.tileLayer('https://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}', {
    attribution: '',
  }).addTo(maps.full.map)

  ids.forEach((id, index) => {
    const latlngs = state.devices[id].routes.map((point) => [
      point.lat,
      point.lng,
    ])
    maps.full.line = L.polyline(latlngs, {
      color: colors[id],
      weight: 2,
      fill: false,
    }).addTo(maps.full.map)

    /* state.devices[id].clusters.map((point, i) => {
      console.log(point);
      L.circle(point, {
        color: colors[id],
        fillColor: colors[id],
        fillOpacity: 0,
        weight: 2,
        radius: 10000,
      }).addTo(maps.full.map);
    }); */

    state.devices[id].routes.map((point, i) => {
      L.circle([point.lat, point.lng], {
        color: i === 0 ? colors[id] : colors[id],
        fillColor: i === 0 ? colors[id] : colors[id],
        fillOpacity: 1,
        radius: i === 0 ? 10 : 1,
      })
        .addTo(maps.full.map)
        .bindPopup(`<p>Lat: <strong>${Number(point.lat).toFixed(6)}</strong></p><p>Lng: <strong>${Number(point.lng).toFixed(6)}</strong></p><p>Speed: <strong>${point.speed}</strong></p><p>Timestamp: <strong>${new Date(point.dateunix * 1000).toLocaleDateString('de-DE', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric'
        })}</strong></p><p>Maps: <strong><a href="https://maps.google.com/?q=${point.lat},${point.lng}" target="_blank">maps.google.com</a></strong></p>`)
        /* .on('click', () => {
          window.open(
            `https://maps.google.com/?q=${point.lat},${point.lng}`,
            '_blank'
          )
        }) */
    })
  })

  maps.full.map.invalidateSize()
}

async function init() {
  await getState()
  const ids = Object.keys(state.devices)
  placeUi(ids)
  placeMap(ids)
}

init()


var coll = document.getElementsByClassName('collapsible')
var i

for (i = 0; i < coll.length; i++) {
  coll[i].addEventListener('click', function () {
    this.classList.toggle('active')
    var content = this.nextElementSibling
    if (content.style.maxHeight) {
      content.style.maxHeight = null
      content.style.margin = "0 0 0 0"
    } else {
      content.style.maxHeight = "none"
      content.style.margin = "0.5em 0 0 0"
    }
  })
}