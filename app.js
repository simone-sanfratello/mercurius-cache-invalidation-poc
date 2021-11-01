'use strict'

const autoload = require('fastify-autoload')

module.exports = (config) => async (fastify, options) => {
  for (const plugin of config.autoload) {
    fastify.register(autoload, {
      dir: plugin.path,
      options: Object.assign({}, options, config)
    })
  }
}
