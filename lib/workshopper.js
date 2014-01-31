const argv       = require('optimist').argv
    , fs         = require('fs')
    , path       = require('path')
    , mkdirp     = require('mkdirp')
    , map        = require('map-async')
    , msee       = require('msee')
    , chalk      = require('chalk')

const showMenu  = require('./menu')
    , verify    = require('./verify')
    , print     = require('./print-text')
    , repeat    = require('./term-util').repeat
    , yellow    = require('./term-util').yellow
    , util      = require('./util')

const defaultWidth = 65

function Workshopper (options) {
  if (!(this instanceof Workshopper))
    return new Workshopper(options)

  var stat
    , menuJson

  if (typeof options != 'object')
    throw new TypeError('need to provide an options object')

  if (typeof options.name != 'string')
    throw new TypeError('need to provide a `name` String option')

  if (typeof options.title != 'string')
    throw new TypeError('need to provide a `title` String option')

  if (typeof options.exerciseDir != 'string')
    throw new TypeError('need to provide an "exerciseDir" String option')

  stat = fs.statSync(options.exerciseDir)
  if (!stat || !stat.isDirectory())
    throw new Error('"exerciseDir" [' + options.exerciseDir + '] does not exist or is not a directory')

  if (typeof options.appDir != 'string')
    throw new TypeError('need to provide an "appDir" String option')

  stat = fs.statSync(options.appDir)
  if (!stat || !stat.isDirectory())
    throw new Error('"appDir" [' + options.appDir + '] does not exist or is not a directory')

  menuJson = path.join(options.exerciseDir, 'menu.json')
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
  var current  = this.getData('current')
    , exercise = current && this.loadExercise(current)

  if (!current)
    return error('No active exercise. Select one from the menu.')

  if (!exercise)
    return error('No such exercise: ' + name)
}

/*
  exercise = new Exercise(this.dirFromName(current), current)

  exercise.setup(mode, function (err) {
    if (err) {
      console.error('An error occurred during setup:', err)
      return console.error(err.stack)
    }

    this.runSolution(exercise, mode)
  }.bind(this))
}
*/


Workshopper.prototype.printMenu = function () {
  var menu = showMenu({
      name          : this.name
    , title         : this.title
    , subtitle      : this.subtitle
    , width         : this.width
    , completed     : this.getData('completed') || []
    , exercises     : this.exercises
    , menu          : this.menuOptions
    , credits       : this.creditsFile && fs.existsSync(this.creditsFile)
    , prerequisites : this.prerequisitesFile && fs.existsSync(this.prerequisitesFile)
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

/*
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
*/

Workshopper.prototype._printHelp = function () {
  this._printUsage()

  if (this.helpFile)
    print.file(this.name, this.appDir, this.helpFile)
}

Workshopper.prototype._printCredits = function () {
  if (this.creditsFile)
    print.file(this.name, this.appDir, this.creditsFile)
}

Workshopper.prototype._printPrerequisites = function () {
  if (this.prerequisitesFile)
    print.file(this.name, this.appDir, this.prerequisitesFile)
}

Workshopper.prototype._printUsage = function () {
  print.file(this.name, this.appDir, path.join(__dirname, './usage.txt'))
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


function printExercise (type, exerciseText) {
  print.text(this.appName, this.appDir, type, exerciseText)

  console.log(
    chalk.bold('\n » To print these instructions again, run: `' + this.appName + ' print`.'))
  console.log(
    chalk.bold(' » To execute your program in a test environment, run:\n   `' + this.appName + ' run program.js`.'))
  console.log(
    chalk.bold(' » To verify your program, run: `' + this.appName + ' verify program.js`.'))

  if (this.helpFile) {
    console.log(
      chalk.bold(' » For help with this exercise or with ' + this.appName + ', run:\n   `' + this.appName + ' help`.'))
  }

  if (this.creditsFile) {
    console.log(chalk.bold(
        ' » For a list of those who contributed to '
      + this.name
      + ', run:\n   `'
      + this.name
      + ' credits`.'
    ))
  }

  if (this.prerequisitesFile) {
    console.log(chalk.bold(
        ' » For any set up/installion prerequisites for '
      + this.name
      + ', run:\n   `'
      + this.name
      + ' prerequisites`.'
    ))
  }

  console.log()
}

Workshopper.prototype.loadExercise = function (name) {
  name = name.toLowerCase().trim()

  var number
    , dir
    , id
    , exerciseFile
    , stat
    , exercise

  this.exercises.some(function (_name, i) {
    if (_name.toLowerCase().trim() != name)
      return false

    number = i + 1
    name   = _name
    return true
  })

  if (number === undefined)
    return null

  dir          = this.dirFromName(name)
  id           = util.idFromName(name)
  exerciseFile = path.join(dir, './exercise.js')
  stat         = fs.statSync(exerciseFile)

  if (!stat || !stat.isFile())
    return error('ERROR:', exerciseFile, 'does not exist!')

  exercise     = require(exerciseFile)

  if (!exercise || typeof exercise.init != 'function')
    return error('ERROR:', exerciseFile, 'is not a workshopper exercise')

  exercise.init(id, name, dir, number)

  return exercise
}


function onselect (name) {
  var exercise = this.loadExercise(name)

  if (!exercise)
    return error('No such exercise: ' + name)

  console.log()
  console.log(' ' + chalk.green.bold(this.title))
  console.log(chalk.green.bold(repeat('\u2500', chalk.stripColor(this.title).length + 2)))
  console.log(' ' + chalk.yellow.bold(exercise.name))
  console.log(' ' + chalk.yellow.italic('Exercise', exercise.number, 'of', this.exercises.length))
  console.log()

  this.updateData('current', function () {
    return exercise.name
  })

  exercise.getExerciseText(function (err, type, exerciseText) {
    if (err)
      return error('Error loading exercise text:', err.message || err)

    printExercise(type, exerciseText)
  }.bind(this))
}


function error () {
  var pr = chalk.bold.red
  console.log(pr.apply(pr, arguments))
  process.exit(-1)
}

module.exports = Workshopper
