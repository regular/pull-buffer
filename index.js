'use strict';

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
    if (queue.length) queue.shift()(end, data)
  }

  return function(read) {
    var timeoutWon = false
    return function next (end, cb) {
      if (cb) queue.push(cb)
      if (ended) return callback(ended)
      if (readPending) return
      if (end) return read(end, callback)
      ended = ended || end

      readPending = true
      read(end, function (end, data) {
        readPending = false
        if (end) {
          // always emit last item
          ended = end
          if (!buffer.length) return callback(end)
          let _buffer = buffer
          buffer = []
          return callback(null, _buffer), _buffer = null
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
