'use strict'

let request = require('request')
let NanoTimer = require('nanotimer')
let server = require('./server')
let eachInSeries = require('async-each-series')

class Endpoint {
  constructor(url) {
    this.url = url
  }
}

// https://www.npmjs.com/package/nanotimer
class Timer {
  constructor(){
    this.nanoTimer = new NanoTimer()
    this.interval = 1
    this.nanoseconds = 0
  }

  start(){
    this.nanoTimer.setInterval(() => {
      this.nanoseconds++
    }, '', `${this.interval}n`)

    return this
  }

  reset(){
    this.nanoTimer.clearInterval()
    this.nanoseconds = 0
    return this
  }

  stop(){
    this.nanoTimer.clearInterval()
  }
}

class BenchTest {

  constructor(url, observers) {
    this.endpoint = new Endpoint(url)
    this.observers = observers || []
    this.timer = new Timer()
  }

  run(done){

    done = done || () => {}

    this.timer.start()
    this.observers.map((o) => o.benchTestEvent('starting', {
      url: this.endpoint.url
    }))

    // request = require('request')

    request
      .get(this.endpoint.url)
      .on('error', (err) => {
        this._onErr(err, done)
      })
      .on('response', (response) => {
        this._onResponse(response, done)
      })
  }

  _onResponse(response, done) {
    this.timer.stop()
    this.observers.map((o) => o.benchTestEvent('complete', {
      response: response.statusCode,
      nanoseconds: this.timer.nanoseconds
    }))
    this.timer.reset()
    done()
  }

  _onErr(err, done) {
    this.timer.stop()
    this.observers.map((o) => o.benchTestEvent('error', {
      err: response.statusCode,
      nanoseconds: this.timer.nanoseconds
    }))
    this.timer.reset()
    done()
  }
}

class OutputLogger {
  benchTestEvent(key, obj){
    console.log(key, obj)
  }
}

class BenchTests{
  constructor(args){
    this.observers = args.observers || []
    this.benchTests = []
  }

  add(url){
    this.benchTests.push(new BenchTest(url, this.observers))
    return this
  }

  runSeries(){
    eachInSeries(this.benchTests, (benchTest, next) => {
      benchTest.run(() => {
        next()
      })
    })
  }

  runAsync(){
    this.benchTests.map((test) => {
      test.run()
    })
  }
}

let outputLogger = new OutputLogger()
let benchTests = new BenchTests({
  observers: [outputLogger]
})

'some_api_routes'.split('').map((c) => {
  benchTests.add('http://localhost:3001/' + c)
})

let instance = server.create()
benchTests.runAsync()
