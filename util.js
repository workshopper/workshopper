const path = require('path')


function repeat (ch, sz) {
  return new Array(sz + 1).join(ch)
}


function idFromName (id) {
  return id.toLowerCase()
    .replace(/\s/g, '_')
    .replace(/[^\w]/gi, '')
}


function dirFromName (exerciseDir, name) {
  return path.join(exerciseDir, idFromName(name))
}


module.exports.idFromName  = idFromName
module.exports.dirFromName = dirFromName
module.exports.repeat      = repeat