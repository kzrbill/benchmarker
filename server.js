'use strict'

let express = require('express')
let app = express()
let NanoTimer = require('nanotimer')

module.exports.create = (args) => {
  app.get('/*', (req, res) => {

    let nanotimer = new NanoTimer()
    let randomTime = Math.random()

    nanotimer.setTimeout(() => {
      res.send('Hello client. Delay ' + randomTime)
    }, '', `${randomTime}s`)
  })


  return app.listen(3001, (req, res) => {
    console.log('Server listening on port 3001')
  })
}
