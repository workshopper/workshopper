const tmenu        = require('terminal-menu')
    , path         = require('path')
    , fs           = require('fs')
    , xtend        = require('xtend')
    , EventEmitter = require('events').EventEmitter
    , chalk        = require('chalk')

const util         = require('./util')


function showMenu (opts, i18n) {

  var emitter         = new EventEmitter()
    , menu            = tmenu(xtend({
          width : opts.width
        , x     : 3
        , y     : 2
      }, opts.menu))
    , __              = i18n.__
    , __n             = i18n.__n

  menu.reset()
  menu.write(chalk.bold(__('title')) + '\n')
  if (i18n.has('subtitle'))
    menu.write(chalk.italic(__('subtitle')) + '\n')
  menu.write(util.repeat('\u2500', opts.width) + '\n')
  
  function emit(event, value) {
    return process.nextTick.bind(process, emitter.emit.bind(emitter, event, value))
  }

  opts.exercises.forEach(function (exercise) {
    var marker = (opts.completed.indexOf(exercise) >= 0) ? '[' + __('menu.completed')  + ']' : ''
      , size = opts.width - 2
      , prefix = chalk.bold('»') + ' '
      , entry = util.applyTextMarker(prefix + __("exercise." + exercise), marker, size)
    menu.add(entry, emit('select', exercise))
  })

  menu.write(util.repeat('\u2500', opts.width) + '\n')
  menu.add(chalk.bold(__('menu.help')), emit('help'))

  if (opts.extras) {
    opts.extras.forEach(function (extra) {
      var name = __("menu." + extra)
      menu.add(chalk.bold(name), emit('extra-' + extra))
    })
  }

  if (opts.languages && opts.languages.length > 1) {
    menu.add(chalk.bold(__('menu.language')), emit('language')) 
  }
  menu.add(chalk.bold(__('menu.exit')), emit('exit'))

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