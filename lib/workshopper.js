const argv       = require('optimist').argv
    , fs         = require('fs')
    , path       = require('path')
    , mkdirp     = require('mkdirp')
    , map        = require('map-async')
    , msee       = require('msee')
    , chalk      = require('chalk')

const showMenu  = require('./menu')
    , verify    = require('./verify')
    , printText = require('./print-text')
    , repeat    = require('./term-util').repeat
    , yellow    = require('./term-util').yellow
    , Exercise  = require('./exercise')
    , util      = require('./util')

const defaultWidth = 65

function Workshopper (options) {
  if (!(this instanceof Workshopper))
    return new Workshopper(options)

  if (typeof options != 'object')
    throw new TypeError('need to provide an options object')

  if (typeof options.name != 'string')
    throw new TypeError('need to provide a `name` String option')

  if (typeof options.title != 'string')
    throw new TypeError('need to provide a `title` String option')

  if (typeof options.exerciseDir != 'string')
    throw new TypeError('need to provide an "exerciseDir" String option')

  var stat = fs.statSync(options.exerciseDir)
  if (!stat || !stat.isDirectory())
    throw new Error('"exerciseDir" [' + options.exerciseDir + '] does not exist or is not a directory')

  if (typeof options.appDir != 'string')
    throw new TypeError('need to provide an "appDir" String option')

  var stat = fs.statSync(options.appDir)
  if (!stat || !stat.isDirectory())
    throw new Error('"appDir" [' + options.appDir + '] does not exist or is not a directory')

  var menuJson = path.join(options.exerciseDir, 'menu.json')
  stat = fs.statSync(menuJson)
  if (!stat || !stat.isFile())
    throw new Error('[' + menuJson + '] does not exist or is not a file')


  this.name        = options.name
  this.title       = options.title
  this.subtitle    = options.subtitle
  this.menuOptions = options.menu
  this.helpFile    = options.helpFile
  this.creditsFile = options.creditsFile
  this.prerequisitesFile  = options.prerequisitesFile
  this.width       = typeof options.width == 'number' ? options.width : defaultWidth
  this.exerciseDir = options.exerciseDir
  this.appDir      = options.appDir
  this.exercises   = require(menuJson)

  this.dataDir     = path.join(
      process.env.HOME || process.env.USERPROFILE
    , '.config'
    , this.name
  )

  mkdirp.sync(this.dataDir)


  if (argv.h || argv.help || argv._[0] == 'help')
    return this._printHelp()

  if (argv._[0] == 'credits')
    return this._printCredits()

  if (argv._[0] == 'prerequisites')
    return this._printPrerequisities()

  if (argv.v || argv.version || argv._[0] == 'version')
    return console.log(this.name + '@' + require(path.join(this.appDir, 'package.json')).version)

  if (argv._[0] == 'list') {
    return this.exercises.forEach(function (name) {
      console.log(name)
    })
  }

  if (argv._[0] == 'current')
    return console.log(this.getData('current'))

  if (argv._[0] == 'select' || argv._[0] == 'print') {
    return onselect.call(this, argv._.length > 1
      ? argv._.slice(1).join(' ')
      : this.getData('current')
    )
  }

  if (argv._[0] == 'verify' || argv._[0] == 'run')
    return this.execute(argv._[0])

  this.printMenu()
}


Workshopper.prototype.execute = function (mode) {
  var current = this.getData('current')
    , exercise

  if (!current) {
    console.error('ERROR: No active exercise. Select one from the menu.')
    return process.exit(1)
  }

  exercise = new Exercise(this.dirFromName(current), current)

  exercise.setup(mode, function (err) {
    if (err) {
      console.error('An error occurred during setup:', err)
      return console.error(err.stack)
    }

    this.runSolution(exercise, mode)
  }.bind(this))
}

Workshopper.prototype.printMenu = function () {
  var menu = showMenu({
      name              : this.name
    , title             : this.title
    , subtitle          : this.subtitle
    , width             : this.width
    , completed         : this.getData('completed') || []
    , exercises         : this.exercises
    , menu              : this.menuOptions
    , credits           : this.creditsFile && fs.existsSync(this.creditsFile)
    , prerequisites     : this.prerequisitesFile && fs.existsSync(this.prerequisitesFile)
  })

  menu.on('select', onselect.bind(this))
  menu.on('exit', function () {
    console.log()
    process.exit(0)
  })
  menu.on('help', function () {
    console.log()
    return this._printHelp()
  }.bind(this))
  menu.on('credits', function () {
    console.log()
    return this._printCredits()
  }.bind(this))
  menu.on('prerequisites', function () {
    console.log()
    return this._printPrerequisites()
  }.bind(this))
}

Workshopper.prototype.getData = function (name) {
  var file = path.resolve(this.dataDir, name + '.json')
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {}
  return null
}

Workshopper.prototype.updateData = function (id, fn) {
  var json = {}
    , file

  try {
    json = this.getData(id)
  } catch (e) {}

  file = path.resolve(this.dataDir, id + '.json')
  fs.writeFileSync(file, JSON.stringify(fn(json)))
}

Workshopper.prototype.dirFromName = function (name) {
  return util.dirFromName(this.exerciseDir, name)
}

Workshopper.prototype.runSolution = function (exercise, mode) {
  console.log(
    chalk.bold.yellow((mode == 'run' ? 'Running' : 'Verifying') + ' "' + exercise.id + '"...') + '\n'
  )

  var a   = submissionCmd(setup)
    , b   = solutionCmd(dir, setup)
    , v   = verify(a, b, {
          a      : setup.a
        , b      : setup.b
        , long   : setup.long
        , run    : run
        , custom : setup.verify
      })

  v.on('pass', onpass.bind(this, setup, dir, current))
  v.on('fail', onfail.bind(this, setup, dir, current))

  if (run && setup.close)
    v.on('end', setup.close)

  if (setup.stdin) {
    setup.stdin.pipe(v)
    setup.stdin.resume()
  }

  if (setup.a && (!setup.a._readableState || !setup.a._readableState.flowing))
    setup.a.resume()
  if (setup.b && (!setup.a._readableState || !setup.a._readableState.flowing))
    setup.b.resume()
}

Workshopper.prototype._printHelp = function () {
  this._printUsage()

  if (this.helpFile)
    printText(this.name, this.appDir, this.helpFile)
}

Workshopper.prototype._printCredits = function () {
  if (this.creditsFile)
    printText(this.name, this.appDir, this.creditsFile)
}

Workshopper.prototype._printPrerequisites = function () {
  if (this.prerequisitesFile)
    printText(this.name, this.appDir, this.prerequisitesFile)
}

Workshopper.prototype._printUsage = function () {
  printText(this.name, this.appDir, path.join(__dirname, './usage.txt'))
}

function onpass (setup, dir, current) {
  console.log(chalk.bold.green('# PASS'))
  console.log('\nYour solution to ' + current + ' passed!')

  if (setup.hideSolutions)
    return

  console.log('\nHere\'s what the official solution is if you want to compare notes:\n')

  var solutions = fs.readdirSync(dir).filter(function (file) {
        return (/^solution.*\.js/).test(file)
      }).map(function (file) {
        return {
            name: file
          , content: fs.readFileSync(path.join(dir, file), 'utf8')
              .toString()
              .replace(/^/gm, '  ')
        }
      })
    , completed
    , remaining

  map(
      solutions
    , function (file, i, callback) {
        // code fencing is necessary for msee to render the solution as code
        file.content = msee.parse('```js\n' + file.content + '\n```')
        callback(null, file)
      }
    , function (err, solutions) {
        if (err)
          throw err

        solutions.forEach(function (file, i) {
          console.log(repeat('-', this.width) + '\n')
          if (solutions.length > 1)
            console.log(chalk.bold(file.name) + ':\n')
          console.log(file.content)
          if (i == solutions.length - 1)
            console.log(repeat('-', this.width) + '\n')
        }.bind(this))

        this.updateData('completed', function (xs) {
          if (!xs) xs = []
          var ix = xs.indexOf(current)
          return ix >= 0 ? xs : xs.concat(current)
        })

        completed = this.getData('completed') || []

        remaining = this.exercises.length - completed.length
        if (remaining === 0) {
          console.log('You\'ve finished all the challenges! Hooray!\n')
        } else {
          console.log(
              'You have '
            + remaining
            + ' challenge'
            + (remaining != 1 ? 's' : '')
            + ' left.'
          )
          console.log('Type `' + this.name + '` to show the menu.\n')
        }

        if (setup.close)
          setup.close()
      }.bind(this)
  )
}

function onfail (setup, dir, current) {
  if (setup.close) setup.close()

  console.log(chalk.bold.red('# FAIL'))
  if (typeof setup.verify == 'function')
    console.log('\nYour solution to ' + current + ' didn\'t pass. Try again!')
  else
    console.log('\nYour solution to ' + current + ' didn\'t match the expected output.\nTry again!')
}


function findExercise(exercises, name) {
  name = name.toLowerCase().trim()
  return exercises
    .map(function (e, i) {
      return { name: e, number: i + 1 }
    })
    .filter(function (e) {
      return e.name.toLowerCase().trim() == name
    })[0]
}


function printExercise (appName, appDir, helpFile, exerciseFile) {
  printText(appName, appDir, exerciseFile, path.extname(exerciseFile), function () {
    console.log(
      chalk.bold('\n » To print these instructions again, run: `' + appName + ' print`.'))
    console.log(
      chalk.bold(' » To execute your program in a test environment, run:\n   `' + appName + ' run program.js`.'))
    console.log(
      chalk.bold(' » To verify your program, run: `' + appName + ' verify program.js`.'))
    if (helpFile) {
      console.log(
        chalk.bold(' » For help with this exercise or with ' + appName + ', run:\n   `' + appName + ' help`.'))
    }
    if (this.creditsFile) {
      console.log(
        bold(' » For a list of those who contributed to ' + this.name + ', run:\n   `' + this.name + ' credits`.'))
    }
    if (this.prerequisitesFile) {
      console.log(
        bold(' » For any set up/installion prerequisites for ' + this.name + ', run:\n   `' + this.name + ' prerequisites`.'))
    }        
    console.log()
  })
}

function onselect (name) {
  var exercise = findExercise(this.exercises, name)

  if (!exercise)
    return console.log(chalk.bold.red('No such exercise: ' + name))

  console.log(' ' + chalk.green.bold(this.title))
  console.log(chalk.green.bold(repeat('\u2500', chalk.stripColor(this.title).length + 2)))
  console.log(' ' + chalk.yellow.bold(exercise.name))
  console.log(' ' + chalk.yellow.italic('Exercise ' + exercise.number + ' of ' + this.exercises.length))

  var dir  = this.dirFromName(exercise.name)
    , txt  = path.resolve(dir, 'exercise.txt')
    , md   = path.resolve(dir, 'exercise.md')
      // preferentially render Markdown, fall back to text if it's not present.
    , file = fs.existsSync(md) ? md : txt

  this.updateData('current', function () {
    return exercise.name
  })

  printExercise(this.name, this.appDir, this.helpFile, file)
}

module.exports = Workshopper
