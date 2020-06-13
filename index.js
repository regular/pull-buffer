'use strict';
const debug = require('debug')('pull-buffer-until')
const never = ()=>false

module.exports = function buffer(cond, opts) {
  if (typeof cond == 'object') {
    opts = cond
    cond = undefined
  }
  cond = cond || never
  opts = opts || {}

  let timeout = null
  let queue = []
  let ended = false
  let readPending = false
  let buffer = []

  function callback(end, data) {
    if (queue.length) {
      debug(`cb end=${end}, data=${data}`)
      queue.shift()(end, data)
    }
  }

  function flush(end) {
    debug(`flush with ${buffer.length} items`)
    if (!buffer.length) return callback(end)
    let _buffer = buffer
    buffer = []
    debug('cb with incomplete buffer')
    return callback(null, _buffer)
  }

  return function(read) {
    let timeoutWon = false
    return function next (end, cb) {
      debug(`read called with end=${end}`)
      if (ended) return cb(ended)
      ended = ended || end
      if (end) {
        flush(end)
        return read(end, cb)
      }
      if (cb) queue.push(cb)
      if (readPending) return

      readPending = true
      debug('reading ...')
      read(null, function (end, data) {
        debug(`got end=${end}, data=${data}`)
        readPending = false
        if (end) {
          // always emit last item
          ended = end
          return flush(end)
        }
        buffer.push(data)
        if (timeoutWon) {
          timeoutWon = false
          if (!queue.length) return
        }
        clearTimeout(timeout)
        if (cond && cond(buffer)) {
          let _buffer = buffer
          buffer = []
          callback(null, _buffer)
          _buffer = null
          return
        }
        if (opts.timeout !== undefined) {
          timeout = setTimeout(function() {
            timeoutWon = true
            callback(null, buffer)
            buffer = []
          }, opts.timeout)
        }

        return next(end)
      })
    }
  }
}
