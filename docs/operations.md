# Cache Operations

CacheTrax provides five core operations for managing cached entries.

## put(pData, pHash)

Add a new entry or update an existing one. Returns the stored datum.

```javascript
let cache = new libCacheTrax();

// Store with an explicit hash
cache.put({ title: 'Dune', author: 'Herbert' }, 'book-1');

// Update an existing entry (same hash)
cache.put({ title: 'Dune', author: 'Frank Herbert' }, 'book-1');

// Store without a hash (auto-generated as NODE[1], NODE[2], etc.)
cache.put('anonymous data');
```

**Behavior:**

- If the hash already exists, the datum is updated in place. The entry keeps its position in the list and its original creation timestamp.
- If the hash is new, a node is appended to the tail of the linked list and timestamped.
- If `maxLength` is set and the cache is over capacity, the oldest entry (head) is automatically evicted.

## read(pHash)

Retrieve a cached datum by hash. Returns `false` on a cache miss.

```javascript
cache.put('Alice', 'user-1');

cache.read('user-1');     // 'Alice'
cache.read('user-999');   // false
```

Reading does not change the entry's position or timestamp. If you want to refresh an entry on access, use `touch` instead.

## touch(pHash)

Refresh an entry's timestamp and move it to the tail of the list. This prevents the entry from being evicted by age-based pruning. Returns the datum, or `false` if the hash is not found.

```javascript
cache.maxAge = 60000; // 1 minute

cache.put('frequently accessed', 'hot-key');

// 30 seconds later: refresh it so it doesn't expire
cache.touch('hot-key');
```

**Behavior:**

Touch removes the node from its current position in the list, then re-inserts it as a fresh entry at the tail. The creation timestamp is reset to the current time.

## expire(pHash)

Manually remove an entry from the cache. Returns the removed node object (including its `Datum`, `Hash`, and `Metadata`), or `false` if the hash is not found.

```javascript
cache.put('temporary', 'temp-key');

let removed = cache.expire('temp-key');
// removed.Datum === 'temporary'
// removed.Hash === 'temp-key'

cache.read('temp-key');  // false

// Expiring a non-existent key
cache.expire('temp-key');  // false
```

## getNode(pHash)

Retrieve the full linked list node for an entry, including internal metadata. Returns `false` on a cache miss.

```javascript
cache.put('some data', 'my-key');

let node = cache.getNode('my-key');
// node.Hash     === 'my-key'
// node.Datum    === 'some data'
// node.Metadata === { Created: 1708300000000 }
```

This is useful for inspecting when an entry was created or for implementing custom eviction logic.

## RecordMap

The `RecordMap` property provides direct access to the hash-to-datum mapping as a plain object. This can be useful for iterating over all cached values or for debugging.

```javascript
cache.put('Alice', 'user-1');
cache.put('Bob', 'user-2');

cache.RecordMap;
// { 'user-1': 'Alice', 'user-2': 'Bob' }
```
