#!/usr/bin/env node

// make the basic skeleton of a workshopper given a menu.json
// assumes the menu.json is in the directory under which the
// exercises will be placed

const fs     = require('fs')
    , path   = require('path')
    , mkdirp = require('mkdirp')

    , util   = require('../util')

function usage (err) {
  if (err)
    console.error(err)

  console.error('Usage: makews.js /path/to/menu.json [--force]')
}

if (!process.argv[2])
  return usage()

if (!fs.existsSync(process.argv[2]))
  return usage('File [' + process.argv[2] + '] does not exist')

var menuFile = path.resolve(process.cwd(), process.argv[2])
  , exDir    = path.dirname(menuFile)
  , menu     = require(menuFile)

if (!Array.isArray(menu))
  return usage('[' + process.argv[2] + '] doesn\'t contain an array of exercises')

console.log(menuFile, exDir)

if (menu.filter(function (name) { return typeof name != 'string' }).length)
  return usage('[' + process.argv[2] + '] doesn\'t contain an array of Strings')

menu.forEach(processExercise)

function processExercise (name) {
  var dir = util.dirFromName(exDir, name)
    , files = {
          'problem.md'           : '# Write stuff about ' + name + ' here'
        , 'exercise.js'          : 'const Exercise = require(\'workshopper-exercise\'); module.exports = new Exercise()'
        , 'solution/solution.js' : '// solution stuff here'
      }

  console.log('Making', name, '...')

  mkdirp(path.join(dir, 'solution'), function (err) {
    if (err)
      return console.error('Error making', dir + ':', err)

    Object.keys(files).forEach(function (f) {
      var filePath = path.join(dir, f)

      fs.exists(filePath, function (exists) {
        if (exists && process.argv[3] !== '--force')
          return

        fs.writeFile(
            filePath
          , files[f]
          , 'utf8'
          , function () {}
        )
      })
    })
  })
}
