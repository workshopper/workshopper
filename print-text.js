const fs          = require('fs')
    , path        = require('path')
    , colorsTmpl  = require('colors-tmpl')
    , msee        = require('msee')
    , mseeOptions = {
          paragraphStart: ''
        , paragraphEnd: '\n\n'
      }


function printText (appName, appDir, filetype, contents) {
  var variables = {
      appname : appName
    , rootdir : appDir
  }

  contents = colorsTmpl(contents)

  contents = contents.replace(/\{([^}]+)\}/gi, function (match, k) {
    return variables[k] || ('{' + k + '}')
  })

  // proper path resolution
  contents = contents.replace(/\{rootdir:([^}]+)\}/gi, function (match, subpath) {
    return 'file://' + path.join(appDir, subpath)
  })

  if (filetype == 'md') {
    // convert Markdown to ANSI
    contents = msee.parse(contents, mseeOptions)
  }

  console.log(contents)
}


function printFile (appName, appDir, file, callback) {
  fs.readFile(file, 'utf8', function (err, contents) {
    if (err)
      throw err

    printText(appName, appDir, path.extname(file).replace(/^\./, ''), contents)
    callback && callback();
  })
}


function getExistingFile (file, lang) {
  if (!file)
    return false

  file = file.replace(/\{lang\}/g, lang)
  if (fs.existsSync(file)) {
    var stat = fs.statSync(file)
    if (stat && stat.isFile())
      return file
  }
  return null
}

function printLocalisedFile (appName, appDir, file, lang, callback) {
  file = getExistingFile(file, lang)

  if (file) {
    printFile(appName, appDir, file, callback)
    return true
  }

  if (callback)
    process.nextTick(callback)

  return false
}

function printLocalisedFirstFile (appName, appDir, files, lang, callback) {
  var consumed = false
  files.filter(function (file) {
    // Since the files that will be printed are subject to user manipulation
    // a null can happen here, checking for it just in case.
    return file !== undefined && file !== null
  }).forEach(function (file) {
    if (consumed)
      return
    if (file = getExistingFile(file, lang)) {
      consumed = true
      printFile(appName, appDir, file, callback)
    }
  })
  if (!consumed && callback)
    process.nextTick(callback)
  return consumed
}


module.exports.text = printText
module.exports.file = printFile
module.exports.localisedFile = printLocalisedFile
module.exports.localisedFirstFile = printLocalisedFirstFile
