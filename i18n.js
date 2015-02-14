const i18n       = require('i18n-core')
    , i18nFs     = require('i18n-core/lookup/fs')
    , i18nObject = require('i18n-core/lookup/object')
    , path       = require('path')
    , fs         = require('fs')

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

function chooseLang (globalDataDir, appDataDir, lang, defaultLang, availableLangs) {
  var globalPath = path.resolve(globalDataDir, 'lang.json')
    , appPath = path.resolve(appDataDir, 'lang.json')
    , data
  try {
    // Lets see if we find some stored language in the app's config
    data = require(appPath)
  } catch (e) {
    // Without a file an error will occur here, but thats okay
  }
  if (!data) {
    // Lets see if some other workshopper stored language settings
    try {
      data = require(globalPath)
    } catch (e) {
      data = {}
      // Without a file an error will occur here, but thats okay
    }
  }

  if (!!lang && typeof lang != 'string')
    throw new TypeError('Please supply a language. Available languages are: ' + availableLangs.join(', '))

  if (lang)
    lang = lang.replace(/_/g, '-').toLowerCase()

  if (availableLangs.indexOf(defaultLang) === -1)
    throw new TypeError('The default language "' + defaultLang + ' is not one of the available languages?! Available languages are: ' + availableLangs.join(', '))

  if (lang && availableLangs.indexOf(lang) === -1)
    throw new TypeError('The language "' + lang + '" is not available.\nAvailable languages are ' + availableLangs.join(', ') + '.\n\nNote: the language is not case-sensitive ("en", "EN", "eN", "En" will become "en") and you can use "_" instead of "-" for seperators.')

  if (availableLangs.indexOf(data.selected) === -1)
    // The stored data is not available so lets use one of the other languages
    data.selected = lang || defaultLang
  else
    data.selected = lang || data.selected || defaultLang

  try {
    fs.writeFileSync(globalPath, JSON.stringify(data))
    fs.writeFileSync(appPath, JSON.stringify(data))
  } catch(e) {
    // It is not good if an error occurs but it shouldn't really matter
  }
  return data.selected
}

module.exports = {
  chooseLang: chooseLang,
  init: function(options, exercises, lang) {
    var translator = i18n(
          i18nChain(
              i18nFs(path.resolve(options.appDir, './i18n'))
            , i18nFs(path.resolve(__dirname, './i18n'))
            , i18nObject(createDefaultLookup(options, exercises))
          )
        )
      , result = translator.lang(lang, true)
    translator.fallback = function (key) {
      if (!key)
        return '(???)'

      return '?' + key + '?'
    }
    result.languages = options.languages || ['en']
    result.change = function (globalDataDir, appDataDir, lang, defaultLang, availableLangs) {
      result.changeLang(lang)
      chooseLang(globalDataDir, appDataDir, lang, defaultLang, availableLangs)
    }
    return result
  }
}
