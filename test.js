var test = require('tape')
var pull = require('pull-stream')
var buffer = require('.')

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

test('should buffer frequent updates', function(t) {
  pull(
    timedSource([
      [0,   0],
      [250, 1],
      [10,  2],
      [250, 3],
      [2000,4],
      [10,  5]
    ]),
    buffer({timeout: 200, max: 1000}),
    //pull.through(console.log.bind(console)),
    pull.collect(function(end, arr) {
      t.notOk(end)
      t.deepEqual(arr, [[0],[1,2],[3],[4,5]])
      //console.log(arr)
      t.end();
    })
  )
})

test('should not buffer more than max items', function(t) {
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
    pull.collect((err, arr) => {
      t.equal(err, null);
      t.deepEqual(arr, [[5,6,7], [8,9,10], [11], [15,16,17], [18,19,20]]);
      t.end();
    })
  );
})

test('should pass through single item', function(t) {
  pull(
    timedSource([
      [0,   0],
    ]),
    buffer(),
    //pull.through(console.log.bind(console)),
    pull.collect(function(end, arr) {
      t.notOk(end)
      t.deepEqual(arr, [[0]])
      //console.log(arr)
      t.end();
    })
  )
})

test('should pass through single items after timeout', function(t) {
  var items = []
  var start = Date.now();
  pull(
    timedSource([
      [0,    0],
      [2000, 1]
    ]),
    buffer({timeout: 200}),
    pull.through(function(item) {
      //console.log(item)
      items.push(item)
    }),
    pull.drain()
  )
  setTimeout(function() {
    t.deepEqual(items, [[0]])
    t.end()
  }, 1000)
})

test('should pass through late last item', function(t) {
  pull(
    timedSource([
      [0,   0],
      [199, 1],
      [2000,2]
    ]),
    buffer({timeout:200}),
    //pull.through(console.log.bind(console)),
    pull.collect(function(end, arr) {
      t.notOk(end)
      t.deepEqual(arr, [[0,1],[2]])
      //console.log(arr)
      t.end();
    })
  )
})

