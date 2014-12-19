const path = require('path')
    , fs   = require('fs')


function repeat (ch, sz) {
  return new Array(sz + 1).join(ch)
}


function idFromName (id) {
  return id.toLowerCase()
    .replace(/\s/g, '_')
    .replace(/[^\w]/gi, '')
}


function dirFromName (exerciseDir, name) {
  return path.join(exerciseDir, idFromName(name))
}

function assertFs (type, options, field, base, fallback) {
  var target = options[field]
    , stat
  if (typeof target != 'string')
    if (fallback)
      options[field] = target = path.join(base, fallback)
    else
      throw new TypeError('need to provide an "' + field + '" String option')

  try {
    stat = fs.statSync(target) 
  } catch (e) {}

  if (!stat || !(type === 'file' ? stat.isFile() : stat.isDirectory()))
    throw new Error('"' + field + '" [' + path.relative('.', target) + '] does not exist or is not a ' + type)

  return target
}


module.exports = {
	  idFromName: idFromName
	, dirFromName: dirFromName
  , repeat: repeat
  , assertDir: assertFs.bind(null, "dir")
  , assertFile: assertFs.bind(null, "file")
}