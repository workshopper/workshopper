const chalk = require('chalk')

const menu = require('./menu')

function showMenu (opts, i18n) {

  var __ = i18n.__

  opts.entries = [
      opts.exercises.map(function (exercise) {
        return {
            name: chalk.bold('»') + ' ' + __('exercise.' + exercise)
          , marker: (opts.completed.indexOf(exercise) >= 0) ? '[' + __('menu.completed') + ']' : ''
          , event: 'select'
          , payload: exercise
        }
      })
    , { separator: true }
    , { name: chalk.bold(__('menu.help')), event: 'help' }
    , (opts.languages && opts.languages.length > 1)
      ? { name: chalk.bold(__('menu.language')), event: 'language'}
      : null
    , (opts.extras || []).map(function (extra) {
        return { name: chalk.bold(__('menu.' + extra)), event: 'extra-' + extra }
      })
    , { name: chalk.bold(__('menu.exit')), event: 'exit' }
  ]

  return menu(opts, i18n)
}


module.exports = showMenu