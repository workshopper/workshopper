const chalk = require('chalk')

const menu = require('./menu')

function showMenu (opts, i18n) {

  var __ = i18n.__

  opts.entries = [
      opts.languages.map(function (lang) {
        return {
            name: chalk.bold('»') + ' ' + __('language.' + lang)
          , marker: (opts.lang === lang) ? '[' + __('language._current') + ']' : ''
          , event: 'select'
          , payload: lang
        }
      })
    , { separator: true }
    , { name: chalk.bold(__('menu.cancel')), event: 'cancel' }
    , { name: chalk.bold(__('menu.exit')), event: 'exit' }
  ]

  return menu(opts, i18n)
}


module.exports = showMenu
