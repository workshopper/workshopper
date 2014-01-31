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

  Object.keys(variables).forEach(function (k) {
    contents = contents.replace(new RegExp('\\{' + k + '\\}', 'gi'), variables[k])
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

    printContents(appName, appDir, path.extname(file).replace(/^\./, ''), contents, callback)
  })
}


module.exports.text = printText
module.exports.file = printFile
