'use strict'

let express = require('express')
let app = express()
let NanoTimer = require('nanotimer')

module.exports.create = (args) => {
  ['a', 'b', 'c', 'd'].map((route) => {
    app.get('/' + route, (req, res) => {

      let nanotimer = new NanoTimer()
      let randomTime = Math.random()

      nanotimer.setTimeout(() => {
        res.send('Hello ' + nanotimer)
      }, '', `${randomTime}s`)
    })
  })

  return app.listen(3001, (req, res) => {
    console.log('Server listening on port 3001')
  })
}
