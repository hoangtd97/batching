const _ = {
  random : require('lodash.random') 
};

const batch = require('./index');

batch.setLog(true);

// Assume you have a slow API
async function slowDoubleAPI(a) {
  console.log(`slowDoubleAPI(${a})`);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (typeof a !== 'number') {
        reject(new Error(`a param expect a number, but received ${a}`));
      }
      resolve(a * 2);

    }, _.random(200, 700));
  });
}

// and make a batch call
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

/*
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
*/

// You realize that a lot of calls have the same context, and don't want to repeat it, but you can't cache.

// Let batch them ...
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
// The first call slowDoubleAPI(1) will be executed, but later call slowDoubleAPI(1) before first call finish won't, just push to queue, and assign them to the first call result.

/////////////////////////////////////////////////
// testWithoutBatch();
testWithBatch();