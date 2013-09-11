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

## License

**Workshopper** is Copyright (c) 2013 Rod Vagg [@rvagg](https://twitter.com/rvagg) and licenced under the MIT licence. All rights not explicitly granted in the MIT license are reserved. See the included LICENSE file for more details.

**Workshopper** builds on the excellent work by [@substack](https://github.com/substack) and [@maxogden](https://github.com/maxogden) who created **[stream-adventure](https://github.com/substack/stream-adventure)** which serves as the original foundation for **Workshopper** and **learnyounode**. Portions of **Workshopper** may also be Copyright (c) 2013 [@substack](https://github.com/substack) and [@maxogden](https://github.com/maxogden) given that it builds on their original code.

