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

const TASKS = [
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

async function callWithoutBatch({ tasks = TASKS }={}) {
  return await Promise.all(tasks.map(task => task.f(...task.args)));
};

async function callWithBatch({ tasks = TASKS, batcher = batch }={}) {
  return await Promise.all(tasks.map(task => batcher(task.f, task.args)));
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
    assert.ok(call_times < TASKS.length * 2);
  });

  it ('should support custom comparator', async () => {
    const { Batch } = batch;

    const custom_batch = Batch({
      isArgsEqual : (a, b) => a[0] === b[0],
      isThisEqual : (a, b) => a === b
    });

    const [resWithoutCustomBatch, resWithCustomBatch] = await Promise.all([callWithoutBatch(), callWithBatch({ batcher : custom_batch })]);

    assert.deepEqual(resWithoutCustomBatch, resWithCustomBatch);
  });

  it ('should wrap a async function to support batching', async () => {
    const { Batch } = batch;

    const custom_batch = Batch({
      isArgsEqual : (a, b) => a[0] === b[0],
      isThisEqual : (a, b) => a === b
    });

    const batchedSlowDoubleAPI = custom_batch.wrap(slowDoubleAPI);

    const new_tasks = TASKS.map(task => Object({ f : batchedSlowDoubleAPI, args : task.args }));

    const [resWithoutBatchWrap, resWithBatchWrap] = await Promise.all([callWithoutBatch(), callWithoutBatch({ tasks : new_tasks })]);

    assert.deepEqual(resWithoutBatchWrap, resWithBatchWrap);
  })
});

