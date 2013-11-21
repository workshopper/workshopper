const path         = require('path')
    , spawn        = require('child_process').spawn
    , inherits     = require('util').inherits
    , EventEmitter = require('events').EventEmitter
    , compare      = require('./compare')

function Exercise (id, dir) {
  this.id  = id
  this.dir = dir

  try {
    this._runner = require(path.join(dir, 'setup.js'))
  } catch (e) {
    throw new Error('No such exercise "' + id + '"', e)
  }
}

inherits(EventEmitter, Exercise)

Exercise.prototype.setup = function (mode, callback) {
  if (typeof this._runner.setup != 'function')
    return process.nextTick(callback)

  this._runner.setup(mode, callback)
}

Exercise.prototype.getSubmissionCommand = function (file) {
  var args = this._runner.args || this._runner.submissionArgs || []
    , exec

  if (this._runner.wrap || this._runner.submissionWrap) {
    exec = [ require.resolve('./exec-wrapper') ]
    exec = exec.concat(this._runner.wrap || this._runner.submissionWrap)
    exec = exec.concat(file)
  } else {
    exec = [ file ]
  }

  return exec.concat(args)
}

Exercise.prototype.getSolutionCommand = function () {
  var args = this._runner.args || this._runner.solutionArgs || []
    , exec

  if (this._runner.wrap || this._runner.solutionWrap) {
    exec = [ require.resolve('./exec-wrapper') ]
    exec = exec.concat(this._runner.wrap || this._runner.solutionWrap)
    exec = exec.concat(path.join(this._dir, 'solution.js'))
  } else {
    exec = [ path.join(this._dir, 'solution.js') ]
  }

  return exec.concat(args)
}

Exercise.prototype.execute = function (mode, file) {
  var self = this
    , submission
    , solution
    , submissionStdout
    , solutionStdout

  function kill () {
    submission && typeof submission.kill == 'function' && submission.kill()
    solution && typeof solution.kill == 'function' && solution.kill()
    setTimeout(self.emit.bind(self, 'end'), 10)
  }

  submission = spawn(process.execPath, this.getSubmissionCommand(file))
  submissionStdout = this._runner.submissionStdout || submission.stdout

  if (mode == 'run') {
    submissionStdout.pipe(process.stdout)
    submission.stderr.pipe(process.stderr)
    submissionStdout.on('end', kill)
    return
  }

  solution = spawn(process.execPath, this.getSolutionCommand())
  solutionStdout = this._runner.solutionStdout || solution.stdout

  if (this._runner.verifyType = 'compare') {
    return compare(
        submissionStdout
      , solutionStdout
      , this._runner.longOutput
      , function (err, status) {
          kill()
          if (err)
            return self.emit('error')
          self.emit(status)
        }
    )
  }
}