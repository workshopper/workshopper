function repeat (ch, sz) {
  return new Array(sz + 1).join(ch)
}

function wrap (s_, n) {
  var s = String(s_)
  return s + repeat(' ', Math.max(0, n + 1 - s.length))
}

function cfn (sc, ec) {
  return function (s) {
    return sc + s + ec
  }
}

var bold   = cfn('\x1B[1m',  '\x1B[22m')
  , italic = cfn('\x1B[3m',  '\x1B[23m')
  , red    = cfn('\x1B[31m', '\x1B[39m')
  , green  = cfn('\x1B[32m', '\x1B[39m')
  , yellow = cfn('\x1B[33m', '\x1B[39m')
  , blue   = cfn('\x1B[34m', '\x1B[39m')

module.exports = {
    repeat : repeat
  , wrap   : wrap
  , bold   : bold
  , italic : italic

  , red    : red
  , green  : green
  , yellow : yellow
  , blue   : blue
}