# pull-buffer-until
[![NPM](https://nodei.co/npm/pull-buffer-until.png)](https://nodei.co/npm/pull-buffer-until/)

Group incoming items until either a max item count is reached or no new items arrived for a while.
like pull-group, but with a timeout, and like pull-debounce, but with collecting intermediate items.

## Example

``` js
var pull = require('pull-stream')
var buffer = require('pull-buffer-unril')

function timedSource(data) {
  return pull(
    pull.values(data),
    pull.asyncMap(function(item, cb) {
      setTimeout(function() {
        cb(null, item[1])
      }, item[0]);
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
  buffer({timeout: 40, max: 3}),
  pull.log()
)
/* => 
[5,6,7]
[8,9,10]
[11]
[15,16,17]
[18,19,20]

```

## License
MIT
