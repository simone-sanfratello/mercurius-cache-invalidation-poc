'use strict'

const fp = require('fastify-plugin')
const { makeExecutableSchema } = require('@graphql-tools/schema')
const {promisify} = require('util')
const sleep = promisify(setTimeout)

// { user(id: 1) {name,groups { id }} }
// { users(page: 2) {name} }
// { groups(page: 2) {name} }
// { group(id:10) {name, users { name }}}
// { users(page: 2) {name, groups{name}} }
// mutation { addUser(user: { name: "John" }) {id, name}}

/*
autocannon 'http://localhost:3000/graphql' \
-m POST -H 'content-type=application/json' \
-b '{ "query": "{ user(id: 1) {name,groups { id }} }" }' \ 

*/

const db = {
  users: {
    1: { name: 'Alice' },
    2: { name: 'Bob' },
    3: { name: 'Charlie' },
    4: { name: 'Dave' },
    5: { name: 'Eve' },
    6: { name: 'Frank' },
    7: { name: 'Grace' },
    8: { name: 'Heidi' },
    9: { name: 'Irene' }
  },
  groups: {
    10: { name: 'Gamers', users: [1, 2, 3] },
    11: { name: 'Guitar Players', users: [4, 5, 6] },
    12: { name: 'Snowboarders', users: [7, 8, 9] },
    13: { name: 'Divers', users: [3, 6, 9] },
    14: { name: 'Surfers', users: [2, 4, 6] },
    15: { name: 'Bikers', users: [1, 3, 5] },
    16: { name: 'Basketball Players', users: [4, 7, 8] }
  }
}

module.exports = fp(async (fastify, options) => {
  const typeDefs = `
    type User {
      id: ID!
      name: String!
      groups: [Group!]
    }

    type Group {
      id: ID!
      name: String!
      users: [User!]
    }
    
    type Query {
      user(id: ID!): User
      users(page: Int, size: Int): [User!]!

      group(id: ID!): Group
      groups(page: Int, size: Int): [Group!]!
    }

    input UserInput {
      name: String!
    }

    input GroupInput {
      name: String!
    }

    type Mutation {
      addUser (user: UserInput!): User!
      updateUser (id: ID!, user: UserInput!): User!
      removeUser (id: ID!): ID!

      addGroup (group: GroupInput!): Group!
      updateGroup (id: ID!, group: GroupInput!): Group!
      removeGroup (id: ID!): ID!

      addUserToGroup (userId: ID!, groupId: ID!): Group!
      removeUserFromGroup (userId: ID!, groupId: ID!): Group!
    }
  `

  const resolvers = {
    Query: {
      async user (_, { id }) {
        id = Number(id)
        await sleep(1000)
        return db.users[id] ? { id, ...db.users[id] } : null
      },

      async users (_, { page = 1, size = 3 }) {
        page = Math.max(1, Math.min(Object.keys(db.users).length, page))
        size = Math.max(1, Math.min(100, size))

        return Object.entries(db.users)
          .slice((page - 1) * size, page * size)
          .map(([id, user]) => ({ id, ...user }))
      },

      async group (_, { id }) {
        return db.groups[id] ? { id, ...db.groups[id] } : null
      },

      async groups (_, { page = 1, size = 3 }) {
        page = Math.max(1, Math.min(Object.keys(db.groups).length, page))
        size = Math.max(1, Math.min(100, size))

        return Object.entries(db.groups)
          .slice((page - 1) * size, page * size)
          .map(([id, group]) => ({ id, ...group }))
      }
    },

    Mutation: {
      addUser (_, { user: { name } }) {
        const id = Math.max(...Object.keys(db.users).map(id => Number(id))) + 1
        db.users[id] = { name }
        return { id, name }
      },
      addGroup (_, { group: { name } }) {
        const id = Math.max(...Object.keys(db.groups).map(id => Number(id))) + 1
        db.groups[id] = { name, users: [] }
        return { id, ...db.groups[id] }
      },
      updateUser (_, { id, user: { name } }) {
        db.users[id] = { name }
        return { id, name }
      },
      updateGroup (_, { id, user: { name } }) {
        db.groups[id] = { name }
        return { id, ...db.groups[id] }
      },
      removeUser (_, { id }) {
        id = Number(id)
        getGroupsByUserId(id).forEach(groupId => {
          const group = db.groups[groupId]
          group.users.splice(group.users.indexOf(id), 1)
        })
        delete db.users[id]
        return id
      },
      removeGroup (_, { id }) {
        delete db.groups[id]
        return id
      },
      addUserToGroup (_, { userId, groupId }) {
        userId = Number(userId)
        const group = db.groups[groupId]
        if (!group.users.includes(userId)) {
          group.users.push(userId)
        }
        return { id: groupId, ...group }
      },
      removeUserFromGroup (_, { userId, groupId }) {
        userId = Number(userId)
        const group = db.groups[groupId]
        group.users.splice(group.users.indexOf(userId), 1)
        return { id: groupId, ...group }
      }
    },

    User: {
      __resolveReference: (source, args, context, info) => {
        return db.users[source.id]
      }
    },

    Group: {
      __resolveReference: (source, args, context, info) => {
        return db.groups[source.id]
      }
    }
  }

  const loaders = {
    User: {
      groups: async (queries, context) => {
        return queries.map(user =>
          getGroupsByUserId(Number(user.obj.id)).map(id =>
            ({ id, name: db.groups[id].name })))
      }
    },

    Group: {
      users: async (queries, context) => {
        return queries.map(group =>
          group.obj.users.map(id =>
            ({ id, name: db.users[id].name })))
      }
    }
  }

  function getGroupsByUserId (id) {
    const userGroups = []
    for (const [groupId, group] of Object.entries(db.groups)) {
      if (group.users.includes(id)) {
        userGroups.push(Number(groupId))
      }
    }
    return userGroups
  }

  fastify.register(require('mercurius'), {
    ...options.graphql,
    schema: makeExecutableSchema({
      typeDefs,
      resolvers
    }),
    loaders,
    context: async (req) => {
      return {
        log: fastify.log
      }
    }
  })
}, { name: 'mercurius' })
