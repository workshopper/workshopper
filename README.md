# Workshopper

**A terminal workshop runner framework**

[![NPM](https://nodei.co/npm/workshopper.png?downloads=true&stars=true)](https://nodei.co/npm/workshopper/) [![NPM](https://nodei.co/npm-dl/workshopper.png?months=3)](https://nodei.co/npm/workshopper/)

![Learn You The Node.js For Much Win!](https://raw.github.com/rvagg/learnyounode/master/learnyounode.png)

![Level Me Up Scotty!](https://raw.github.com/rvagg/levelmeup/master/levelmeup.png)

**Workshopper** is used by **[learnyounode](https://github.com/rvagg/learnyounode)**, an introduction to Node.js workshop application, and **[learnyounode](https://github.com/rvagg/learnyounode)**, an introduction to Level* / NodeBase workshop application.

## Usage

Mostly you should just follow how **[learnyounode](https://github.com/rvagg/learnyounode)** and **[learnyounode](https://github.com/rvagg/learnyounode)** works.

Create a new Node project, add a `"bin"` that looks something like this:

```js
#!/usr/bin/env node

const Workshopper = require('workshopper')
    , path        = require('path')

Workshopper({
    name   : 'learnyounode'
  , title  : 'LEARN YOU THE NODE.JS FOR MUCH WIN!'
  , appDir : path.join(__dirname, '..')
}).init()
```

Additionally you can supply a `'subtitle'` String option and a `'menu'` object option that will be passed to [terminal-menu](https://github.com/substack/terminal-menu) so you can change the `'bg'` and `'fg'` colours.

Create a *menu.json* file in your project that looks something like this:

```js
[
    "HELLO WORLD"
  , "BABY STEPS"
  , "MY FIRST I/O!"
...
]
```

Where the menu items correspond to lower-case, punctuation-free directories in a *problems/* directory.

Each subdirectory in the *problems/* directory should contain the following files:

 * **problem.txt** - a description of the problem. You can use [colors-tmpl](https://github.com/rvagg/colors-tmpl) formatting for colouring and you may also use the string `{appname}` to substitute in the name you provided to `Workshopper()` and `{rootdir}` to substitute for the absolute path of where your application has been installed on the users' system.
 * **setup.js** - a module that sets up the test environment with any fixtures required and can verify solutions. More on this below.
 * **solution.js** - the "official" solution to the problem. You can have multiple files in your solution, they filenames just need to be prefixed with 'solution' and end with '.js' and they will all be shown together as the official solution.

**Workshopper** should also be largely compatible with the exercises in **[stream-adventure](https://github.com/substack/stream-adventure)**. Feel free to mix and match exercises from the projects that use Workshopper!

## setup.js

The most complicated part of creating an exercise is the *setup.js* file which needs to set up your test environment with any fixtures, perform any additional verification required beyond what workshopper does and then any cleanup.

**Validation** by default is performed by comparing the *stdout* of the official solution to the *stdout* of the submission. Both are executed in separate child processes and the stdout is captured and compared, line by line. Any discrepancies are counted as a failure.

Your exercises (for now) should focus on how to funnel comparable data to stdout. The easiest form is to instruct the user to print solution values with `console.log()`.

### Simplest form

The absolute simplest *setup.js* is one that simply defers to the solution to do the work.

```js
module.exports = function () {
  return {}
}
```

In this case we are returning an empty options object so the defaults will be used. This means that no additional command-line arguments are supplied to child processes, nothing special is done to make *stdout* comparable, no additional verification stage is required and no cleanup needs to be performed. The exercise is simply asking the user to print something to the console that we can compare with the official solution.

This is normally only useful in a HELLO WORLD. Normally you should be passing dynamic content of some kind to the programs. But a simple HELLO WORLD is a good way to get the user ready for the format.

### Long / short form output

```js
module.exports = function () {
  return { long: true }
}
```

Tell workshopper that the stdout will consist of long lines to have it print the actual vs output on separate lines. Otherwise the output of both processes will be printed out side-by-side.

### Command-line arguments

```js
module.exports = function () {
  return { args: [ Math.random(), Math.random() ] }
}
```

In this case we are supplying *two* command-line arguments to the child processes. They will get the same arguments and we expect their stdout to match. This may be a mathematical exercise.

If you need to supply different arguments to the submission and the solution programs then you can differentiate:

```js
module.exports = function () {
  return {
      submissionAgrs: [ 8000 ]
    , solutionAgrs: [ 8001 ]
  }
}
```

In this case we may be wanting the programs to listen to a TCP port but we don't want to have conflicts when both processes are running simultaneously. We instruct the user to listen to the port number supplied as the first command-line argument.

### Cleanup

```js
module.exports = function () {
  var server = http.createServer(function (req, res) {
    res.end('boom!')
  }).listen(9345)

  return {
      args  : [ 'http://localhost:9345' ]
    , close : server.close.bind(server)
  }
}
```

In this case we are starting an HTTP server which must be cleaned up after the solution and submission programs have finished running, otherwise the workshop application will not exit. Supply the `'close'` option as a function that will be called after the child processes have completed.

### Repurposing stdout

Often a problem will not lend itself to concocting console output so you need to verify by other means. The simplest route is to repurpose stdout and send it separate output for both the submission and the solution based on something done by the solution.

```js
var PassThrough = require('stream').PassThrough || require('readable-stream/passthrough')
  , hyperquest  = require('hyperquest')

module.exports = function () {
  var submissionOut = new PassThrough()
    , solutionout   = new PassThrough()

  setTimeout(function () {
    hyperquest.get('http://localhost:8000').pipe(submissionOut)
    hyperquest.get('http://localhost:8001').pipe(solutionOut)
  }, 500)

  return {
      submissionAgrs : [ 8000 ]
    , solutionAgrs   : [ 8001 ]
    , a              : submissionOut
    , b              : solutionOut
  }
}
```

In this case we are telling out user to create an HTTP server that listens to the port supplied as the first command-line argument.
We have also instructed Workshopper to replace the stdout from the child processes with substitute streams. `PassThrough` streams work well for this.

We are expecting that it will take no longer than 500ms for the child processes to get ready and then we fetch the output and pipe it to our `PassThrough` streams. Workshopper will then compare these streams as if they were stdout.

### "run" vs "verify"

There is a problem with the previous example because Workshopper allows the user to use both *"run"* and *"verify"* modes. When using "run" mode, only the submission is run and the stdout that Workshopper would normally verify (including stdout that you may have generated with a `PassThrough`) will be sent to stdout. in this case the **solution program is not executed**. So, when we use `hyperquest.get()` on the solution port it will fail because there is no server running.

The solution is to use the first argument to the setup.js export function, this is a boolean that will indicate whether we are in "run" mode or not. If we are in "run" mode then we can skip anything that may need to be done against the solution executable.

```js
var PassThrough = require('stream').PassThrough || require('readable-stream/passthrough')
  , hyperquest  = require('hyperquest')

module.exports = function (run) {
  var submissionOut = new PassThrough()
    , solutionout   = new PassThrough()

  setTimeout(function () {
    hyperquest.get('http://localhost:8000').pipe(submissionOut)
    if (!run)
      hyperquest.get('http://localhost:8001').pipe(solutionOut)
  }, 500)

  return {
      submissionAgrs : [ 8000 ]
    , solutionAgrs   : [ 8001 ]
    , a              : submissionOut
    , b              : solutionOut
  }
}
```

**You must always consider whether "run" mode is going to cause problems with your setup.js**

## License

**Workshopper** is Copyright (c) 2013 Rod Vagg [@rvagg](https://twitter.com/rvagg) and licenced under the MIT licence. All rights not explicitly granted in the MIT license are reserved. See the included LICENSE file for more details.

**Workshopper** builds on the excellent work by [@substack](https://github.com/substack) and [@maxogden](https://github.com/maxogden) who created **[stream-adventure](https://github.com/substack/stream-adventure)** which serves as the original foundation for **Workshopper** and **learnyounode**. Portions of **Workshopper** may also be Copyright (c) 2013 [@substack](https://github.com/substack) and [@maxogden](https://github.com/maxogden) given that it builds on their original code.