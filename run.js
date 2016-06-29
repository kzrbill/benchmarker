'use strict'

let request = require('request')
let axios = require('axios')
let NanoTimer = require('nanotimer')
let server = require('./server')
let eachInSeries = require('async-each-series')
let async = require('async')
let logger = require('winston')
let chalk = require('chalk')

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

  run(onComplete){

    onComplete = onComplete || () => {}

    this.observers.map((o) => o.benchTestStarting({
      url: this.endpoint.url
    }))

    this.timer.start()

    request
      .get(this.endpoint.url)
      .on('error', (err) => {
        this._onErr(err, onComplete)
      })
      .on('response', (response) => {
        this._onResponse(response, onComplete)
      })
  }

  _onResponse(response, onComplete) {
    this.timer.stop()

    let result = {
      url: this.endpoint.url,
      nanoseconds: this.timer.nanoseconds,
      statusCode: response.status,
      data: response.data
    }

    this.observers.map((o) => o.benchTestComplete(result))
    this.timer.reset()

    onComplete(result)
  }

  _onErr(err, onComplete) {
    this.timer.stop()

    let result = {
      url: this.endpoint.url,
      nanoseconds: this.timer.nanoseconds,
      error: err
    }

    this.observers.map((o) => o.benchTestError(result))
    this.timer.reset()
    onComplete(result)
  }
}

class OutputLogger {
  benchTestError(obj){
    logger.warn(chalk.red('error'), obj)
  }

  benchTestComplete(obj){
    logger.info(chalk.green('complete'), {
      nanoseconds: chalk.green(obj.nanoseconds),
      url: obj.url
    })
  }

  benchTestStarting(obj){
    logger.info(chalk.yellow('starting'), {
      url: obj.url
    })
  }
}

class BenchTests{
  constructor(args){
    this.observers = args.observers || []
    this.benchTests = []
    this.totalNanosecs = 0
  }

  add(url){
    this.benchTests.push(new BenchTest(url, this.observers))
    return this
  }

  runSeries(){
    this.totalNanosecs = 0
    async.eachSeries(this.benchTests, (benchTest, next) => {
      benchTest.run((result) => {
        this.totalNanosecs += result.nanoseconds
        next()
      })
    }, () => {
      // All done - TODO: notify observers with overall result
      console.log('total time :', this.totalNanosecs)
    })
  }

  runParallel(){
    this.totalNanosecs = 0
    async.each(this.benchTests, (benchTest, done) => {
      benchTest.run((result) => {
        this.totalNanosecs += result.nanoseconds
        done()
      })
    }, () => {
      // All done - TODO: notify observers with overall result
      console.log('total time :', this.totalNanosecs)
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
benchTests.runParallel()
