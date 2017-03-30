const path = require('path')
const plugger = require('../').create('Bob', 36)

// handle plugin connection
plugger.on('connect', (pluginName, pluginData, modulePath) => {
  console.log(`loaded plugin "${pluginName}", with data: `, pluginData)
})

plugger.on('drop', (pluginName, { data }) => {
  console.log(`dropped plugin: ${pluginName}, sport = ${data.sport}`)
})

plugger.find(path.resolve(__dirname, 'plugins/a'))
plugger.find(path.resolve(__dirname, 'plugins/b'))
