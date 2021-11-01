# todo

- explicit invalidation (fastify decorate function to call in order to invalidate cache entries)
- gc?

- `invalidate` and `references` functions should be __async__?
- doc
  - extendKey => now is async
  - cacheSize => size (only for memory type)
  - redis
    - https://redis.io/topics/lru-cache
    - cacheSize is ignored
    - can share cache across services/federation
  - invalidaton caveats
    - resolvers must always return entities ids
  - federation: has its onw cache
  - more real world scenarios
  - update `examples`
- notes:
  - cached data must be sync invalidated, example after mutation
  - removed `async-dedupe` because ttl must be managed by storage
- benchmarks
- esm support?
- jsdoc / ts support?
- modules: cache-interface, cache-redis ...
