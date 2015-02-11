const tmenu        = require('terminal-menu')
    , path         = require('path')
    , fs           = require('fs')
    , xtend        = require('xtend')
    , EventEmitter = require('events').EventEmitter
    , chalk        = require('chalk')
    , util         = require('util')

const repeat          = require('./util').repeat
    , applyTextMarker = require('./util').applyTextMarker


function showMenu (opts, i18n) {

  var emitter         = new EventEmitter()
    , menu            = tmenu(xtend({
          width : opts.width
        , x     : 3
        , y     : 2
      }, opts.menu))
    , __              = i18n.__
    , __n             = i18n.__n

  function writeLine() {
    menu.write(repeat('\u2500', opts.width) + '\n')
  }

  function emit(event, value) {
    return process.nextTick.bind(process, emitter.emit.bind(emitter, event, value))
  }

  function addEntry(entry) {
    menu.add(applyTextMarker(entry.name, entry.marker || '', opts.width), emit(entry.event, entry.payload))
  }

  function addVariableEntry(variableEntry) {
    if (!variableEntry)
      return

    if (util.isArray(variableEntry))
      return variableEntry.forEach(addVariableEntry)

    if (variableEntry.separator)
      return writeLine()

    addEntry(variableEntry)
  }

  menu.reset()

  menu.write(chalk.bold(__('title')) + '\n')

  if (i18n.has('subtitle'))
    menu.write(chalk.italic(__('subtitle')) + '\n')

  writeLine()

  opts.entries.forEach(addVariableEntry)

  function regexpEncode(str) {
    return str.replace(/([\.\*\+\?\{\}\[\]\- \(\)\|\^\$\\])/g, "\\$1")
  }

  menu.on('select', function (label) {
    menu.y = 0
    menu.reset()
    menu.close()
  })

  menu.createStream().pipe(process.stdout)

  return emitter
}


module.exports = showMenu
