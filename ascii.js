var util = require('util')
  , figlet = require('figlet')


  // A list of first words to be used in the greeting
  , word1 = [
  'very',
  'super',
  'shiny',
  'such',
  'much',
  'extra',
  'mega'
]

  // ...and some second words.
  , word2 = [
  'awesome',
  'impressive',
  'node',
  'profit',
  'win',
  'wow'
]

module.exports = function(cb) {
  var callback = cb || function(err, data) {}

  var text = util.format('%s \n %s',
                         word1[Math.floor(Math.random() * word1.length)],
                         word2[Math.floor(Math.random() * word2.length)])

  figlet.text(text, {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default'
  }, callback)
};
