'use strict';

const _ = {
  isEqual : require('lodash.isequal')
}

module.exports = Object.assign(Batch(), { Batch });

/**
 * Create new batch 
 * @param {object} options 
 * @param {boolean | function} [options.logStart=false] interface : (asyncFunc : function, context : object) => void
 * @param {boolean | function } [options.logFinish=false] interface : (asyncFunc : function, context : object, err : object, res : any) => void
 * @param {function } [options.isArgsEqual=_.isEqual]
 * @param {function } [options.isThisEqual=_.isEqual]
 */
function Batch(options) {
  const F_QUEUE = new Map();

  const OPTIONS = Object.assign({
    logStart    : false,
    logFinish   : false,
    isArgsEqual : _.isEqual,
    isThisEqual : _.isEqual
  }, options);

  return Object.assign(batch, { setLog, wrap });

  /**
   * Wrap a async function to support batching
   * @param {function} asyncFunc
   * @param {any} [thisArg]
   * 
   * @return {(...args) => Promise} batchedAsyncFunction
   */
  function wrap(asyncFunc, thisArg) {
    if (typeof asyncFunc !== 'function') {
      throw new TypeError(`asyncFunc expect a function, but received ${asyncFunc}`);
    }

    return function batchedAsyncFunction(...args) {
      return new Promise((resolve, reject) => {
        _batch(asyncFunc, args, thisArg, (err, res) => {
          if (err) {
            return reject(err);
          }
          resolve(res);
        });
      });
    }
  }
  
  /**
   * Map multiple call async functions that have the same context with the earliest result returned.
   * @param {function} asyncFunc 
   * @param {array}    args 
   * @param {object}   thisArg 
   * 
   * @return {Promise} that return by first finished invoking
   * 
   * @example
   * 
   * const batch = require('batching');
   * 
   * let store = await batch(findOneStore, [{ id : 10010 }]);
   * 
   * // with thisArg
   * let store = await batch(findOne, [{ id : 10010 }], StoreModel);
   */
  function batch(asyncFunc, args, thisArg) {
    if (typeof asyncFunc !== 'function') {
      throw new TypeError(`asyncFunc expect a function, but received ${asyncFunc}`);
    }
  
    return new Promise((resolve, reject) => {
      _batch(asyncFunc, args, thisArg, (err, res) => {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
    });
  }
  
  /**
   * Set log options
   * @param {boolean|object} options - turn log on or off, or customer log function
   * 
   * @example 
   * 
   * // set all log
   * batch.setLog(true);
   * 
   * // set specific log
   * batch.setLog({
   *   logStart : false,
   *   logEnd   : true,
   * });
   * 
   * // custom log function
   * batch.setLog({
   *   logStart : (asyncFunc, context) => {},
   *   logEnd   : (asyncFunc, context, err, res) => {},
   * });
   */
  
  function setLog(options) {
    if (typeof options === 'boolean') {
      OPTIONS.logStart = OPTIONS.logFinish = options;
    }
    if (typeof options === 'object') {
      OPTIONS.logStart  = options.hasOwnProperty('logStart')  ? options.logStart  :  OPTIONS.logStart; 
      OPTIONS.logFinish = options.hasOwnProperty('logFinish') ? options.logFinish : OPTIONS.logFinish;
    } 
  }
  
  function _batch(asyncFunc, args, thisArg, callback) {
    let contexts, context, ci;
    contexts = F_QUEUE.get(asyncFunc);
    if (Array.isArray(contexts)) {
      [ci, context] = getContext(contexts, args, thisArg);
      if (context){
        if (Array.isArray(context.callbacks)) {
          return context.callbacks.push(callback);
        }
        else {
          context.callbacks = [callback];
        }
      }
      else {
        context = {
          start_at  : new Date(),
          thisArg   : thisArg,
          args      : args,
          callbacks : [callback]
        };
        ci = contexts.push(context) - 1;
      }
    }
    else {
      context = {
        start_at  : new Date(),
        thisArg   : thisArg,
        args      : args,
        callbacks : [callback]
      };
      contexts = [context];
      F_QUEUE.set(asyncFunc, contexts);
      ci = 0;
    }
  
    logStart(asyncFunc, context);
  
    asyncFunc
      .apply(thisArg, args)
      .then(res => {
        if (context && Array.isArray(context.callbacks)) {
          clearContext({ contexts, index : ci, asyncFunc });

          context.callbacks.forEach(cb => cb(null, res));
  
          context.end_at = new Date();
          logFinish(asyncFunc, context, null, res);
        }
      })
      .catch(err => {
        if (context && Array.isArray(context.callbacks)) {
          clearContext({ contexts, index : ci, asyncFunc });

          context.callbacks.forEach(cb => cb(err));
  
          context.end_at = new Date();
          logFinish(asyncFunc, context, err);
        }
      });
  }

  function clearContext({ contexts, index, asyncFunc }) {
    if (index >= 0) {
      contexts[index] = undefined;
    }
    if (contexts.every(item => item === undefined)) {
      F_QUEUE.delete(asyncFunc);
    }
  }

  function logStart(asyncFunc, context) {
    if (OPTIONS.logStart) {
      if (typeof OPTIONS.logStart === 'function') {
        OPTIONS.logStart(asyncFunc, context);
      }
      else {
        console.log(`[batch] ${asyncFunc.name}() start, with :`);
        console.log(' * ARGS        : ', JSON.stringify(context.args));
        console.log(' * THIS        : ', stringifyThisArg(context.thisArg), '\n');
      }
    }
  }

  function logFinish(asyncFunc, context, err, res) {
    if (OPTIONS.logFinish) {
      if (typeof OPTIONS.logFinish === 'function') {
        OPTIONS.logFinish(asyncFunc, context, err, res);
      }
      else {
        let status = err ? 'fail' : 'successful, with : ';
        console.log(`[batch] ${asyncFunc.name}() finish ${status}`);
        console.log(' * TIME        : ', msDiff(context.start_at, context.end_at) + 'ms');
        console.log(' * ARGS        : ', JSON.stringify(context.args));
        console.log(' * THIS        : ', stringifyThisArg(context.thisArg));
        console.log(' * Callbacks   : ', context.callbacks.length);
        if (err) {
          console.log(' * ERROR       : ', JSON.stringify(err));
        }
        else {
          console.log(' * RESULT      : ', JSON.stringify(res), '\n');
        }
      } 
    }
  }

  function getContext(contexts, args, thisArg) {
    if (Array.isArray(contexts)) {
      for (let i in contexts) {
        let context = contexts[i];
        if (OPTIONS.isArgsEqual(args, context.args) && OPTIONS.isThisEqual(thisArg, context.thisArg)) {
          return [i, context];
        }
      }
    }
    return [-1, undefined];
  }
}

function msDiff(date_start, date_end) {
  return (date_end.getTime() - date_start.getTime());
}

function stringifyThisArg(thisArg) {
  if (typeof thisArg === 'function') {
    return thisArg.name + '()';
  }
  return JSON.stringify(thisArg);
}