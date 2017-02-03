var Adventure = require("./adventure")
  , inherits     = require('util').inherits

module.exports = LegacyWorkshopper

function LegacyWorkshopper(options) {
  if (!(this instanceof LegacyWorkshopper))
    return new LegacyWorkshopper(options)

  if (options.showHeader === undefined)
    options.showHeader = true

  Adventure.apply(this, [options])
  this.execute(process.argv.slice(2))
}

inherits(LegacyWorkshopper, Adventure)