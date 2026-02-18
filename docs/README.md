# CacheTrax

> A hash-indexed object cache with time and size based expiration

CacheTrax is a lightweight in-memory cache that combines a hash map for O(1) key lookups with a double linked list for ordered eviction. It supports automatic size-based pruning on insert, time-based expiration, and custom pruning functions for application-specific cache management.

## Features

- **O(1) Hash Lookups** -- cached entries are indexed by unique hash keys for constant-time reads
- **Double Linked List Ordering** -- entries maintain insertion order for predictable eviction behavior
- **Size-Based Pruning** -- set `maxLength` and the cache automatically evicts the oldest entry on insert
- **Time-Based Expiration** -- set `maxAge` in milliseconds to expire stale entries on prune
- **Touch to Refresh** -- reinvigorate an entry's timestamp to prevent it from aging out
- **Custom Pruning** -- pass a function to `pruneCustom` for application-specific eviction logic
- **Fable Service** -- extends `fable-serviceproviderbase` and registers as an `ObjectCache` service
- **Browser Compatible** -- includes a browser shim that attaches to `window.CacheTrax`

## Quick Start

```javascript
const libCacheTrax = require('cachetrax');

// Create a cache
let cache = new libCacheTrax();

// Store entries by hash
cache.put({ name: 'Alice', role: 'admin' }, 'user-alice');
cache.put({ name: 'Bob', role: 'editor' }, 'user-bob');

// Read by hash
cache.read('user-alice');  // { name: 'Alice', role: 'admin' }
cache.read('user-bob');    // { name: 'Bob', role: 'editor' }
cache.read('user-carol');  // false (cache miss)

// Remove an entry
cache.expire('user-bob');
cache.read('user-bob');    // false
```

## Installation

```bash
npm install cachetrax
```

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `maxLength` | Number | `0` | Maximum cache size. When exceeded, the oldest entry is evicted on insert. `0` means unlimited. |
| `maxAge` | Number | `0` | Maximum entry age in milliseconds. Entries older than this are removed during prune. `0` means no expiration. |

```javascript
let cache = new libCacheTrax();

// Limit cache to 100 entries
cache.maxLength = 100;

// Expire entries older than 5 minutes
cache.maxAge = 300000;
```

## Documentation

- [Architecture](architecture.md) -- how the hash map and linked list work together
- [Cache Operations](operations.md) -- `put`, `read`, `touch`, `expire` and `getNode`
- [Pruning Strategies](pruning.md) -- size-based, time-based and custom pruning

## Related Packages

- [fable](https://github.com/stevenvelozo/fable) - Service dependency injection framework
- [fable-serviceproviderbase](https://github.com/stevenvelozo/fable-serviceproviderbase) - Base class for Fable services
