'use strict';

module.exports = function buffer(opts) {
  opts = opts || {}
  var ms = opts.timeout || 1000
  var max = opts.max || 100
  var timeout = null
  var queue = []
  var ended = false
  var readPending = false
  var buffer = []

  function callback(end, data) {
    if (queue.length) queue.shift()(end, data)
  }

  return function(read) {
    var timeoutWon = false
    return function next (end, cb) {
      if (cb) queue.push(cb)
      if (ended) return callback(ended);
      if (readPending) return;
      if (end) return read(end, callback);
      ended = ended || end;

      readPending = true
      read(end, function (end, data) {
        readPending = false
        if (end) {
          // always emit last item
          ended = end;
          if (!buffer.length) return callback(end)
          return callback(null, buffer), buffer = []
        }
        buffer.push(data)
        if (timeoutWon) {
          timeoutWon = false
          if (!queue.length) return
        }
        clearTimeout(timeout);
        if (buffer.length >= max) {
          var _buffer = buffer
          buffer = []
          callback(null, _buffer)
          _buffer = null
          return
        } 
        timeout = setTimeout(function() {
          timeoutWon = true
          callback(null, buffer);
          buffer = []
        }, ms)

        return next(end)
      })
    }
  }
}
