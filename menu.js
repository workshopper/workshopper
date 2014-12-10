const tmenu        = require('terminal-menu')
    , path         = require('path')
    , fs           = require('fs')
    , xtend        = require('xtend')
    , EventEmitter = require('events').EventEmitter
    , chalk        = require('chalk')
    , vw           = require('visualwidth')

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
    , extraMapping    = {}
    , exerciseMapping = {}

  menu.reset()
  menu.write(chalk.bold(opts.title) + '\n')
  if (typeof opts.subtitle == 'string')
    menu.write(chalk.italic(opts.subtitle) + '\n')
  menu.write(util.repeat('\u2500', opts.width) + '\n')
    
  opts.exercises.forEach(function (exercise) {
    var name   = __("exercise." + exercise)
      , marker = (opts.completed.indexOf(exercise) >= 0) ? '[' + __('menu.completed')  + ']' : ''
      , entry  = chalk.bold('»') + ' ' + name
      , empty  = opts.width - vw.width(entry) - 2

    exerciseMapping[name] = exercise

    if (empty < 0) {
      entry = entry.substr(0, entry.length + empty - 1) + "..."
      empty = 0
    }

    menu.add(entry + util.repeat(' ', empty) + marker)
  })

  menu.write(util.repeat('\u2500', opts.width) + '\n')
  menu.add(chalk.bold(__('menu.help')))

  if (opts.extras) {
    opts.extras.forEach(function (extra) {
      var name = __("menu." + extra)
      extraMapping[name] = extra
      menu.add(chalk.bold(name))
    })
  }

  menu.add(chalk.bold(__('menu.exit')))

  function regexpEncode(str) {
    return str.replace(/([\.\*\+\?\{\}\[\]\- \(\)\|\^\$\\])/g, "\\$1")
  }

  menu.on('select', function (label) {
    var pattern = new RegExp('(^»?\\s+)|(\\s+(\\[' + regexpEncode(__('menu.completed')) + '\\])?$)', 'g'),
        name = chalk.stripColor(label).replace(pattern, '')

    menu.y = 0
    menu.reset()
    menu.close()

    if (name === __('menu.exit'))
      return emitter.emit('exit')

    if (name === __('menu.help'))
      return emitter.emit('help')

    if (extraMapping[name]) {
      return emitter.emit('extra-' + extraMapping[name])
    }

    emitter.emit('select', exerciseMapping[name])
  })

  menu.createStream().pipe(process.stdout)
  
  return emitter
}


module.exports = showMenu