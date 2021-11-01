'use strict'

/* istanbul ignore file */

const path = require('path')
const pino = require('pino')
const envSchema = require('env-schema')
const S = require('fluent-json-schema')

const config = envSchema({
  schema: S.object()
    .prop('NODE_ENV', S.string().default('production'))

    .prop('FASTIFY_PORT', S.number().default(3000))
    .prop('FASTIFY_LOG_LEVEL', S.string().enum(Object.values(pino().levels.labels))).default('warn')
    .prop('FASTIFY_PRETTY_LOGS', S.boolean().default(true))

    .prop('REDIS_HOST', S.string().default('127.0.0.1'))
    .prop('REDIS_PORT', S.number().default(6379))

    .prop('CACHE_DEFAULT_TTL', S.number().default(3600)) // seconds
    .prop('CACHE_STORAGE_TYPE', S.string().default('redis'))

    .prop('GRAPHQL_PLAYGROUND', S.boolean().default(true)),

  dotenv: true
})

module.exports = {
  env: config.NODE_ENV,
  log: {
    level: config.FASTIFY_LOG_LEVEL,
    pretty: config.FASTIFY_PRETTY_LOGS
  },
  app: {
    port: config.FASTIFY_PORT
  },
  autoload: [
    { path: path.join(__dirname, '../plugins') }
  ],
  // fastify-redis options
  redis: {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT
  },
  // mercurius options
  graphql: {
    dir: path.join(__dirname, '../gql'),
    graphiql: config.GRAPHQL_PLAYGROUND
    // federationMetadata: true
  },
  // mercurius-cache options
  cache: {
    ttl: config.CACHE_DEFAULT_TTL,
    type: config.CACHE_STORAGE_TYPE,
    memory: {
      size: config.CACHE_STORAGE_MEMORY_SIZE
    },
    redis: {}
  }
}
