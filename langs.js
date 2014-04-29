const fs        = require('fs')
    , path      = require('path')
    , showMenu  = require('./menu')

function langs(self) {
  var menuItems = (self.menuItems && self.menuItems.slice(0)) || []
  menuItems.forEach(function (v, i) {
    if (v.name == 'langs') {
      var o = {};
      o.name = 'back';
      o.handler = function () {
        self.printMenu();
      };
      menuItems[i] = o;
    }
  })
  var menuItemsNames = menuItems.map(function (item) {
    return item.name.toLowerCase()
  })
  var currLang = self.parent.currLang
  var langs = self.parent.langs.slice(0).map(function (l) {
    var o = l
    if (l === "")
      l = 'en (maybe)'
    if (o === currLang)
      l += ' √'
    return l
  })

  var options = {
      name          : self.appName
    , title         : self.title
    , subtitle      : self.langSubtitle || self.subtitle
    , width         : self.width
    , completed     : []
    , exercises     : langs
    , extras        : menuItemsNames
    , menu          : self.menuOptions
    , menuItems     : menuItems
  }

  var menu = showMenu(options)

  if (options.menuItems.length) {
    options.menuItems.forEach(function (item) {
      menu.on('extra-' + item.name, function () {
        item.handler(this)
      }.bind(this))
    }.bind(self))
  }

  menu.on('select', onselect.bind(self.parent))
  menu.on('exit', function () {
    console.log()
    process.exit(0)
  })
  menu.on('help', function () {
    console.log()
    this._printHelp()
  }.bind(self))
}

function onselect(name) {
  self = null
  if (/maybe/.test(name)) name = ''
  this.show(name.replace(/\s+(.*)/, ''))
}

module.exports = langs
