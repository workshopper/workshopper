const fs          = require('fs')
    , path        = require('path')
    , colorsTmpl  = require('colors-tmpl')
    , msee        = require('msee')
    , mseeOptions = {
          paragraphStart: ''
        , paragraphEnd: '\n\n'
      }

function printText (name, appDir, file, filetype, callback) {
  var variables = {
      appname : name
    , rootdir : appDir
  }

  fs.readFile(file, 'utf8', function (err, contents) {
    if (err)
      throw err

    contents = contents.toString()
    contents = colorsTmpl(contents)
    Object.keys(variables).forEach(function (k) {
      contents = contents.replace(new RegExp('\\{' + k + '\\}', 'gi'), variables[k])
    })
    // proper path resolution
    contents = contents.replace(/\{rootdir:([^}]+)\}/gi, function (match, subpath) {
      return path.join(appDir, subpath)
    })
    if (filetype == '.md') {
      // convert Markdown to ANSI
      contents = msee.parse(contents, mseeOptions)
    }
    console.log(contents)
    callback && callback()
  })
}

module.exports = printText
