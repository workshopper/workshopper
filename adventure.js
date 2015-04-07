const minimist     = require('minimist')
    , fs           = require('fs')
    , path         = require('path')
    , map          = require('map-async')
    , msee         = require('msee')
    , chalk        = require('chalk')
    , inherits     = require('util').inherits
    , EventEmitter = require('events').EventEmitter

/* jshint -W079 */
const showMenu         = require('./exerciseMenu')
    , showLanguageMenu = require('./languageMenu')
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
  
  if (!options.languages) {
    // In case a workshopper didn't define a any language
    options.languages = ['en']
  }

  this.defaultLang = options.languages[0]
  // optional
  this.menuOptions = options.menu
  // helpFile is additional to the usage in usage.txt
  this.helpFile    = options.helpFile
  // optional
  this.footerFile  =   options.footerFile === false
                     ? []
                     : [options.footerFile, path.join(__dirname, './i18n/footer/{lang}.md')]
  this.width       = typeof options.width == 'number'
      ? options.width
      : defaultWidth
  // an `onComplete` hook function *must* call the callback given to it when it's finished, async or not
  this.onComplete  = typeof options.onComplete == 'function' && options.onComplete

  this.exercises = []
  this._adventures = []
  this._meta = {}

  var menuJson = util.getFile(options.menuJson || 'menu.json', this.exerciseDir)
  if (menuJson) {
    require(menuJson).forEach((function (entry) {
      this.add(entry)
    }).bind(this))
  }

  if (options.menuItems && !options.commands)
    options.commands = options.menuItems

  if (Array.isArray(options.commands))
    this.commands = options.commands

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

  // backwards compatibility for title and subtitle
  this.__defineGetter__('title', this.__.bind(this, 'title'))
  this.__defineGetter__('subtitle', this.__.bind(this, 'subtitle'))

  this.current = this.getData('current')

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
    exercise = this.current && this.loadExercise(this.current)

    if (!this.current)
      return error(this.__('error.exercise.none_active'))

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

Adventure.prototype.add = function (name_or_object, fn_or_object) {
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

    if (!meta.exerciseFile)
      meta.exerciseFile = path.join(meta.dir, './exercise.js')

    if (typeof fn_or_object === 'function')
      meta.fn = fn_or_object

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
  console.log('\n' + chalk.bold.red('# ' + this.__('solution.fail.title')) + '\n')
  console.log(this.__('solution.fail.message', {name: this.__('exercise.' + exercise.meta.name)}))

  this.end(mode, false, exercise)
}


// overall exercise pass
Adventure.prototype.exercisePass = function (mode, exercise) {
  console.log('\n' + chalk.bold.green('# ' + this.__('solution.pass.title')) + '\n')
  console.log(chalk.bold(this.__('solution.pass.message', {name: this.__('exercise.' + exercise.meta.name)})) + '\n')

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

  if (exercise.hideSolutions)
    return done()

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
  exercise.on('pass', onpass)
  exercise.on('fail', onfail)
  exercise.on('pass', this.emit.bind(this, 'pass', exercise, mode))
  exercise.on('fail', this.emit.bind(this, 'fail', exercise, mode))


  function done (err, pass) {
    var errback

    if (err) {
      // if there was an error then we need to do this after cleanup
      errback = function () {
        error(this.__('error.exercise.unexpected_error', {mode: mode, err: (err.message || err) }))
      }.bind(this)
    }

    if (mode == 'run' || err)
      return this.end(mode, true, exercise, errback) // clean up

    if (!pass)
      return this.exerciseFail(mode, exercise)

    this.exercisePass(mode, exercise)
  }

  exercise[mode](args, done.bind(this))
}

Adventure.prototype.selectLanguage = function (lang) {
  this.i18n.change(this.globalDataDir, this.dataDir, lang, this.defaultLang, this.i18n.languages)
  this.lang = lang
  this.printMenu()
}

Adventure.prototype.printLanguageMenu = function () {
  var menu = showLanguageMenu({
      name      : this.appName
    , languages : this.i18n.languages
    , lang      : this.lang
    , width     : this.width
    , menu      : this.menuOptions
  }, this.i18n)

  menu.on('select', this.selectLanguage.bind(this))
  menu.on('cancel', this.printMenu.bind(this))
  menu.on('exit', this._exit.bind(this))
}

Adventure.prototype._exit = function () {
  process.exit(0)
}

Adventure.prototype.printMenu = function () {
  var menu = showMenu({
      name          : this.appName
    , languages     : this.i18n.languages
    , width         : this.width
    , completed     : this.getData('completed') || []
    , exercises     : this.exercises
    , extras        : this.commands && this.commands
                        .filter(function (item) {
                          return item.menu !== false
                        })
                        .map(function (item) {
                          return item.name.toLowerCase()
                        })
    , menu          : this.menuOptions
  }, this.i18n)

  menu.on('select', onselect.bind(this))
  menu.on('exit', this._exit.bind(this))
  menu.on('language', this.printLanguageMenu.bind(this))
  menu.on('help', this._printHelp.bind(this))

  if (this.commands) {
    this.commands.forEach(function (item) {
      menu.on('extra-' + item.name, function () {
        item.handler(this)
      }.bind(this))
    }.bind(this))
  }
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
  this._printUsage(print.localisedFile.bind(print, this.appName, this.appDir, this.helpFile, this.lang))
}


Adventure.prototype._printUsage = function (callback) {
  print.localisedFirstFile(this.appName, this.appDir, [
    path.join(__dirname, './i18n/usage/{lang}.txt'),
    path.join(__dirname, './i18n/usage/en.txt')
  ], this.lang, callback)
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

  if (!exercise)
    return error(this.__('error.exercise.missing', {name: name}))

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
      if (exercise.problem)
        print.text(this.appName, this.appDir, exercise.problemType || 'md', exercise.problem)
      else
        print.localisedFile(this.appName, this.appDir,  path.resolve(__dirname, 'i18n/missing_problem/{lang}.md'), this.lang)

      if (exercise.footer || this.footer)
        print.text(this.appName, this.appDir, exercise.footer || this.footer, this.lang)
      else if (this.footerFile !== false)
        print.localisedFirstFile(this.appName, this.appDir, this.footerFile || [], this.lang)
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
