const tmenu        = require('terminal-menu')
    , path         = require('path')
    , fs           = require('fs')
    , xtend        = require('xtend')
    , EventEmitter = require('events').EventEmitter
    , chalk        = require('chalk')

const util         = require('./util')


function showMenu (opts) {
  var emitter  = new EventEmitter()
    , menu     = tmenu(xtend({
          width : opts.width
        , x     : 3
        , y     : 2
      }, opts.menu))

  menu.reset()
  menu.write(chalk.bold(opts.title) + '\n')
  if (typeof opts.subtitle == 'string')
    menu.write(chalk.italic(opts.subtitle) + '\n')
  menu.write(util.repeat('-', opts.width) + '\n')
    
  opts.exercises.forEach(function (name) {
    var isDone = opts.completed.indexOf(name) >= 0
      , m      = '[COMPLETED]'

    name = name

    if (isDone)
      return menu.add(chalk.bold('»') + ' ' + name + Array(opts.width - m.length - name.length + 1).join(' ') + m)
    else
      menu.add(chalk.bold('»') + ' ' + name)
  })

  menu.write(util.repeat('-', opts.width) + '\n')
  menu.add(chalk.bold('HELP'))
  if (opts.prerequisites)
    menu.add(chalk.bold('PREREQUISITES'))
  if (opts.credits)
    menu.add(chalk.bold('CREDITS'))
  menu.add(chalk.bold('EXIT'))

  menu.on('select', function (label) {
    var name = label.replace(/(^\S+\s+)|(\s+(\[COMPLETED\])?$)/g, '')

    menu.y = 0
    menu.reset()    
    menu.close()

    if (name === chalk.bold('EXIT'))
      return emitter.emit('exit')

    if (name === chalk.bold('HELP'))
      return emitter.emit('help')

    if (name === chalk.bold('CREDITS'))
      return emitter.emit('credits')

    if (name === chalk.bold('PREREQUISITES'))
      return emitter.emit('prerequisites')
    
    emitter.emit('select', name)
  })

  menu.createStream().pipe(process.stdout)
  
  return emitter
}


module.exports = showMenu