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

    maps[id] = L.map(`map-${id}`).setView([51.505, -0.09], 13)
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: ''
    }).addTo(maps[id])
  })
}

async function init () {
  await getState()
  console.log(state)
  placeMaps()
}

init()