const tuple   = require('tuple-stream')
    , through = require('through')
    , split   = require('split')

const wrap    = require('./term-util').wrap
    , red     = require('./term-util').red
    , green   = require('./term-util').green

function colourfn (type) {
  return type == 'PASS' ? green : red
}

function compare (actual, expected, long, callback) {
  var equal  = true
    , write = function (pair) {
        var eq = pair[0] === pair[1]

        equal = equal && eq

        if (long) {
          this.queue('ACTUAL:   '
            + colourfn(eq ? 'PASS' : 'FAIL')(JSON.stringify(pair[0]))
            + '\n'
            + 'EXPECTED: '
            + JSON.stringify(pair[1])
            + '\n\n'
          )
        } else {
          this.queue(
              colourfn(eq ? 'PASS' : 'FAIL')(
                  wrap(JSON.stringify(pair[0]), 30)
                + ' ' + (eq ? '  ' : '!=') + ' '
                + wrap(JSON.stringify(pair[1]), 30)
              )
            + '\n'
          )
        }
      }
    , end    = function () {
        this.queue(null)
        if (!equal)
          return callback(null, equal ? 'pass' : 'fail')
      }
    , output = through(write, end).pause()

  if (!long) {
    output.queue(wrap('ACTUAL', 30) + '    EXPECTED\n')
    output.queue(wrap('------', 30) + '    --------\n')
  }

  tuple(actual.pipe(split()), expected.pipe(split()))
    .pipe(output)
    .pipe(process.stdout)

  output.resume()

  return output
}

module.exports = compare