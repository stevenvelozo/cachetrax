# CacheTrax

> A hash-indexed object cache with time and size based expiration

CacheTrax is a lightweight in-memory cache that combines a hash map for O(1) key lookups with a double linked list for ordered eviction. It supports automatic size-based pruning on insert, time-based expiration, and custom pruning functions for application-specific cache management.

## Features

- **O(1) Hash Lookups** -- cached entries are indexed by unique hash keys for constant-time reads
- **Double Linked List Ordering** -- entries maintain insertion order for predictable FIFO eviction
- **Size-Based Pruning** -- set `maxLength` and the cache automatically evicts the oldest entry on insert
- **Time-Based Expiration** -- set `maxAge` in milliseconds to expire stale entries on prune
- **Touch to Refresh** -- reinvigorate an entry's timestamp to prevent it from aging out
- **Custom Pruning** -- pass a function to `pruneCustom` for application-specific eviction logic
- **Fable Service** -- extends `fable-serviceproviderbase` and registers as an `ObjectCache` service
- **Browser Compatible** -- includes a browser shim that attaches to `window.CacheTrax`

## Quick Start

```javascript
const libCacheTrax = require('cachetrax');

// Create a cache with a size limit
let cache = new libCacheTrax();
cache.maxLength = 100;
cache.maxAge = 300000; // 5 minutes

// Store entries by hash
cache.put({ name: 'Alice', role: 'admin' }, 'user-alice');
cache.put({ name: 'Bob', role: 'editor' }, 'user-bob');

// Read by hash (returns false on miss)
cache.read('user-alice');  // { name: 'Alice', role: 'admin' }
cache.read('user-carol');  // false

// Refresh an entry to prevent expiration
cache.touch('user-alice');

// Manually remove an entry
cache.expire('user-bob');

// Run all pruning rules (age then length)
cache.prune((pRemovedRecords) =>
{
    console.log(`Pruned ${pRemovedRecords.length} entries`);
});
```

## Installation

```bash
npm install cachetrax
```

## How It Works

CacheTrax maintains two parallel data structures:

- A **hash map** (`_HashMap`) for O(1) lookups by key
- A **double linked list** (`_List`) for maintaining insertion order

New entries are appended to the tail of the list. When the cache exceeds `maxLength`, the head (oldest entry) is popped off. Time-based pruning walks the hash map and expires any entry whose `Created` timestamp is older than `maxAge` milliseconds.

```
put(data, hash)   → append to list tail, index in hash map
read(hash)         → hash map lookup, return datum or false
touch(hash)        → remove + re-insert at tail with fresh timestamp
expire(hash)       → remove from list and hash map
prune()            → expire by age, then pop by length
```

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `maxLength` | Number | `0` | Maximum cache size. `0` means unlimited. |
| `maxAge` | Number | `0` | Maximum entry age in milliseconds. `0` means no expiration. |

## API

| Method | Description |
|--------|-------------|
| `put(pData, pHash)` | Add or update a cache entry. Returns the stored datum. |
| `read(pHash)` | Retrieve a datum by hash. Returns `false` on miss. |
| `touch(pHash)` | Refresh timestamp and move to tail. Returns datum or `false`. |
| `expire(pHash)` | Remove an entry. Returns the removed node or `false`. |
| `getNode(pHash)` | Get the full node object including metadata. Returns `false` on miss. |
| `prune(fComplete)` | Run age then length pruning. Callback receives removed records array. |
| `pruneBasedOnExpiration(fComplete)` | Expire entries older than `maxAge`. |
| `pruneBasedOnLength(fComplete)` | Pop entries until at or below `maxLength`. |
| `pruneCustom(fComplete, fPruneFunction)` | Expire entries where the function returns `true`. |

## Documentation

Detailed documentation is available in the `docs/` folder:

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | How the hash map and linked list work together |
| [Cache Operations](docs/operations.md) | Full guide to `put`, `read`, `touch`, `expire` and `getNode` |
| [Pruning Strategies](docs/pruning.md) | Size-based, time-based and custom pruning |

## Testing

```bash
npm test
npm run coverage
```

## Related Packages

- [fable](https://github.com/stevenvelozo/fable) - Service dependency injection framework
- [fable-serviceproviderbase](https://github.com/stevenvelozo/fable-serviceproviderbase) - Base class for Fable services

## License

MIT

## Contributing

Pull requests are welcome. For details on our code of conduct, contribution process, and testing requirements, see the [Retold Contributing Guide](https://github.com/stevenvelozo/retold/blob/main/docs/contributing.md).
