const test = require('tape')
const pull = require('pull-stream')
const buffer = require('.')

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
    buffer({timeout: 200}),
    //pull.through(console.log.bind(console)),
    pull.collect(function(end, arr) {
      t.notOk(end)
      t.deepEqual(arr, [[0],[1,2],[3],[4,5]])
      //console.log(arr)
      t.end()
    })
  )
})

test('should flush buffer when condition is met', function(t) {
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
    buffer(b => b.length == 3, {timeout: 40}),
    pull.collect((err, arr) => {
      t.equal(err, null)
      t.deepEqual(arr, [[5,6,7], [8,9,10], [11], [15,16,17], [18,19,20]])
      t.end()
    })
  )
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
      t.end()
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
      [100, 1],
      [2000,2]
    ]),
    buffer({timeout:200}),
    //pull.through(console.log.bind(console)),
    pull.collect(function(end, arr) {
      t.notOk(end)
      t.deepEqual(arr, [[0,1],[2]])
      //console.log(arr)
      t.end()
    })
  )
})


test('end with buffer empty', t=>{
  pull(
    pull.values([1,2,3,4,5]),
    buffer(b=>b[b.length-1] == 5),
    pull.onEnd(err =>{
      t.error(err)
      t.end()
    })
  )
})

test('error propagation: before (no timeout)', t=>{
  pull(
    pull.values([1,2,3,4,5]),
    pull.asyncMap( (x, cb)=>{
      return cb(new Error('x is 4!'))
    }),
    buffer(b=>b[b.length-1] == 5),
    pull.onEnd(err =>{
      t.equal(err.message, 'x is 4!')
      t.end()
    })
  )
})
test('error propagation: after (no timeout)', t=>{
  pull(
    pull.values([1,2,3,4,5]),
    buffer(b=>b[b.length-1] == 5),
    pull.asyncMap( (x, cb)=>{
      return cb(new Error('x is 4!'))
    }),
    pull.onEnd(err =>{
      t.equal(err.message, 'x is 4!')
      t.end()
    })
  )
})

test('error propagation: before (with timeout)', t=>{
  pull(
    pull.values([1,2,3,4]),
    pull.asyncMap( (x, cb)=>{
      return cb(new Error('x is 4!'))
    }),
    buffer(b=>b[b.length-1] == 5, {timeout: 1000}),
    pull.onEnd(err =>{
      t.equal(err.message, 'x is 4!')
      t.end()
    })
  )
})

test('error propagation: after (with timeout)', t=>{
  pull(
    pull.values([1,2,3,4]),
    buffer(b=>b[b.length-1] == 5, {timeout: 1000}),
    pull.asyncMap( (x, cb)=>{
      return cb(new Error('x is 4!'))
    }),
    pull.onEnd(err =>{
      t.equal(err.message, 'x is 4!')
      t.end()
    })
  )
})

test('abort while waiting', t=>{
  pull(
    pull.values([1,2,3,4]),
    buffer(()=>true, {timeout: 3000}),
    pull.flatten(),
    pull.asyncMap( (x, cb)=>{
      if (x == 3) {
        return cb(new Error('x is 3!'))
      }
      cb(null, x)
    }),
    pull.collect( (err, data) =>{
      console.log(data)
      t.equal(err.message, 'x is 3!')
      t.end()
    })
  )
})

test('abort while reading', t=>{
  let drain
  pull(
    pull.values([1,2,3,4]),
    pull.asyncMap( (x, cb) =>{
      if (x<=2) return cb(null, x)
    }),
    buffer(()=>false),
    drain = pull.drain( x=>{
      console.log('drain', x)
    }, err =>{
      t.equal(err.message, 'timeout')
      t.end()
    })
  )
  setTimeout( ()=>{
    drain.abort(new Error('timeout'))
  }, 1000)
})
