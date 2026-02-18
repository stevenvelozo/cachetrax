# Architecture

CacheTrax combines two classic data structures to provide both fast keyed access and ordered eviction.

## Data Structures

### Hash Map

Two plain JavaScript objects provide O(1) lookups:

- `_HashMap` -- maps each hash key to its linked list **node** (including metadata such as creation timestamp)
- `_RecordMap` -- maps each hash key directly to the cached **datum** for simple value access

When an entry is added, both maps are updated. When an entry is expired or pruned, it is removed from both.

### Double Linked List

A custom `LinkedList` class maintains all cache entries in insertion order. Each node holds:

| Property | Description |
|----------|-------------|
| `Hash` | The unique key for this entry |
| `Datum` | The cached data |
| `Metadata` | An object for tracking expiration (e.g. `Created` timestamp) |
| `LeftNode` | Pointer to the previous (older) node |
| `RightNode` | Pointer to the next (newer) node |

New entries are appended to the **tail** (right end). When the cache exceeds `maxLength`, the **head** (left end, oldest entry) is popped off. This gives the cache FIFO eviction semantics.

## How Operations Map to the Structures

```
put(data, hash)
  ├── Hash exists? → Update Datum in _HashMap node and _RecordMap
  └── New hash?
       ├── LinkedList.push(data, hash) → append node to tail
       ├── _HashMap[hash] = node
       ├── _RecordMap[hash] = data
       ├── Set node.Metadata.Created = now
       └── If length > maxLength → pop head, delete from both maps

read(hash)
  └── _HashMap[hash].Datum  (or false on miss)

touch(hash)
  ├── LinkedList.remove(node)
  ├── Delete from both maps
  └── put(datum, hash) → re-insert as fresh entry at tail

expire(hash)
  ├── LinkedList.remove(node)
  ├── Delete from both maps
  └── Return the removed node

prune()
  ├── pruneBasedOnExpiration() → walk _HashMap, expire nodes older than maxAge
  └── pruneBasedOnLength() → pop head until length <= maxLength
```

## Auto-Generated Hashes

If no hash is provided to `put`, the linked list generates one automatically using the pattern `NODE[n]` where `n` is a monotonically increasing counter. This allows CacheTrax to be used as a simple ordered collection without requiring the caller to manage keys.

## Fable Service Integration

CacheTrax extends `fable-serviceproviderbase` and registers with `serviceType` set to `ObjectCache`. This means it can be wired into any Fable application through the standard service provider pattern:

```javascript
const libFable = require('fable');
const libCacheTrax = require('cachetrax');

let fable = new libFable();
let cache = fable.addServiceType('ObjectCache', libCacheTrax);
let myCache = fable.instantiateServiceProvider('ObjectCache');

myCache.put('some data', 'my-key');
```

## Browser Usage

The browser shim (`CacheTrax-Browser-Shim.js`) attaches the constructor to `window.CacheTrax` when running in a browser environment. When bundled with a tool like Quackage or Browserify, the cache is available globally:

```javascript
let cache = new CacheTrax();
cache.put(responseData, requestUrl);
```
