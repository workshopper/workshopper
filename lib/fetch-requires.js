const path = require('path')
    , bold = require('./term-util').bold

function fetchRequires (trackFile, callback) {
  var track    = require(trackFile)
    , main     = require.resolve(path.resolve(track.cwd, track.argv[1]))
    , required = track.required.filter(function (r) {
        return r != require.resolve('./exec-wrapper.js')
            && r != require.resolve('./module-use-tracker.js')
      })

  callback(null, main, required)
}

module.exports = fetchRequires