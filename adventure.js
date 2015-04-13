const minimist     = require('minimist')
    , fs           = require('fs')
    , path         = require('path')
    , map          = require('map-async')
    , msee         = require('msee')
    , chalk        = require('chalk')
    , inherits     = require('util').inherits
    , EventEmitter = require('events').EventEmitter

/* jshint -W079 */
const createMenu         = require('simple-terminal-menu')
    , print            = require('./print-text')
    , util             = require('./util')
    , i18n             = require('./i18n')
/* jshint +W079 */

const defaultWidth = 65

function Adventure (options) {
  if (!(this instanceof Adventure))
    return new Adventure(options)

  EventEmitter.call(this)

  if (typeof options === 'string')
    options = {name: options}

  if (typeof options !== 'object')
    throw new TypeError('need to provide an options object')

  if (typeof options.name !== 'string')
    throw new TypeError('need to provide a `name` String option')

  this.name       = options.name
  this.appName    = options.name

  this.appDir        = util.getDir(options.appDir, '.')
  if (this.appDir)
    this.exerciseDir = util.getDir(options.exerciseDir, this.appDir)
                    || util.getDir('exercises', this.appDir)

  this.globalDataDir = util.userDir('.config', 'workshopper')
  this.dataDir       = util.userDir('.config', this.appName)
  
  // Backwards compatibility with adventure
  this.datadir       = this.dataDir
  
  if (!options.languages) {
    // In case a workshopper didn't define a any language
    options.languages = ['en']
  }

  if (!options.defaultLang) {
    options.defaultLang = options.languages[0]
  }

  this.defaultLang = options.defaultLang
  this.menuOptions = options.menu || {}
  this.helpFile    = options.helpFile
  this.footer      = options.footer
  this.showHeader  = options.showHeader || false
  this.footerFile  = [options.footerFile, path.join(__dirname, './i18n/footer/{lang}.md')]

  if (typeof this.menuOptions.width !== 'number')
    this.menuOptions.width = typeof options.width == 'number' ? options.width : defaultWidth

  if (typeof this.menuOptions.x !== 'number')
    this.menuOptions.x = 3

  if (typeof this.menuOptions.y !== 'number')
    this.menuOptions.y = 2
  
  // an `onComplete` hook function *must* call the callback given to it when it's finished, async or not
  this.onComplete  = typeof options.onComplete == 'function' && options.onComplete

  this.exercises = []
  this._meta = {}

  var menuJson = util.getFile(options.menuJson || 'menu.json', this.exerciseDir)
  if (menuJson) {
    require(menuJson).forEach((function (entry) {
      this.add(entry)
    }).bind(this))
  }

  if (options.menuItems && !options.commands)
    options.commands = options.menuItems

  this.commands = Array.isArray(options.commands) ? options.commands : []

  this.options = options
}

inherits(Adventure, EventEmitter)

Adventure.prototype.execute = function (args) {
  var mode = args[0]
    , handled = false
    , argv = minimist(args, {
        alias: {
          h: 'help',
          l: 'lang',
          v: 'version',
          select: 'print',
          selected: 'current'
        }
      })

  try {
    this.lang = i18n.chooseLang(
        this.globalDataDir
      , this.dataDir
      , argv.lang
      , this.defaultLang
      , this.options.languages
    )
  } catch (e) {
    if (e instanceof TypeError)  // In case the language couldn't be selected
      console.log(e.message)
    else
      console.error(e.stack)
    process.exit(1)
  }

  this.i18n      = i18n.init(this.options, this.exercises, this.lang, this.globalDataDir)
  this.__        = this.i18n.__
  this.__n       = this.i18n.__n
  this.languages = this.i18n.languages

  // backwards compatibility for title and subtitle and width
  this.__defineGetter__('title', this.__.bind(this, 'title'))
  this.__defineGetter__('subtitle', this.__.bind(this, 'subtitle'))
  this.__defineGetter__('width', function () {
    return this.menuOptions.width
  }.bind(this))

  this.current = this.getData('current')

  if (this.commands)
    this.commands.forEach(function (item) {
      if (mode == item.name
          || argv[item.name]
          || (item.short && argv[item.short])) {
        handled = true
        return item.handler(this)
      }
    }.bind(this))


  if (argv.version || mode == 'version')
    return console.log(
        this.appName
      + '@'
      + require(path.join(this.appDir, 'package.json')).version
    )

  if (handled)
    return

  if (argv.help || mode == 'help')
    return this._printHelp()

  if (mode == 'list') {
    return this.exercises.forEach(function (name) {
      console.log(this.__('exercise.' + name))
    }.bind(this))
  }

  if (mode == 'current')
    return console.log(this.__('exercise.' + this.current))

  if (mode == 'print') {
    var selected = argv._.length > 1 ? argv._.slice(1).join(' ') : this.current
    if (/[0-9]+/.test(selected)) {
      selected = this.exercises[parseInt(selected-1, 10)] || selected
    } else {
      selected = this.exercises.filter(function (exercise) {
        return selected === this.__('exercise.' + exercise)
      }.bind(this))[0] || selected;
    }
    onselect.call(this, selected)
    return
  }

  if (mode == 'verify' || mode == 'run') {
    if (!this.current)
      return error(this.__('error.exercise.none_active'))

    exercise = this.loadExercise(this.current)

    if (!exercise)
      return error(this.__('error.exercise.missing', {name: name}))

    if (exercise.requireSubmission !== false && argv._.length == 1)
      return error(this.__('ui.usage', {appName: this.appName, mode: mode}))

    return this.runExercise(exercise, mode, argv._.slice(1))
  }

  if (mode == 'next') {
    var remainingAfterCurrent = this.exercises.slice(this.exercises.indexOf(this.current))

    var completed = this.getData('completed')

    if (!completed)
      return error(this.__('error.exercise.none_active') + '\n')

    var incompleteAfterCurrent = remainingAfterCurrent.filter(function (elem) {
      return completed.indexOf(elem) < 0
    })

    if (incompleteAfterCurrent.length === 0)
      return console.log(this.__('error.no_uncomplete_left') + '\n')

    return onselect.call(this, incompleteAfterCurrent[0])
  }

  if (mode == 'reset') {
    this.reset()
    return console.log(this.__('progress.reset', {title: this.__('title')}))
  }

  this.printMenu()
}

Adventure.prototype.add = function (name_or_object, fn_or_object, fn) {
  var meta
    , dir
    , stat

  meta = (typeof name_or_object === 'object')
    ? name_or_object
    : (typeof fn_or_object === 'object')
      ? fn_or_object
      : { name: name_or_object }

  if (typeof name_or_object === 'string')
    meta.name = name_or_object

  if (/^\/\//.test(meta.name))
    return

  if (!meta.id)
    meta.id = util.idFromName(meta.name)

  if (!meta.dir)
    meta.dir = this.dirFromName(meta.name)

  if (meta.dir && !meta.exerciseFile)
    meta.exerciseFile = path.join(meta.dir, './exercise.js')

  if (typeof fn_or_object === 'function')
    meta.fn = fn_or_object

  if (typeof fn === 'function')
    meta.fn = fn

  if (!meta.fn && meta.exerciseFile) {
    try {
      stat = fs.statSync(meta.exerciseFile)
    } catch (err) {
      return error(this.__('error.exercise.missing_file', {exerciseFile: meta.exerciseFile}))
    }

    if (!stat || !stat.isFile())
      return error(this.__('error.exercise.missing_file', {exerciseFile: meta.exerciseFile}))

    meta.fn = (function () {
      return require(meta.exerciseFile)
    }).bind(meta) 
  }

  if (!meta.fn)
    return error(this.__('error.exercise.not_a_workshopper', {exerciseFile: meta.exerciseFile}))


  this.exercises.push(meta.name)
  this._meta[meta.id] = meta
  meta.number = this.exercises.length
  return this
}

Adventure.prototype.end = function (mode, pass, exercise, callback) {
  if (typeof exercise.end == 'function')
    exercise.end(mode, pass, function (err) {
      if (err)
        return error(this.__('error.cleanup', {err: err.message || err}))

      setImmediate(callback || function () {
        process.exit(pass ? 0 : -1)
      })
    }.bind(this))
}


// overall exercise fail
Adventure.prototype.exerciseFail = function (mode, exercise) {
  if (exercise.fail) {
    print.text(this.appName, this.appDir, exercise.failType || 'txt', exercise.fail)
    console.log()
  } else {
    console.log('\n' + chalk.bold.red('# ' + this.__('solution.fail.title')) + '\n')
    console.log(this.__('solution.fail.message', {name: this.__('exercise.' + exercise.meta.name)})) 
  }
  this.end(mode, false, exercise)
}


// overall exercise pass
Adventure.prototype.exercisePass = function (mode, exercise) {
  var done = function done () {
    var completed = this.getData('completed') || []
      , remaining

    this.updateData('completed', function (xs) {
      if (!xs)
        xs = []

      return xs.indexOf(exercise.meta.name) >= 0 ? xs : xs.concat(exercise.meta.name)
    })

    completed = this.getData('completed') || []

    remaining = this.exercises.length - completed.length

    if (exercise.pass) {
      print.text(this.appName, this.appDir, exercise.passType || 'txt', exercise.pass)
    } else {
      console.log('\n' + chalk.bold.green('# ' + this.__('solution.pass.title')) + '\n')
      console.log(chalk.bold(this.__('solution.pass.message', {name: this.__('exercise.' + exercise.meta.name)})) + '\n') 
    }
    
    if (exercise.solution)
      print.text(this.appName, this.appDir, exercise.solutionType || 'txt', exercise.solution)

    if (remaining === 0) {
      if (this.onComplete)
        return this.onComplete(this.end.bind(this, mode, true, exercise))
      else
        console.log(this.__('progress.finished'))
    } else {
      console.log(this.__n('progress.remaining', remaining))
      console.log(this.__('ui.return', {appName: this.appName}))
    }


    this.end(mode, true, exercise)
  }.bind(this)

  if (!exercise.hideSolutions && typeof exercise.getSolutionFiles === 'function') {
    exercise.getSolutionFiles(function (err, files) {
      if (err)
        return error(this.__('solution.notes.load_error', {err: err.message || err}))
      if (!files.length)
        return done()

      console.log(this.__('solution.notes.compare'))

      function processSolutionFile (file, callback) {
        fs.readFile(file, 'utf8', function (err, content) {
          if (err)
            return callback(err)

          var filename = path.basename(file)

          // code fencing is necessary for msee to render the solution as code
          content = msee.parse('```js\n' + content + '\n```')
          callback(null, { name: filename, content: content })
        })
      }

      function printSolutions (err, solutions) {
        if (err)
          return error(this.__('solution.notes.load_error', {err: err.message || err}))

        solutions.forEach(function (file, i) {
          console.log(chalk.yellow(util.repeat('\u2500', 80)))

          if (solutions.length > 1)
            console.log(chalk.bold.yellow(file.name + ':') + '\n')

          console.log(file.content.replace(/^\n/m, '').replace(/\n$/m, ''))

          if (i == solutions.length - 1)
            console.log(chalk.yellow(util.repeat('\u2500', 80)) + '\n')
        }.bind(this))

        done()
      }

      map(files, processSolutionFile, printSolutions.bind(this))
    }.bind(this))
  } else {
    done()
  }
}


// single 'pass' event for a validation
function onpass (msg) {
  console.log(chalk.green.bold('\u2713 ') + msg)
}


// single 'fail' event for validation
function onfail (msg) {
  console.log(chalk.red.bold('\u2717 ') + msg)
}


Adventure.prototype.runExercise = function (exercise, mode, args) {
  // individual validation events
  if (typeof exercise.on === 'function') {
    exercise.on('pass', onpass)
    exercise.on('fail', onfail)
    exercise.on('pass', this.emit.bind(this, 'pass', exercise, mode))
    exercise.on('fail', this.emit.bind(this, 'fail', exercise, mode)) 
  }

  function done (err, pass) {

    if (pass === undefined && (err === true || err === false || err === undefined || err === null)) {
      pass = err
      err = null
    }

    if (err) {
      // if there was an error then we need to do this after cleanup
      return this.end(mode, true, exercise, function () {
        error(this.__('error.exercise.unexpected_error', {mode: mode, err: (err.message || err) }))
      }.bind(this))
    }

    if (mode == 'run')
      return this.end(mode, true, exercise) // clean up

    if (!pass || exercise.fail)
      return this.exerciseFail(mode, exercise)

    this.exercisePass(mode, exercise)
  }

  var method = exercise[mode]
    , result;

  if (!method)
    return error('This problem doesn\'t have a .' + mode + ' function.')

  if (typeof method !== 'function')
    return error('This .' + mode + ' is a ' + typeof method + '. It should be a function instead.')

  result = (method.length > 1)
        ? method.bind(exercise)(args, done.bind(this))
        : method.bind(exercise)(args)
  
  if (result)
    print.text(this.appName, this.appDir, 'txt', result)
}

Adventure.prototype.selectLanguage = function (lang) {
  this.i18n.change(this.globalDataDir, this.dataDir, lang, this.defaultLang, this.i18n.languages)
  this.lang = lang
  this.printMenu()
}

Adventure.prototype.printLanguageMenu = function () {
  var __ = this.i18n.__
    , menu = createMenu(this.menuOptions)
    , completed = this.getData('completed') || []

  menu.writeLine(chalk.bold(__('title')))

  if (this.i18n.has('subtitle'))
    menu.writeLine(chalk.italic(__('subtitle')))

  menu.writeSeparator()

  this.i18n.languages.forEach(function (language) {
    var label = chalk.bold('»') + ' ' + __('language.' + language)
      , marker = (this.lang === language) ? '[' + __('language._current') + ']' : ''
    menu.add(label, marker, this.selectLanguage.bind(this, language))
  }.bind(this))

  menu.writeSeparator()

  menu.add(chalk.bold(__('menu.cancel')), this.printMenu.bind(this))
  menu.add(chalk.bold(__('menu.exit')), this._exit.bind(this))
}

Adventure.prototype._exit = function () {
  process.exit(0)
}

Adventure.prototype.printMenu = function () {
  var __ = this.i18n.__
    , menu = createMenu(this.menuOptions)
    , completed = this.getData('completed') || []

  menu.writeLine(chalk.bold(__('title')))

  if (this.i18n.has('subtitle'))
    menu.writeLine(chalk.italic(__('subtitle')))

  menu.writeSeparator()

  this.exercises.forEach(function (exercise) {
    var label = chalk.bold('»') + ' ' + __('exercise.' + exercise)
      , marker = (completed.indexOf(exercise) >= 0) ? '[' + __('menu.completed') + ']' : ''
    menu.add(label, marker, onselect.bind(this, exercise))
  }.bind(this))

  menu.writeSeparator()

  menu.add(chalk.bold(__('menu.help')), this._printHelp.bind(this))

  if (this.i18n.languages && this.i18n.languages.length > 1)
      menu.add(chalk.bold(__('menu.language')), this.printLanguageMenu.bind(this))

  this.commands.filter(function (extra) {
    return extra.menu !== false
  }).forEach(function (extra) {
    menu.add(chalk.bold(__('menu.' + extra.name)), extra.handler.bind(extra, this))
  }.bind(this))

  menu.add(chalk.bold(__('menu.exit')), this._exit.bind(this))
}


Adventure.prototype.getData = function (name) {
  var file = path.resolve(this.dataDir, name + '.json')
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {}
  return null
}


Adventure.prototype.updateData = function (id, fn) {
  var json = {}
    , file

  try {
    json = this.getData(id)
  } catch (e) {}

  file = path.resolve(this.dataDir, id + '.json')
  fs.writeFileSync(file, JSON.stringify(fn(json)))
}


Adventure.prototype.reset = function () {
  fs.unlink(path.resolve(this.dataDir, 'completed.json'), function () {})
  fs.unlink(path.resolve(this.dataDir, 'current.json'), function () {})
}


Adventure.prototype.dirFromName = function (name) {
  return util.dirFromName(this.exerciseDir, name)
}


Adventure.prototype._printHelp = function () {
  var part
    , stream = require("combined-stream").create()

  if (this.helpFile)
    part = print.localisedFileStream(this.appName, this.appDir, this.helpFile, this.lang)

  if (part)
    stream.append(part)

  part = print.localisedFirstFileStream(this.appName, this.appDir, [
          path.join(__dirname, './i18n/usage/{lang}.txt'),
          path.join(__dirname, './i18n/usage/en.txt')
        ], this.lang)
  if (part)
    stream.append(part)

  stream.pipe(process.stdout)
}

Adventure.prototype.getExerciseMeta = function (name) {
  return this._meta[util.idFromName(name)]
}

Adventure.prototype.loadExercise = function (name) {
  var meta = this.getExerciseMeta(name)
  
  if (!meta)
    return null

  exercise = meta.fn()

  if (typeof exercise.init === 'function')
    exercise.init(this, meta.id, meta.name, meta.dir, meta.number)
  
  exercise.meta = meta

  return exercise
}

function error () {
  var pr = chalk.bold.red
  console.log(pr.apply(pr, arguments))
  process.exit(-1)
}

function onselect (name) {
  var exercise = this.loadExercise(name)
    , afterPrepare

  if (!exercise)
    return error(this.__('error.exercise.missing', {name: name}))

  if (this.showHeader)
    console.log(
        '\n ' + chalk.green.bold(this.__('title'))
      + '\n' + chalk.green.bold(util.repeat('\u2500', chalk.stripColor(this.__('title')).length + 2))
      + '\n ' + chalk.yellow.bold(this.__('exercise.' + exercise.meta.name))
      + '\n ' + chalk.yellow.italic(this.__('progress.state', {count: exercise.meta.number, amount: this.exercises.length}))
      + '\n'
    )

  this.current = exercise.meta.name

  this.updateData('current', function () {
    return exercise.meta.name
  })

  afterPreparation = function (err) {
    if (err)
      return error(this.__('error.exercise.preparing', {err: err.message || err}))

    afterProblem = function() {
      var stream = require('combined-stream').create()
        , part
      if (exercise.problem)
        print.text(this.appName, this.appDir, exercise.problemType || 'txt', exercise.problem)
      else {
        part = print.localisedFileStream(this.appName, this.appDir,  path.resolve(__dirname, 'i18n/missing_problem/{lang}.md'), this.lang)
        if (part)
          stream.append(part)
      }

      if (exercise.footer || this.footer)
        print.text(this.appName, this.appDir, exercise.footer || this.footer, this.lang)
      else if (this.footerFile !== false) {
        part = print.localisedFirstFileStream(this.appName, this.appDir, this.footerFile || [], this.lang)
        if (part)
          stream.append(part)
      }

      stream.pipe(process.stdout)
    }.bind(this)

    if (!exercise.problem && typeof exercise.getExerciseText === 'function') {
      exercise.getExerciseText(function (err, type, exerciseText) {
        if (err)
          return error(this.__('error.exercise.loading', {err: err.message || err}))
        exercise.problem = exerciseText
        exercise.problemType = type
        afterProblem()
      }.bind(this))
    } else {
      afterProblem()
    }

  }.bind(this)

  if (typeof exercise.prepare === 'function') {
    exercise.prepare(afterPreparation)
  } else {
    afterPreparation(null)
  }
}


Adventure.prototype.error = error
Adventure.prototype.print = print


module.exports = Adventure
