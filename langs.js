const fs        = require('fs')
    , showMenu  = require('./menu')
    , path      = require('path')

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

  var options = {
      name          : self.appName
    , title         : self.title
    , subtitle      : self.langSubtitle || self.subtitle
    , width         : self.width
    , completed     : []
    , exercises     : self.parent.langs.slice(0)
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
  this.show(name)
}

module.exports = langs
