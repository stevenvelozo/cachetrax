# Pruning Strategies

CacheTrax provides three pruning mechanisms for managing cache size and freshness. They can be used individually or combined.

## Automatic Size Pruning on Insert

When `maxLength` is set to a value greater than zero, the cache automatically evicts the oldest entry whenever a new entry would exceed the limit. This happens inside `put` and requires no manual intervention.

```javascript
let cache = new libCacheTrax();
cache.maxLength = 3;

cache.put('A', 'k1');
cache.put('B', 'k2');
cache.put('C', 'k3');
// Cache: [A, B, C] — at capacity

cache.put('D', 'k4');
// Cache: [B, C, D] — A was automatically evicted

cache.read('k1');  // false
cache.read('k4');  // 'D'
```

The `maxLength` property can be changed at any time. Reducing it does not immediately evict entries; the excess entries remain until the next `put` triggers eviction or `prune` is called.

## prune(fComplete)

Run all pruning rules in sequence: first age-based expiration, then length-based eviction. The callback receives an array of all removed node objects.

```javascript
cache.maxAge = 60000;    // 1 minute
cache.maxLength = 100;

cache.prune((pRemovedRecords) =>
{
    console.log(`Pruned ${pRemovedRecords.length} entries`);
});
```

This is the recommended way to perform periodic cache maintenance. It handles both expiration strategies in a single call.

## pruneBasedOnExpiration(fComplete, pRemovedRecords)

Remove all entries older than `maxAge` milliseconds. If `maxAge` is `0`, no entries are removed.

```javascript
let cache = new libCacheTrax();
cache.maxAge = 5000; // 5 seconds

cache.put('old data', 'key-1');

// 6 seconds later...
setTimeout(() =>
{
    cache.pruneBasedOnExpiration((pRemoved) =>
    {
        console.log(pRemoved.length); // 1
        cache.read('key-1');          // false
    });
}, 6000);
```

The optional `pRemovedRecords` parameter lets you pass in an existing array to accumulate removed entries across multiple pruning calls.

## pruneBasedOnLength(fComplete, pRemovedRecords)

Pop entries from the head of the list until the cache length is within `maxLength`. If `maxLength` is `0`, no entries are removed.

```javascript
let cache = new libCacheTrax();

cache.put('A', 'k1');
cache.put('B', 'k2');
cache.put('C', 'k3');
cache.put('D', 'k4');
cache.put('E', 'k5');

cache.maxLength = 2;

cache.pruneBasedOnLength((pRemoved) =>
{
    console.log(pRemoved.length);       // 3
    console.log(cache.read('k1'));      // false (evicted)
    console.log(cache.read('k4'));      // 'D' (kept)
    console.log(cache.read('k5'));      // 'E' (kept)
});
```

## pruneCustom(fComplete, fPruneFunction, pRemovedRecords)

Apply a custom function to each cached entry. Entries for which the function returns `true` are expired.

The function receives three arguments: `(pDatum, pHash, pNode)`.

```javascript
let cache = new libCacheTrax();

cache.put({ type: 'image', size: 50000 }, 'img-1');
cache.put({ type: 'text', size: 200 }, 'doc-1');
cache.put({ type: 'image', size: 120000 }, 'img-2');
cache.put({ type: 'text', size: 500 }, 'doc-2');

// Evict all image entries larger than 100KB
cache.pruneCustom(
    (pRemoved) =>
    {
        console.log(`Removed ${pRemoved.length} large images`); // 1
    },
    (pDatum, pHash, pNode) =>
    {
        return pDatum.type === 'image' && pDatum.size > 100000;
    }
);
```

### Tracking Removed Records

All pruning methods accept an optional `pRemovedRecords` array that accumulates removed entries. This is useful when chaining multiple pruning passes:

```javascript
let tmpRemoved = [];

cache.pruneBasedOnExpiration((pRemoved) =>
{
    cache.pruneCustom((pAllRemoved) =>
    {
        console.log(`Total removed: ${pAllRemoved.length}`);
    },
    (pDatum) => { return pDatum.stale; },
    tmpRemoved);
}, tmpRemoved);
```

## Combining Strategies

A common pattern is to set both `maxLength` and `maxAge`, then call `prune` periodically:

```javascript
let cache = new libCacheTrax();
cache.maxLength = 1000;
cache.maxAge = 300000; // 5 minutes

// Add entries as they come in (auto-evicts on overflow)
cache.put(responseData, requestUrl);

// Periodically clean up expired entries
setInterval(() =>
{
    cache.prune((pRemoved) =>
    {
        if (pRemoved.length > 0)
        {
            console.log(`Cache maintenance: pruned ${pRemoved.length} entries`);
        }
    });
}, 60000);
```

The `maxLength` constraint is enforced on every `put`, so the cache never grows beyond the limit plus one during normal operation. The `prune` call handles the age-based cleanup and any length overage from reducing `maxLength` at runtime.
