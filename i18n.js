const i18nCore   = require('i18n-core')
    , i18nFs     = require('i18n-core/lookup/fs')
    , i18nObject = require('i18n-core/lookup/object')
    , path       = require('path')

function i18nChain() {
  var linked = {
        handler: arguments[0]
      , next: null
    }
    , current = linked
  for (var i = 1; i<arguments.length; i++) {
    var next = {
      handler: arguments[i]
    }
    current.next = next
    current = next
  }
  return {
    get: function (key) {
      var current = linked
        , result
      while (!result && current) {
        result = current.handler.get(key)
        current = current.next
      }
      if (!result)
        return "?" + key + "?"
      
      return result
    }
  }
}

function createDefaultLookup(options, exercises) {
  var result = {
    en: {
        title: options.title
      , subtitle: options.subtitle
      , exercise: {}
    }
  }

  exercises.forEach(function (exercise) {
    result.en.exercise[exercise] = exercise
  })

  return result
}

module.exports = {
  init: function(options, exercises, lang) {
    var result = i18nCore(
    i18nChain(
        i18nFs(options.appDir)
      , i18nFs(path.resolve(__dirname, './i18n'))
      , i18nObject(createDefaultLookup(options, exercises))
    )
    ).lang(lang, true)
    result.languages = ['en', 'ja']
    return result
  }
}