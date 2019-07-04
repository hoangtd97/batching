'use strict';

const assert = require('assert');
const _ = {
  random : require('lodash.random') 
};
const batch = require('./index');

let call_times = 0;

async function slowDoubleAPI(a) {
  call_times++;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (typeof a !== 'number') {
        reject(new Error(`a param expect a number, but received ${a}`));
      }
      resolve(a * 2);

    }, _.random(200, 700));
  });
}

const tasks = [
  { f : slowDoubleAPI, args : [1] },
  { f : slowDoubleAPI, args : [2] },
  { f : slowDoubleAPI, args : [1] },
  { f : slowDoubleAPI, args : [1] },
  { f : slowDoubleAPI, args : [2] },
  { f : slowDoubleAPI, args : [3] },
  { f : slowDoubleAPI, args : [1] },
  { f : slowDoubleAPI, args : [2] },
  { f : slowDoubleAPI, args : [1] },
  { f : slowDoubleAPI, args : [2] },
  { f : slowDoubleAPI, args : [1] },
  { f : slowDoubleAPI, args : [1] },
  { f : slowDoubleAPI, args : [2] },
  { f : slowDoubleAPI, args : [3] },
  { f : slowDoubleAPI, args : [1] },
  { f : slowDoubleAPI, args : [2] },
  { f : slowDoubleAPI, args : [1] },
  { f : slowDoubleAPI, args : [2] },
  { f : slowDoubleAPI, args : [3] },
  { f : slowDoubleAPI, args : [1] },
];

async function callWithoutBatch() {
  return await Promise.all(tasks.map(task => task.f(...task.args)));
};

async function callWithBatch() {
  return await Promise.all(tasks.map(task => batch(task.f, task.args)));
};

describe('Batch ', async () => {
  let resWithoutBatch, resWithBatch;
  
  before(async () => {
    [resWithoutBatch, resWithBatch] = await Promise.all([callWithoutBatch(), callWithBatch()]);
  });
  it ('should return valid result', () => {
    assert.deepEqual(resWithoutBatch, resWithBatch);
  });

  it ('should reduce call times', () => {
    assert.ok(call_times < tasks.length * 2);
  })
});

