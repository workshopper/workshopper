const fs          = require('fs')
    , path        = require('path')
    , colorsTmpl  = require('colors-tmpl')
    , through     = require('through')
    , msee        = require('msee')
    , mseeOptions = {
          paragraphStart: ''
        , paragraphEnd: '\n\n'
      }

function commandify (s) {
    return String(s).toLowerCase().replace(/\s+/g, '-');
}

function getText (appName, appDir, filetype, contents) {

  var variables = {
      appname : appName
    , rootdir : appDir
    , COMMAND : commandify(appName)
    , ADVENTURE_COMMAND : commandify(appName)
    , ADVENTURE_NAME : appName
  }

  if (typeof contents === 'object')
    contents = contents.toString()

  if (typeof contents === 'function')
    contents = contents()

  if (typeof contents !== 'string')
    contents = ''

  contents = colorsTmpl(contents)

  contents = contents.replace(/\{([^}]+)\}/gi, function (match, k) {
    return variables[k] || ('{' + k + '}')
  })

  contents = contents.replace(/\$([A-Z_]+)/g, function (match, k) {
    return variables[k] || ('$' + k)
  })

  if (appDir) {
    // proper path resolution
    contents = contents.replace(/\{rootdir:([^}]+)\}/gi, function (match, subpath) {
      return 'file://' + path.join(appDir, subpath)
    })
  }

  if (filetype === 'md') {
    // convert Markdown to ANSI
    contents = msee.parse(contents, mseeOptions)
  }

  return contents
}

function printText (appName, appDir, filetype, contents) {
  console.log(getText(appName, appDir, filetype, contents))
}

function createFileStream (appName, appDir, file) {
  var filetype = path.extname(file).replace(/^\./, '')
  return fs.createReadStream(file, {encoding: 'utf8'})
           .pipe(through(function (data) {
              this.emit('data', getText(appName, appDir, filetype, data))
           }))
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

function localisedFileStream (appName, appDir, file, lang) {
  file = getExistingFile(file, lang)
  return file ? createFileStream(appName, appDir, file) : null
}

function localisedFirstFileStream (appName, appDir, files, lang) {
  var file = null
  files.forEach(function (rawFile) {
    // Since the files that will be printed are subject to user manipulation
    // a null can happen here, checking for it just in case.
    if (rawFile === undefined || rawFile === null)
      return

    if (!file)
      file = getExistingFile(rawFile, lang)
  })
  return file ? createFileStream(appName, appDir, file) : null
}


module.exports.text = printText
module.exports.localisedFileStream = localisedFileStream
module.exports.localisedFirstFileStream = localisedFirstFileStream
