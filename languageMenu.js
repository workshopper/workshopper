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
    , languageMapping = {}

  menu.reset()
  menu.write(chalk.bold(__('title')) + '\n')
  //if (typeof i18n.has('subtitle') == 'string') <-- TODO
    menu.write(chalk.italic(__('subtitle')) + '\n')
  menu.write(util.repeat('\u2500', opts.width) + '\n')
    
  opts.languages.forEach(function (lang) {
    console.log(opts.lang, lang)
    var name   = __("language." + lang)
      , entry  = chalk.bold('»') + ' ' + name
      , marker = (opts.lang === lang) ? '[' + __('language._current')  + ']' : ''
      , empty  = opts.width - vw.width(entry) - 2 - vw.width(marker)

    languageMapping[name] = lang

    if (empty < 0) {
      entry = entry.substr(0, entry.length + empty - 1) + "..."
      empty = 0
    }

    menu.add(entry + util.repeat(' ', empty) + marker)
  })

  menu.write(util.repeat('\u2500', opts.width) + '\n')
  menu.add(chalk.bold(__('menu.cancel')))
  menu.add(chalk.bold(__('menu.exit')))

  function regexpEncode(str) {
    return str.replace(/([\.\*\+\?\{\}\[\]\- \(\)\|\^\$\\])/g, "\\$1")
  }

  menu.on('select', function (label) {
    var pattern = new RegExp('(^»?\\s+)|(\\s+(\\[' + regexpEncode(__('language._current')) + '\\])?$)', 'g'),
        name = chalk.stripColor(label).replace(pattern, '')

    menu.y = 0
    menu.reset()
    menu.close()

    if (name === __('menu.exit'))
      return emitter.emit('exit')

    if (name === __('menu.cancel'))
      return emitter.emit('cancel')

    emitter.emit('select', languageMapping[name])
  })

  menu.createStream().pipe(process.stdout)
  
  return emitter
}


module.exports = showMenu