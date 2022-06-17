let state = {}
let metadata = {}
let maps = {}

let activeDevices
let colors

const devicesDiv = document.querySelector('#devices')

async function getState () {
  const response = await fetch('/api')
  const json = await response.json()
  state = json
  // delete Test Tracker from UI
  delete state['devices']['158656']
}

async function getDiscoveries () {
  const response = await fetch('./discoveries.json')
  const json = await response.json()
  metadata = json
  return json
}

function zoomTo (lat, lng) {
  maps.full.map.setView([lat, lng], 17)
}

function scrollToDiscov (divname) {
  var discovDiv = document.getElementById("'" + divname + "'")
  console.log(discovDiv)
  var topPos = discovDiv.offsetTop
  document.getElementById('main').scrollTop = topPos
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

function placeUi (ids) {
  const c = [
    'cyan',
    'yellow',
    'magenta',
    '#49fb35',
    '#ED0A3F',
    '#8000ff',
    '#0203e2',
    '#299617',
    '#FF7A00'
  ]
  colors = ids.reduce((o, key, index) => ({ ...o, [key]: c[index] }), {})
  activeDevices = new Set(ids)
  devicesDiv.innerHTML = ''

  ids.forEach((id, index) => {
    // devicesDiv.innerHTML += `<div onclick="toggleDevice('${id}')" id="device-${id}" class="tooltip" class="device"><div class="circle" style="background: ${colors[id]}"><span class="tooltiptext" data-placement="top" >drop-off: Berlin <br> 08.02.2022</span></div>${id}</div>`
    devicesDiv.innerHTML += `<div onclick="toggleDevice('${id}')" id="device-${id}" class="device"><div class="circle" style="background: ${colors[id]}"></div>${id}</div>`
  })
}

function placeDiscoveries () {
  Object.keys(metadata.discoveries).forEach(index => {
    //console.log(index, metadata.discoveries[index])
    const newDiv = document.createElement('div')
    newDiv.setAttribute('id', metadata.discoveries[index]['name'])
    const container = document.getElementById('discoveries-content')
    newDiv.setAttribute(
      'onclick',
      'zoomTo( " ' +
        metadata.discoveries[index]['lat'] +
        ' " , "' +
        metadata.discoveries[index]['lng'] +
        '" )'
    )
    newDiv.setAttribute('style', 'cursor:pointer')
    container.appendChild(newDiv)
    createLocation(index)
  })
}

function createLocation (index) {
  //console.log(metadata.discoveries[index])
  const container = document.getElementById(metadata.discoveries[index]['name'])

  // Create title div
  const newTitle = document.createElement('h3')
  const titleContent = document.createTextNode(
    metadata.discoveries[index]['name']
  )
  newTitle.appendChild(titleContent)

  // Create image div
  const newImage = document.createElement('div')
  newImage.setAttribute('id', 'imageDiv')

  const img = document.createElement('img')
  img.src = metadata.discoveries[index]['image']
  img.setAttribute('referrerpolicy', 'no-referrer')
  newImage.appendChild(img)

  // Create content div
  const newContent = document.createElement('div')
  newContent.setAttribute('id', 'content')

  const meta = document.createElement('div')
  meta.setAttribute('id', 'meta')

  // Create left container for location data
  const containerLeft = document.createElement('div')
  containerLeft.setAttribute('id', 'discov-container-left')

  // fill with region data
  const region = document.createElement('div')
  const regionContent = document.createTextNode(
    metadata.discoveries[index]['region']
  )
  region.appendChild(regionContent)

  // fill with country data
  const country = document.createElement('div')
  const countryContent = document.createTextNode(
    metadata.discoveries[index]['country']
  )
  country.appendChild(countryContent)

  containerLeft.appendChild(region)
  containerLeft.appendChild(country)
  meta.appendChild(containerLeft)

  // Create right container for lat/lng
  const containerRight = document.createElement('div')
  containerRight.setAttribute('id', 'discov-container-right')
  const lat = metadata.discoveries[index]['lat']
  const lng = metadata.discoveries[index]['lng']
  const coordinates = lat.toFixed(5) + ', ' + lng.toFixed(5)

  const LatLng = document.createElement('div')
  const LatLngContent = document.createTextNode(coordinates)
  LatLng.appendChild(LatLngContent)

  containerRight.appendChild(LatLng)
  meta.appendChild(containerRight)

  newContent.appendChild(meta)

  // Create left container for location data
  const newDescription = document.createElement('div')
  newDescription.setAttribute('id', 'discription')

  const Description = document.createElement('p')
  const DescriptionContent = document.createTextNode(
    metadata.discoveries[index]['description']
  )
  Description.appendChild(DescriptionContent)

  newDescription.append(Description)

  // fill the discoveries container with content
  container.appendChild(newTitle)
  container.appendChild(newImage)
  container.appendChild(newContent)
  container.appendChild(newDescription)
}

function placeMap (ids, first) {
  const map = document.querySelector('#map-full')

  if (map) {
    map.parentNode.removeChild(map)
  }

  const div = document.createElement('div')
  div.id = `map-full`
  div.className = 'map map-full'
  document.querySelector('#map').appendChild(div)
  
  const center = first ? [metadata.discoveries[0].lat, metadata.discoveries[0].lng] : maps.full.map.getCenter()

  maps.full = {}
  maps.full.map = L.map(`map-full`).setView(center, 17)
  if (screen.width < 640) maps.full.map.scrollWheelZoom.disable()
  L.tileLayer('https://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}', {
    attribution: ''
  }).addTo(maps.full.map)

  const discoveries = Object.keys(metadata.discoveries)
  discoveries.forEach(index => {
    const latlngs = [
      metadata.discoveries[index]['lat'],
      metadata.discoveries[index]['lng']
    ]

    /* L.circle(latlngs, {
      color: 'black',
      fillColor: 'black',
      fillOpacity: 0,
      radius: 300
    }).addTo(maps.full.map) */
  })

  ids.forEach(id => {
    const latlngs = state.devices[id].routes.map(point => [
      point.lat,
      point.lng
    ])
    maps.full.line = L.polyline(latlngs, {
      color: colors[id],
      weight: 2,
      fill: false
    }).addTo(maps.full.map)

    // state.devices[id].clusters.map((point, i) => {
    //   console.log(point)
    //   L.circle(point, {
    //     color: colors[id],
    //     fillColor: colors[id],
    //     fillOpacity: 0,
    //     weight: 2,
    //     radius: 10000
    //   }).addTo(maps.full.map)
    // })

    state.devices[id].routes.map((point, i) => {
      L.circle([point.lat, point.lng], {
        color: i === 0 ? colors[id] : colors[id],
        fillColor: i === 0 ? colors[id] : colors[id],
        fillOpacity: 1,
        radius: i === 0 ? 10 : 1
      })
        .addTo(maps.full.map)
        .bindPopup(
          `<p>Lat: <strong>${Number(point.lat).toFixed(
            6
          )}</strong></p><p>Lng: <strong>${Number(point.lng).toFixed(
            6
          )}</strong></p><p>Speed: <strong>${
            point.speed
          }</strong></p><p>Timestamp: <strong>${new Date(
            point.dateunix * 1000
          ).toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
          })}</strong></p><p>Maps: <strong><a href="https://maps.google.com/?q=${
            point.lat
          },${point.lng}" target="_blank">maps.google.com</a></strong></p>`
        )
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

var coll = document.getElementsByClassName('collapsible')
var i

for (i = 0; i < coll.length; i++) {
  coll[i].addEventListener('click', function (event) {
    var headline = event.target
    this.classList.toggle('active')
    var content = this.nextElementSibling
    if (content.style.maxHeight) {
      content.style.maxHeight = null
      content.style.margin = '0 0 0 0'

      headline.innerHTML = '⇣' + headline.id
    } else {
      content.style.maxHeight = 'none'
      content.style.margin = '0.5em 0 0 0'
      headline.innerHTML = '⇡' + headline.id
    }
  })
}

async function init () {
  await getState()
  await getDiscoveries()
  const ids = Object.keys(state.devices)
  placeUi(ids)
  placeMap(ids, 'first')
  placeDiscoveries()
}

init()
