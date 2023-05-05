"use strict";

(function (f) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = f();
  } else if (typeof define === "function" && define.amd) {
    define([], f);
  } else {
    var g;
    if (typeof window !== "undefined") {
      g = window;
    } else if (typeof global !== "undefined") {
      g = global;
    } else if (typeof self !== "undefined") {
      g = self;
    } else {
      g = this;
    }
    g.CacheTrax = f();
  }
})(function () {
  var define, module, exports;
  return function () {
    function r(e, n, t) {
      function o(i, f) {
        if (!n[i]) {
          if (!e[i]) {
            var c = "function" == typeof require && require;
            if (!f && c) return c(i, !0);
            if (u) return u(i, !0);
            var a = new Error("Cannot find module '" + i + "'");
            throw a.code = "MODULE_NOT_FOUND", a;
          }
          var p = n[i] = {
            exports: {}
          };
          e[i][0].call(p.exports, function (r) {
            var n = e[i][1][r];
            return o(n || r);
          }, p, p.exports, r, e, n, t);
        }
        return n[i].exports;
      }
      for (var u = "function" == typeof require && require, i = 0; i < t.length; i++) o(t[i]);
      return o;
    }
    return r;
  }()({
    1: [function (require, module, exports) {
      var libNPMModuleWrapper = require('./CacheTrax.js');
      if (typeof window === 'object' && !window.hasOwnProperty('CacheTrax')) {
        window.CacheTrax = libNPMModuleWrapper;
      }
      module.exports = libNPMModuleWrapper;
    }, {
      "./CacheTrax.js": 2
    }],
    2: [function (require, module, exports) {
      /**
      * Cache data structure with:
      *  - enumerable items
      *  - unique hash item access (if none is passed in, one is generated)
      *  - size (length) expiration
      *  - controllable expiration (e.g. keep in cache longer if older/less likely to change)
      *  - time-based expiration
      *  - custom expiration based on passed-in function
      *
      * Also:
      *  - built to work well with browserify
      *  - no dependencies at all
      *  - pet friendly
      *
      * @license MIT
      *
      * @author Steven Velozo <steven@velozo.com>
      * @module CashMoney
      */

      /**
      * Quality Cache Goodness
      *
      * @class CashMoney
      * @constructor
      */

      const libLinkedList = require("./LinkedList.js");
      class CashMoney {
        constructor() {
          // The map of node objects by hash because Reasons.
          this._HashMap = {};
          this._List = new libLinkedList();

          // If the list gets over maxLength, we will automatically remove nodes on insertion.
          this.maxLength = 0;

          // If cache entries get over this age, they are removed with prune
          this.maxAge = 0;
        }

        // Add (or update) a node in the cache
        put(pData, pHash) {
          // If the hash of the record exists
          if (this._HashMap.hasOwnProperty(pHash)) {
            // Just update the hashed records datum
            this._HashMap[pHash].Datum = pData;
            return this._HashMap[pHash].Datum;
          }
          let tmpNode = this._List.push(pData, pHash);
          this._HashMap[tmpNode.Hash] = tmpNode;

          // Automatically prune if over length, but only prune this nodes worth.
          if (this.maxLength > 0 && this._List.length > this.maxLength) {
            // Pop it off the head of the list
            tmpNode = this._List.pop();
            // Also remove it from the hashmap
            delete this._HashMap[tmpNode.Hash];
          }

          // Now some expiration properties on the node metadata... namely the birthdate in ms of the node
          tmpNode.Metadata.Created = +new Date();
          return tmpNode.Datum;
        }

        // Reinvigorate a node based on hash, updating the timestamp and moving it to the head of the list (also removes custom metadata)
        touch(pHash) {
          if (!this._HashMap.hasOwnProperty(pHash)) return false;

          // Get the old node out of the list
          let tmpNode = this._List.remove(this._HashMap[pHash]);
          // Remove it from the hash map
          delete this._HashMap[pHash];

          // Now put it back, fresh.
          return this.put(tmpNode.Datum, tmpNode.Hash);
        }

        // Expire a cached record based on hash
        expire(pHash) {
          if (!this._HashMap.hasOwnProperty(pHash)) return false;
          let tmpNode = this._HashMap[pHash];

          // Remove it from the list of cached records
          tmpNode = this._List.remove(tmpNode);
          // Also remove it from the hashmap
          delete this._HashMap[tmpNode.Hash];

          // Return it in case the consumer wants to do anything with it
          return tmpNode;
        }

        // Prune records from the cached set based on maxAge
        pruneBasedOnExpiration(fComplete, pRemovedRecords) {
          let tmpRemovedRecords = typeof pRemovedRecords === 'undefined' ? [] : pRemovedRecords;
          if (this.maxAge < 1) return fComplete(tmpRemovedRecords);

          // Now enumerate each record and remove any that are expired
          let tmpNow = +new Date();
          let tmpKeys = Object.keys(this._HashMap);
          for (let i = 0; i < tmpKeys.length; i++) {
            // Expire the node if it is older than max age milliseconds
            if (tmpNow - this._HashMap[tmpKeys[i]].Metadata.Created >= this.maxAge) tmpRemovedRecords.push(this.expire(tmpKeys[i]));
          }
          fComplete(tmpRemovedRecords);
        }

        // Prune records from the cached set based on maxLength
        pruneBasedOnLength(fComplete, pRemovedRecords) {
          let tmpRemovedRecords = typeof pRemovedRecords === 'undefined' ? [] : pRemovedRecords;

          // Pop records off until we have reached maxLength unless it's 0
          if (this.maxLength > 0) while (this._List.length > this.maxLength) tmpRemovedRecords.push(this._List.pop());
          return fComplete(tmpRemovedRecords);
        }

        // Prune records from the cached set based on passed in pPruneFunction(pDatum, pHash, pNode) -- returning true expires it
        pruneCustom(fComplete, fPruneFunction, pRemovedRecords) {
          let tmpRemovedRecords = typeof pRemovedRecords === 'undefined' ? [] : pRemovedRecords;
          let tmpKeys = Object.keys(this._HashMap);
          for (let i = 0; i < tmpKeys.length; i++) {
            let tmpNode = this._HashMap[tmpKeys[i]];
            // Expire the node if the passed in function returns true
            if (fPruneFunction(tmpNode.Datum, tmpNode.Hash, tmpNode)) tmpRemovedRecords.push(this.expire(tmpKeys[i]));
          }
          fComplete(tmpRemovedRecords);
        }

        // Prune the list down to the asserted rules (max age then max length if still too long)
        prune(fComplete) {
          let tmpRemovedRecords = [];

          // If there are no cached records, we are done.
          if (this._List.length < 1) return fComplete(tmpRemovedRecords);

          // Now prune based on expiration time
          this.pruneBasedOnExpiration(fExpirationPruneComplete => {
            // Now prune based on length, then return the removed records in the callback.
            this.pruneBasedOnLength(fComplete, tmpRemovedRecords);
          }, tmpRemovedRecords);
        }

        // Read a datum by hash from the cache
        read(pHash) {
          if (!this._HashMap.hasOwnProperty(pHash)) return false;
          return this._HashMap[pHash].Datum;
        }

        // Get a low level node (including metadata statistics) by hash from the cache
        getNode(pHash) {
          if (!this._HashMap.hasOwnProperty(pHash)) return false;
          return this._HashMap[pHash];
        }
      }
      module.exports = CashMoney;
    }, {
      "./LinkedList.js": 4
    }],
    3: [function (require, module, exports) {
      /**
      * Double Linked List Node
      *
      * @author Steven Velozo <steven@velozo.com>
      * @module CashMoney
      */

      /**
      * Linked List Node Prototype
      *
      * @class LinkedListNode
      * @constructor
      */

      class LinkedListNode {
        constructor() {
          this.Hash = false;
          this.Datum = false;

          // This is where expiration and other elements are stored;
          this.Metadata = {};
          this.LeftNode = false;
          this.RightNode = false;

          // To allow safe specialty operations on nodes
          this.__ISNODE = true;
        }
      }
      module.exports = LinkedListNode;
    }, {}],
    4: [function (require, module, exports) {
      "use strict";

      /**
      * Simple double linked list to hold the cache entries in, in order.
      *
      * @author Steven Velozo <steven@velozo.com>
      * @module FeeFiFo
      */
      const libLinkedListNode = require('./LinkedList-Node.js');

      /**
      * Quality Cache Goodness
      *
      * @class CashMoney
      * @constructor
      */

      class LinkedList {
        constructor() {
          // Total number of nodes ever processed by this ADT
          this.totalNodes = 0;

          // The length of the set of nodes currently in the list
          this.length = 0;
          this.head = false;
          this.tail = false;
        }

        // Create a node object.
        initializeNode(pDatum, pHash) {
          // Don't allow undefined to be added to the list because of reasons
          if (typeof pDatum === 'undefined') return false;
          this.totalNodes++;

          // Get (or create) a unique hash
          let tmpHash = typeof pHash != 'undefined' ? pHash : "NODE[".concat(this.totalNodes, "]");
          let tmpNode = new libLinkedListNode();
          tmpNode.Hash = tmpHash;
          tmpNode.Datum = pDatum;
          return tmpNode;
        }

        // Add a node to the end (right of tail) of the list.
        append(pDatum, pHash) {
          // TODO: Should we check if pDatum is actually a node and do the "right" thing?
          let tmpNode = this.initializeNode(pDatum, pHash);
          if (!tmpNode) return false;

          // The list just got longer!
          this.length++;

          // If the list was empty, create a new list from it (it isn't possible to have a tail with no head)
          if (this.length == 1) {
            this.head = tmpNode;
            this.tail = tmpNode;
            return tmpNode;
          }
          this.tail.RightNode = tmpNode;
          tmpNode.LeftNode = this.tail;
          this.tail = tmpNode;
          return tmpNode;
        }

        // Append to tail of list (FIFO)
        push(pDatum, pHash) {
          return this.append(pDatum, pHash);
        }

        // Add a node to the beginning (left of head) of the list.
        prepend(pDatum, pHash) {
          // TODO: Should we check if pDatum is actually a node and do the "right" thing?
          let tmpNode = this.initializeNode(pDatum, pHash);
          if (!tmpNode) return false;

          // The list just got longer!
          this.length++;

          // If the list was empty, create a new list from it (it isn't possible to have a tail with no head)
          if (this.length == 1) {
            this.head = tmpNode;
            this.tail = tmpNode;
            return tmpNode;
          }
          this.head.LeftNode = tmpNode;
          tmpNode.RightNode = this.head;
          this.head = tmpNode;
          return tmpNode;
        }

        // Remove a node from the list
        remove(pNode) {
          if (typeof pNode === 'undefined') return false;
          if (!pNode.__ISNODE) return false;
          this.length--;

          // Last element in list.  Empty it out.
          if (this.length < 1) {
            this.head = false;
            this.tail = false;
            return pNode;
          }

          // It's somewhere in the middle, surgically remove it.
          if (pNode.LeftNode && pNode.RightNode) {
            pNode.LeftNode.RightNode = pNode.RightNode;
            pNode.RightNode.LeftNode = pNode.LeftNode;
            pNode.RightNode = false;
            pNode.LeftNode = false;
            return pNode;
          }

          // It's the tail
          if (pNode.LeftNode) {
            pNode.LeftNode.RightNode = false;
            this.tail = pNode.LeftNode;
            pNode.LeftNode = false;
            return pNode;
          }

          // It must be the head
          pNode.RightNode.LeftNode = false;
          this.head = pNode.RightNode;
          pNode.RightNode = false;
          return pNode;
        }

        // Remove the head of the list (FIFO)
        pop() {
          return this.remove(this.head);
        }

        // Enumerate over each node IN ORDER, running the function fAction(pDatum, pHash, fCallback) then calling the function fComplete callback when done
        each(fAction, fComplete) {
          if (this.length < 1) return fComplete();
          let tmpNode = false;
          let fIterator = pError => {
            // If the user passed in a callback with an error, call their callback with the error
            if (pError) return fComplete(pError);

            // If there is no node, this must be the initial run.
            if (!tmpNode) tmpNode = this.head;
            // Check if we are at the tail of the list
            else if (!tmpNode.RightNode) return fComplete();
            // Proceed to the next node
            else tmpNode = tmpNode.RightNode;

            // Call the actual action
            // I hate this pattern because long tails eventually cause stack overflows.
            fAction(tmpNode.Datum, tmpNode.Hash, fIterator);
          };

          // Now kick off the iterator
          return fIterator();
        }

        // Seek a specific node, 0 is the index of the first node.
        seek(pNodeIndex) {
          if (!pNodeIndex) return false;
          if (this.length < 1) return false;
          if (pNodeIndex >= this.length) return false;
          let tmpNode = this.head;
          for (let i = 0; i < pNodeIndex; i++) {
            tmpNode = tmpNode.RightNode;
          }
          return tmpNode;
        }
      }
      module.exports = LinkedList;
    }, {
      "./LinkedList-Node.js": 3
    }]
  }, {}, [1])(1);
});