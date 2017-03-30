const debug = require('debug')('plug')
const path = require('path')
const fs = require('fs')
const events = require('events')
const util = require('util')

const Plugger = exports.Plugger = function (...args) {
  this.activePlugins = {}
  this.args = Array.prototype.slice.call(args, 0)
} // PluginLoader

util.inherits(Plugger, events.EventEmitter)

Plugger.prototype.activate = function (pluginName, plugin, modulePath, data) {
  // update the active plugins
  this.activePlugins[pluginName] = {
    data,
    module: plugin,
    path  : modulePath,
  }

  // emit the connect event
  debug(`!! CONNECT: plugin "${pluginName}" load fired callback, completed`)
  this.emit('connect', pluginName, data || {}, modulePath)
}

Plugger.prototype.drop = function (pluginName) {
  const activePlugin = this.activePlugins[pluginName]
  const loader = this

  // if the plugin is already loaded, then drop it
  debug(`check if drop required for plugin: ${pluginName}`)
  if (activePlugin) {
    let dropActions = []

    debug(`!! DROP: active plugin found for "${pluginName}", attempting drop`)
    if (activePlugin.module.drop) {
      dropActions = activePlugin.module.drop.apply(null, this.args) || []
      if (!Array.isArray(dropActions)) {
        dropActions = [dropActions]
      }
    }

    // emit the drop event
    this.emit('drop', pluginName, activePlugin, dropActions)

    // iterate through the drop actions and fire events for each action
    dropActions.forEach(actionData => {
      if (actionData.action) {
        loader.emit(actionData.action, actionData)
      }
    })

    // delete the active plugin
    delete this.activePlugins[pluginName]
  }
}

Plugger.prototype.find = function (pluginPath) {
  const loader = this

  debug(`looking for app plugins in: ${pluginPath}`)
  fs.readdir(pluginPath, (err, files) => {
    console.error(err);
    (files || []).forEach(file => {
      loader.load(path.join(pluginPath, file))
    })
  })
}

Plugger.prototype.load = function (modulePath) {
  // grab the base name of the plugin
  const pluginName = path.basename(modulePath, '.js')

  let plugin
  let connectArgs = this.args
  const loader = this

  // drop the existing plugin if it exists
  loader.drop(pluginName, plugin)

  debug(`loading plugin "${pluginName}" from: ${modulePath}`)
  require.cache[modulePath] = undefined

  try {
    // load the plugin
    plugin = require(modulePath)
  } catch (e) {
    loader.emit('error', e)
  }

  if (plugin && plugin.connect) {
    const haveCallback = plugin.connect.length > this.args.length
    let connectResult

    // if the function has a callback parameter, then append the callback arg
    if (haveCallback) {
      // add the callback to the connect args
      connectArgs = this.args.concat(pluginData => {
        loader.activate(pluginName, plugin, modulePath, pluginData || connectResult)
      })
    }

    // call the connect method
    connectResult = plugin.connect.apply(null, connectArgs)

    // if we didn't have a callback, then emit the connect event
    if (!haveCallback) {
      loader.activate(pluginName, plugin, modulePath, connectResult)
    }
  }
}

exports.create = (...args) => {
  // create the new plugger
  const instance = new Plugger()

  // apply the constructor to pass through the arguments
  Plugger.apply(instance, Array.prototype.slice.call(args, 0))

  // return the new instance
  return instance
}
