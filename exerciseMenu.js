const chalk = require('chalk')

const menu = require('./menu')

function showMenu (opts, i18n) {

  var __ = i18n.__

  opts.primaries = opts.exercises.map(function (exercise) {
    return {
        name: __("exercise." + exercise)
      , marker: (opts.completed.indexOf(exercise) >= 0) ? '[' + __('menu.completed')  + ']' : ''
      , id: exercise
    }
  })

  opts.secondaries = [
      { name: __('menu.help'), command: 'help' }
    , { name: __('menu.exit'), command: 'exit' }
  ]


  if (opts.languages && opts.languages.length > 1) {
    opts.secondaries.splice(1, 0, { name: __('menu.language'), command: 'language'})
  }

  if (opts.extras) {
    opts.secondaries.splice.apply(opts.secondaries, [1, 0].concat(opts.extras.map(function (extra) {
      return { name: __("menu." + extra), command: 'extra-' + extra }
    })))
  }

  return menu(opts, i18n)
}


module.exports = showMenu