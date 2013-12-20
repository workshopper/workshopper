const tmenu        = require('terminal-menu')
    , path         = require('path')
    , fs           = require('fs')
    , xtend        = require('xtend')
    , EventEmitter = require('events').EventEmitter

const repeat    = require('./term-util').repeat
    , bold      = require('./term-util').bold
    , italic    = require('./term-util').italic

function showMenu (opts) {
  var emitter  = new EventEmitter()
    , menu     = tmenu(xtend({
          width : opts.width
        , x     : 3
        , y     : 2
      }, opts.menu))

  menu.reset()
  menu.write(bold(opts.title) + '\n')
  if (typeof opts.subtitle == 'string')
    menu.write(italic(opts.subtitle) + '\n')
  menu.write(repeat('-', opts.width) + '\n')
    
  opts.problems.forEach(function (name) {
    var isDone = opts.completed.indexOf(name) >= 0
      , m      = '[COMPLETED]'

    name = name

    if (isDone)
      return menu.add(bold('»') + ' ' + name + Array(63 - m.length - name.length + 1).join(' ') + m)
    else
      menu.add(bold('»') + ' ' + name)
  })

  menu.write(repeat('-', opts.width) + '\n')
  menu.add(bold('HELP'))
  if (opts.prerequisites)
    menu.add(bold('PREREQUISITES'))
  if (opts.credits)
    menu.add(bold('CREDITS'))
  menu.add(bold('EXIT'))

  menu.on('select', function (label) {
    var name = label.replace(/(^[^»]+»[^\s]+ )|(\s{2}.*)/g, '')
    
    menu.close()

    if (name === bold('EXIT'))
      return emitter.emit('exit')

    if (name === bold('HELP'))
      return emitter.emit('help')

    if (name === bold('CREDITS'))
      return emitter.emit('credits')

    if (name === bold('PREREQUISITES'))
      return emitter.emit('prerequisites')
    
    emitter.emit('select', name)
  })

  menu.createStream().pipe(process.stdout)
  
  return emitter
}

module.exports = showMenu
