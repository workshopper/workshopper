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

  console.error('Usage: makews.js /path/to/menu.json')
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

  console.log('Making', name, '...')

  mkdirp(path.join(dir, 'solution'), function (err) {
    if (err)
      return console.error('Error making', dir + ':', err)

    ;'problem.md exercise.js solution/solution.js'.split(' ').forEach(function (f) {
      f = path.join(dir, f)
      fs.exists(f, function (exists) {
        if (exists)
          return

        fs.writeFile(
            f
          , path.extname(f) == '.js'
              ? '// code stuff here'
              : '# Write stuff about ' + name + ' here'
          , 'utf8'
          , function () {}
        )
      })
    })
  })
}
