const path = require('path')

module.exports.dirFromName = function dirFromName (exerciseDir, name) {
  name = name.toLowerCase()
    .replace(/\s/g, '_')
    .replace(/[^\w]/gi, '')

  return path.join(exerciseDir, name)
}
