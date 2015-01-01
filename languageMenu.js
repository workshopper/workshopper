const menu         = require('./menu')

function showMenu (opts, i18n) {
    
  var __ = i18n.__

  opts.primaries = opts.languages.map(function (lang) {
    return {
        name: __("language." + lang)
      , marker: (opts.lang === lang) ? '[' + __('language._current')  + ']' : ''
      , id: lang
    }
  })

  opts.secondaries = [
      { name: __('menu.cancel'), command: 'cancel' }
    , { name: __('menu.exit'), command: 'exit' }
  ]

  return menu(opts, i18n)
}


module.exports = showMenu