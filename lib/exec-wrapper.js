const path = require('path')
    , mod  = require(process.argv[2])

// load whatever we've been told to in the first arg
mod.init()
// remove a trace of this wrapper.. sneaky sneaky
process.argv.splice(1, 2 + (mod.args || 0))
require(path.resolve(process.cwd(), process.argv[1]))