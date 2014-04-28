const fs         = require('fs')
    , path       = require('path')
    , mkdirp     = require('mkdirp')
    , glob       = require('glob')

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

  var cacheConfig = this.getData(this.dataFile)

  currLang = (cacheConfig && cacheConfig.lang) || currLang
  if (!currLang) {
    currLang = langs.filter(function (l) {
      if (l.toLowerCase() === 'en' || l === '')
        return true
    })[0]
  }
  this.currLang = currLang;

  this.show()
}

MultiLangsWorkshopper.prototype.show = function (currLang) {
  currLang = currLang || this.currLang
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

  this.updateData(this.dataFile, function (json) {
    json = json || {}
    json.lang = currLang
    return json
  })
}

MultiLangsWorkshopper.prototype.getData = Workshopper.prototype.getData

MultiLangsWorkshopper.prototype.updateData = Workshopper.prototype.updateData

module.exports = MultiLangsWorkshopper
