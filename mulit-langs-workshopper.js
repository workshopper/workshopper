const fs         = require('fs')
    , path       = require('path')
    , mkdirp     = require('mkdirp')
    , glob       = require('glob')

    , argv       = require('optimist')
                    .string('l')
                    .alias('l', 'lang')
                    .argv

    , Workshopper = require('./workshopper')

/**
 *  Multi Languages For Workshopper.
 */

function MultiLangsWorkshopper(config) {
  if (!(this instanceof MultiLangsWorkshopper))
    return new MultiLangsWorkshopper(config)

  this._config = config
  this.name = config.name
  this.appDir = config.appDir

  this.dataDir     = path.join(
      process.env.HOME || process.env.USERPROFILE
    , '.config'
    , this.name
  )
  this.dataFile = 'workshopper'

  mkdirp.sync(this.dataDir)

  this.menuItems = config.menuItems
  this.menuItems.push({
      name: 'langs'
    , handler: require('./langs')
  })

  var locales = this.locales = glob.sync(path.join(this.appDir, 'exercises*/locale.js'));
  var langs = this.langs = locales.map(function (l) {
    return path.basename(path.dirname(l)).split('_')[1] || ''
  })
  var LANG = process.env.LANG.split('.')[0].replace('_', '-')

  var currLang = langs.filter(function (l) {
    if (l.toLowerCase() === LANG.toLowerCase())
      return true
  })[0] || ''

  var _lang
  if (argv.l) {
    _lang = (argv.l).replace(/(_|\-)(\w+)/, function (m, $1, $2) { return '-' + $2.toUpperCase() })
    if (_lang === 'en') _lang = ''
  } else {
    var cacheConfig = this.getData(this.dataFile)
    _lang = cacheConfig && cacheConfig.lang
  }

  currLang = _lang || currLang
  if (!currLang) {
    currLang = langs.filter(function (l) {
      if (l.toLowerCase() === 'en' || l === '')
        return true
    })[0]
  }

  this.show(currLang)
}

MultiLangsWorkshopper.prototype.show = function (currLang) {
  var exerciseDir = path.join(
      this.appDir
    , 'exercises' + (currLang ? '_' + currLang : currLang)
  )
  var localeConfig = require(path.join(
      exerciseDir
    , 'locale.js'
  ))
  localeConfig.appDir = this.appDir
  localeConfig.exerciseDir = exerciseDir
  localeConfig.menuItems = this.menuItems.slice(0)

  var w = new Workshopper(localeConfig)
  w.parent = this

  this.currLang = currLang;
  this.updateData(this.dataFile, function (json) {
    json = json || {}
    json.lang = currLang
    return json
  })
}

MultiLangsWorkshopper.prototype.getData = Workshopper.prototype.getData

MultiLangsWorkshopper.prototype.updateData = Workshopper.prototype.updateData

module.exports = MultiLangsWorkshopper
