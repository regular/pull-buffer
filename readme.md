# pull-buffer-until
[![NPM](https://nodei.co/npm/pull-buffer-until.png)](https://nodei.co/npm/pull-buffer-until/)

Group incoming items until either a condition is met or no new items arrived for a while. This is great for processing data in batches while still retaining realtime-ness. 
Like pull-group, but with a timeout, and like pull-debounce, but with collecting intermediate items.

## Example

``` js
const pull = require('pull-stream')
const bufferUntil = require('pull-buffer-unril')

function timedSource(data) {
  return pull(
    pull.values(data),
    pull.asyncMap(function(item, cb) {
      setTimeout(function() {
        cb(null, item[1])
      }, item[0])
    })
  )
}
pull(
  timedSource([
    [10,  5],
    [10,  6],
    [10,  7],
    [10,  8],
    [10,  9],
    [10, 10],
    [10, 11],
    [50, 15],
    [10, 16],
    [10, 17],
    [10, 18],
    [10, 19],
    [10, 20],
  ]),
  bufferUntil(buffer => buffer.length => 3, {timeout: 40}),
  pull.log()
)
/* => 
[5,6,7]
[8,9,10]
[11]
[15,16,17]
[18,19,20]

```

## API

`bufferUntil([condition], [opts])`

  - `condition` is called with the array of bufered items. If it returns a truthy value, the buffer is flushed (emitted downstream).
  - `opts`
    - `timeout`: If no new items arrive within the specified number of milliseconds, the buffer is flushed.

## License
MIT
