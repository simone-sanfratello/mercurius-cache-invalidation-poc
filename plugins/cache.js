'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async (fastify, options) => {
  const storageOptions = options.cache.type === 'redis'
    ? {
        ...options.cache.redis,
        instance: fastify.redis,
        log: fastify.log
      }
    : {
        ...options.cache.memory,
        log: fastify.log
      }

  fastify.register(require('../lib/cache'), {
    ttl: options.cache.ttl,
    policy: {
      Query: {
        user: {
          references: (self, arg, ctx, info, result) => {
            return [`user:${result.id}`]
          }
        },
        users: {
          references: (self, arg, ctx, info, result) => {
            const references = result.map(user => (`user:${user.id}`))
            references.push('users')
            return references
          }
        },
        group: {
          references: (self, arg, ctx, info, result) => {
            return [`group:${result.id}`]
          }
        },
        groups: {
          references: (self, arg, ctx, info, result) => {
            const references = result.map(group => (`group:${group.id}`))
            references.push('groups')
            return references
          }
        }
      },
      Mutation: {
        addUser: {
          invalidate: (self, arg, ctx, info, result) => ['users']
        },
        updateUser: {
          // TODO might be some edge cases where the update does not effect the cached sets
          // but it would be very expensive to find them, so it's faster to just invalidate the whole cache
          // example: cached first 2 pages of users, then an user that are on the 3rd page is updated
          // first 2 pages don't need to be invalidated, but the only the 3rd page has to be
          // even worse if pages involve filter, sorting, etc
          invalidate: (self, arg, ctx, info, result) => ['users', `user:${arg.id}`]
          // TODO invalidate all user groups
        },
        removeUser: {
          invalidate: (self, arg, ctx, info, result) => ['users', `user:${arg.id}`]
          // TODO invalidate all user groups
        },
        addGroup: {
          invalidate: (self, arg, ctx, info, result) => ['groups']
        },
        updateGroup: {
          invalidate: (self, arg, ctx, info, result) => ['groups', `group:${arg.id}`]
          // TODO invalidate all users in group
        },
        removeGroup: {
          invalidate: (self, arg, ctx, info, result) => ['groups', `group:${arg.id}`]
          // TODO invalidate all users in group
        },
        addUserToGroup: {
          invalidate: (self, arg, ctx, info, result) => ['groups', `group:${arg.groupId}`, 'users', `user:${arg.userId}`]
          // TODO invalidate all user groups
          // TODO invalidate all users in group
        },
        removeUserFromGroup: {
          invalidate: (self, arg, ctx, info, result) => ['groups', `group:${arg.groupId}`, 'users', `user:${arg.userId}`]
          // TODO invalidate all user groups
          // TODO invalidate all users in group
        }
      }
    },
    storage: {
      type: options.cache.type,
      options: storageOptions
    },
    onHit: function (type, fieldName) {
      console.log('***** hit from cache', type, fieldName)
    },
    onMiss: function (type, fieldName) {
      console.log('***** miss from cache', type, fieldName)
    },
    onSkip: function (type, fieldName) {
      console.log('***** skip cache', type, fieldName)
    }
  })
}, {
  name: 'mercurius-cache',
  dependencies: ['mercurius', 'redis']
})
