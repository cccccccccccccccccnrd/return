let state = {}
let maps = {}

async function getState () {
  const response = await fetch('api')
  const json = await response.json()
  state = json
}

function placeMaps () {
  const ids = Object.keys(state.devices)
  console.log(ids)
  ids.forEach((id) => {
    const div = document.createElement('div')
    div.id = `map-${id}`
    div.className = 'map'
    document.body.appendChild(div)

    const position = state.devices[id][0]
    console.log(position)

    maps[id] = L.map(`map-${id}`).setView([position.lat, position.lng], 11)
    L.tileLayer('https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
        attribution: ''
    }).addTo(maps[id])

    const latlngs = state.devices[id].map((point) => [point.lat, point.lng])
    console.log(latlngs)
    L.polyline(latlngs, { color: 'blue', fill: false }).addTo(maps[id])

    state.devices[id].map((point) => {
      L.circle([point.lat, point.lng], {
        color: 'blue',
        fillColor: 'blue',
        fillOpacity: 1,
        radius: 10
      }).addTo(maps[id])
    })
  })
}

async function init () {
  await getState()
  console.log(state)
  placeMaps()
}

init()