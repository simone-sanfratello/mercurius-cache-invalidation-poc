```
docker-compose up -d
npm i
node index.js
```

open `http://localhost:8080/graphiql`

to see an invalidation example, run twice `{ users(page: 2) {name} }` to use the cache, then `mutation { addUser(user: { name: "John" }) {id}}` to invalidate
