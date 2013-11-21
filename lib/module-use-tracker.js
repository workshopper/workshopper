const fs = require('fs')

var data = { calls: [] }
  , on   = true

function writeData (outfile) {
  try {
    fs.writeFileSync(outfile, JSON.stringify(data))
  } catch(e) {
    console.error('Internal error!', e)
  }
}

function track (mod, outfile, fn, args, stack) {
  on = false
  var _args = Array.prototype.map.call(args, function (a) {
    if (typeof a == 'function')
      return '<Function>'
    if (Buffer.isBuffer(a))
      return '<Buffer>'
    return a
  })
  data.calls.push({ module: mod, fn: fn, args: _args, stack: stack })
  data.required = Object.keys(require.cache)
  writeData(outfile)
  on = true
}

function trackMethods (name, obj, trackFile) {
  Object.keys(obj).forEach(function (fn) {
    var err, stack

    if (typeof obj[fn] == 'function') {
      obj['__' + fn] = obj[fn]
      obj[fn] = function replacement () {
        try {
          err = new Error
          Error._prepareStackTrace = Error.prepareStackTrace
          Error.prepareStackTrace = function (err, stack) { return stack }
          Error.captureStackTrace(err, replacement)
          stack = err.stack.map(function (c) {
            return {
                type   : c.getTypeName()
              , fn     : c.getFunctionName()
              , method : c.getMethodName()
              , file   : c.getFileName()
              , line   : c.getLineNumber()
              , col    : c.getColumnNumber()
              , global : c.isToplevel()
              , native : c.isNative()
              , ctor   : c.isConstructor()
            }
          })
          Error.prepareStackTrace = Error._prepareStackTrace
        } catch (e) {}

        if (on) {
          track(name, trackFile, fn, arguments, stack)
        }
        return obj['__' + fn].apply(this, arguments)
      }
    }
  })
}

function init () {
  var outfile = process.argv[3]
    , modules = process.argv[4].split(',')

  data.argv    = process.argv
  data.cwd     = process.cwd()
  data.modules = modules

  writeData(outfile)

  modules.forEach(function (mod) {
    var m = require(mod)
    trackMethods(mod, m, outfile)
  })
}

module.exports.trackMethods = trackMethods
module.exports.init         = init
module.exports.args         = 2