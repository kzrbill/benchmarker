'use strict'

let express = require('express')
let app = express()
let NanoTimer = require('nanotimer')

module.exports.create = (args) => {
  app.get('/', (req, res) => {
    res.send({foo: 'bar'})
  })

  app.get('/random-delay', (req, res) => {

    let nanotimer = new NanoTimer()
    let randomTime = Math.random()

    nanotimer.setTimeout(() => {
      let inMS = Math.round(randomTime * 1000)
      res.send(`delay:${inMS}ms`)
    }, '', `${randomTime}s`)
  })


  return app.listen(3001, (req, res) => {
    console.log('Server listening on port 3001')
  })
}
