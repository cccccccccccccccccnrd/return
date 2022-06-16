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
}

function zoomTo (lat, lng) {
  maps.full.map.panTo(new L.LatLng(lat, lng))
  maps.full.map.setZoom(17)
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
  const coordinates = lat + ', ' + lng

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

function placeMap (ids) {
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
    attribution: ''
  }).addTo(maps.full.map)

  // L.tileLayer(
  //   'https://api.mapbox.com/styles/v1/kjellxvx/cl49o2owt000y14lcco71iku4/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1Ijoia2plbGx4dngiLCJhIjoiY2w0OW1rNTQxMDVxYjNjbGs0dDl4d25nNCJ9.F2_QbQLdMIkWhi9Dkqrh5w',
  //   {
  //     attribution: ''
  //   }
  // ).addTo(maps.full.map)

  // L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
  //   subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
  // }).addTo(maps.full.map)
  // maps.full.map.setZoom(17);

  // const svgWarehouse = L.divIcon({
  //   html: `
  //   <?xml version="1.0" encoding="UTF-8"?><svg id="a" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 894.37 1277.67"><defs><style>.b{fill:#fff;}</style></defs><path class="b" d="M447.18,0C199.63,0,0,201.23,0,447.18c0,221.99,367.33,721.88,448.78,830.48,81.46-108.6,445.59-610.09,445.59-832.08C892.76,199.64,693.13,0,447.18,0h0Zm0,654.8c-110.2,0-201.23-91.04-201.23-201.23s91.04-201.23,201.23-201.23,201.23,89.43,201.23,201.23-91.03,201.23-201.23,201.23Z"/><circle cx="447.18" cy="453.57" r="364.2"/><g><g><path class="b" d="M208.56,296.04v352.35c0,8.41,6.82,15.24,15.24,15.24s15.23-6.82,15.23-15.24V306.55l208.16-78.52,208.16,78.52v341.83c0,8.41,6.82,15.24,15.23,15.24s15.24-6.82,15.24-15.24V296.03c0-6.34-3.93-12.01-9.86-14.25l-223.39-84.27c-3.46-1.31-7.29-1.31-10.75,0l-223.39,84.27c-5.93,2.24-9.86,7.91-9.86,14.25h0Z"/><path class="b" d="M531.59,438.12v-138.35c0-8.41-6.82-15.24-15.24-15.24h-138.35c-8.41,0-15.24,6.82-15.24,15.24v138.35c0,8.41,6.82,15.24,15.24,15.24h138.35c8.41,0,15.24-6.82,15.24-15.24h0Zm-30.46-15.23h-107.89v-107.89h107.89v107.89Z"/><path class="b" d="M283.45,494.82c-8.41,0-15.23,6.82-15.23,15.24v138.35c0,8.41,6.82,15.24,15.23,15.24h138.35c8.41,0,15.23-6.82,15.23-15.24v-138.35c0-8.41-6.81-15.24-15.23-15.24h-138.35Zm123.12,138.35h-107.89v-107.89h107.89v107.89Z"/></g><path class="b" d="M472.57,663.64h138.35c8.41,0,15.23-6.82,15.23-15.24v-138.35c0-8.41-6.82-15.24-15.23-15.24h-138.35c-8.41,0-15.23,6.82-15.23,15.24v138.35c0,8.41,6.81,15.24,15.23,15.24Zm15.23-138.35h107.89v107.89h-107.89v-107.89Z"/></g></svg>
  //   `,
  //   className: '',
  //   iconSize: [42, 60],
  //   iconAnchor: [21, 60]
  // })

  const svgCircle = L.divIcon({
    html: `
    <?xml version="1.0" encoding="UTF-8"?><svg id="a" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 91.32 91.32"><circle cx="45.66" cy="45.66" r="45.66"/></svg>
    `,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  })

  const discoveries = Object.keys(metadata.discoveries)
  discoveries.forEach(index => {
    var latlng = [
      metadata.discoveries[index]['lat'],
      metadata.discoveries[index]['lng']
    ]
    // L.circleMarker(latlng, {
    //   radius: 10,
    //   color: '#000',
    //   stroke: false,
    //   fillOpacity: 1.0,
    //   zIndexOffset: 1000
    // }).addTo(

    var lat = metadata.discoveries[index]['lat']
    var lng = metadata.discoveries[index]['lng']
    var warehousemaker = L.marker([lat, lng], { icon: svgCircle }).addTo(
      maps.full.map
    )
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
  placeMap(ids)
  placeDiscoveries()
}

init()
