# Batching
Map multiple call async functions that have the same context with the earliest result returned.

## Usage
Assume you have a slow API

```js
async function slowDoubleAPI(a) {
  console.log(`slowDoubleAPI(${a})`);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (typeof a !== 'number') {
        reject(new Error(`a param expect a number, but received ${a}`));
      }
      resolve(a * 2);

    }, _.random(500, 700));
  });
}
```

and make a batch call
```js
async function testWithoutBatch() {
  try {
    let results = await Promise.all([
      slowDoubleAPI(1),
      slowDoubleAPI(2),
      slowDoubleAPI(1),
      slowDoubleAPI(1),
      slowDoubleAPI(2),
      slowDoubleAPI(3),
      slowDoubleAPI(1),
      slowDoubleAPI(2),
      slowDoubleAPI(1),
      slowDoubleAPI(1),
      slowDoubleAPI(2),
      slowDoubleAPI(1),
      slowDoubleAPI(1),
      slowDoubleAPI(2),
      slowDoubleAPI(3),
      slowDoubleAPI(1),
      slowDoubleAPI(2),
      slowDoubleAPI(1),
    ]);
    console.log('RESULT : ', results);
  }
  catch (err) {
    console.log(`ERROR ${err.message}`);
  }
};

testWithoutBatch();
```

You realize that a lot of calls have the same context, and don't want to repeat it.
```
slowDoubleAPI(1)
slowDoubleAPI(2)
slowDoubleAPI(1)
slowDoubleAPI(1)
slowDoubleAPI(2)
slowDoubleAPI(3)
slowDoubleAPI(1)
slowDoubleAPI(2)
slowDoubleAPI(1)
slowDoubleAPI(1)
slowDoubleAPI(2)
slowDoubleAPI(1)
slowDoubleAPI(1)
slowDoubleAPI(2)
slowDoubleAPI(3)
slowDoubleAPI(1)
slowDoubleAPI(2)
slowDoubleAPI(1)
RESULT :  [ 2, 4, 2, 2, 4, 6, 2, 4, 2, 2, 4, 2, 2, 4, 6, 2, 4, 2 ]
```

Let batch them ...
```js
const batch = require('batching');

async function testWithBatch() {
  try {
    let results = await Promise.all([
      batch(slowDoubleAPI, [1]),
      batch(slowDoubleAPI, [2]),
      batch(slowDoubleAPI, [1]),
      batch(slowDoubleAPI, [1]),
      batch(slowDoubleAPI, [2]),
      batch(slowDoubleAPI, [3]),
      batch(slowDoubleAPI, [1]),
      batch(slowDoubleAPI, [2]),
      batch(slowDoubleAPI, [1]),
      batch(slowDoubleAPI, [1]),
      batch(slowDoubleAPI, [2]),
      batch(slowDoubleAPI, [1]),
      batch(slowDoubleAPI, [1]),
      batch(slowDoubleAPI, [2]),
      batch(slowDoubleAPI, [3]),
      batch(slowDoubleAPI, [1]),
      batch(slowDoubleAPI, [2]),
      batch(slowDoubleAPI, [1]),
    ]);
    console.log('RESULT : ', results);
  }
  catch (err) {
    console.log(`ERROR ${err.message}`);
  }
};

testWithBatch();
```

The first call slowDoubleAPI(1) will be executed, but later call slowDoubleAPI(1) before first call finish won't, just push to queue, and assign them to the first call result when it finishes.
```
slowDoubleAPI(1)
slowDoubleAPI(2)
slowDoubleAPI(3)
RESULT :  [ 2, 4, 2, 2, 4, 6, 2, 4, 2, 2, 4, 2, 2, 4, 6, 2, 4, 2 ]
```

Let turn on log to view detail :
```js
batch.setLog(true);
```

Will print :
```
[batch] slowDoubleAPI() start, with :
 * ARGS        :  [1]
 * THIS        :  undefined

slowDoubleAPI(1)
[batch] slowDoubleAPI() start, with :
 * ARGS        :  [2]
 * THIS        :  undefined

slowDoubleAPI(2)
[batch] slowDoubleAPI() start, with :
 * ARGS        :  [3]
 * THIS        :  undefined

slowDoubleAPI(3)
[batch] slowDoubleAPI() finish successful, with :
 * TIME        :  601ms
 * ARGS        :  [3]
 * THIS        :  undefined
 * Callbacks   :  2
 * RESULT      :  6

[batch] slowDoubleAPI() finish successful, with :
 * TIME        :  644ms
 * ARGS        :  [1]
 * THIS        :  undefined
 * Callbacks   :  10
 * RESULT      :  2

[batch] slowDoubleAPI() finish successful, with :
 * TIME        :  676ms
 * ARGS        :  [2]
 * THIS        :  undefined
 * Callbacks   :  6
 * RESULT      :  4
```

# API

<a id="Batch"></a>

## Batch(options) ⇒ <code>function</code>
Create new batch

**Kind**: global function  
**Returns**: <code>function</code> - batch  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| options | <code>object</code> |  |  |
| [options.logStart] | <code>boolean</code> \| <code>function</code> | <code>false</code> | interface : (asyncFunc : function, context : object) => void |
| [options.logFinish] | <code>boolean</code> \| <code>function</code> | <code>false</code> | interface : (asyncFunc : function, context : object, err : object, res : any) => void |
| [options.isArgsEqual] | <code>function</code> | <code>_.isEqual</code> | arguments comparator |
| [options.isThisEqual] | <code>function</code> | <code>_.isEqual</code> | this pointer comparator |

**Example**  
```js
const { Batch } = require('batching');

const custom_batch = Batch({
  isArgsEqual : (a, b) => a[0] === b[0],
  isThisEqual : (a, b) => a === b,
  logFinish   : true
});
```

- [Batching](#Batching)
  - [Usage](#Usage)
- [API](#API)
  - [Batch(options) ⇒ <code>function</code>](#Batchoptions--codefunctioncode)
    - [Batch~wrap(asyncFunc, [thisArg]) ⇒ <code>function</code>](#BatchwrapasyncFunc-thisArg--codefunctioncode)
    - [Batch~batch(asyncFunc, args, thisArg) ⇒ <code>Promise</code>](#BatchbatchasyncFunc-args-thisArg--codePromisecode)
    - [Batch~setLog(options)](#BatchsetLogoptions)

<a id="Batch..wrap"></a>

-----

### Batch~wrap(asyncFunc, [thisArg]) ⇒ <code>function</code>
Wrap a async function to support batching

**Kind**: inner method of [<code>Batch</code>](#Batch)  
**Returns**: <code>function</code> - batchedAsyncFunction : (...args) => Promise  

| Param | Type |
| --- | --- |
| asyncFunc | <code>function</code> | 
| [thisArg] | <code>any</code> | 

**Example**  
```js
// Instead of : 
const batch = require('batching');

let user1 = await batch(findOne, { id : 10000 }, UserModel);
let user2 = await batch(findOne, { id : 10001 }, UserModel);
let user3 = await batch(findOne, { id : 10000 }, UserModel);

// Use can wrap findOne() :

const batchedFindOne = batch.wrap(findOne, UserModel);

// And call it :

let user1 = await batchedFindOne({ id : 1000 });
let user2 = await batchedFindOne({ id : 1001 });
let user3 = await batchedFindOne({ id : 1000 });
```
<a id="Batch..batch"></a>

-----

### Batch~batch(asyncFunc, args, thisArg) ⇒ <code>Promise</code>
Map multiple call async functions that have the same context with the earliest result returned.

**Kind**: inner method of [<code>Batch</code>](#Batch)  
**Returns**: <code>Promise</code> - that return by first finished invoking  

| Param | Type |
| --- | --- |
| asyncFunc | <code>function</code> | 
| args | <code>array</code> | 
| thisArg | <code>object</code> | 

**Example**  
```js
const batch = require('batching');

let store = await batch(findOneStore, [{ id : 10010 }]);

// with thisArg
let store = await batch(findOne, [{ id : 10010 }], StoreModel);
```
<a id="Batch..setLog"></a>

-----

### Batch~setLog(options)
Set log options

**Kind**: inner method of [<code>Batch</code>](#Batch)  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>boolean</code> \| <code>object</code> | turn log on or off, or customer log function |

**Example**  
```js
// set all log
batch.setLog(true);

// set specific log
batch.setLog({
  logStart : false,
  logEnd   : true,
});

// custom log function
batch.setLog({
  logStart : (asyncFunc, context) => {},
  logEnd   : (asyncFunc, context, err, res) => {},
});
```
<a id="Batch..clearContext"></a>
