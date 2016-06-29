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

class Time {
  constructor(milisecs){
    this.milisecs = milisecs || 0
  }

  seconds() {
    return this.milisecs / 1000.0
  }
}

class Timer {
  constructor(){
    this.nanoTimer = new NanoTimer()
    this.interval = 1
    this.nanoseconds = 0
  }

  start(){
    this.nanoTimer.setInterval(() => {
      this.nanoseconds++
    }, '', `${this.interval}m`)

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

    request({
      url: this.endpoint.url
    }, (err, response, body) => {
      if (err) {
        this._onErr(err, onComplete)
        return
      }

      this._onResponse(response, body, onComplete)
    })
  }

  _onResponse(response, body, onComplete) {
    this.timer.stop()

    let result = {
      url: this.endpoint.url,
      milisecs: this.timer.nanoseconds,
      statusCode: response.status,
      body: body
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

class BenchTests{
  constructor(args){
    this.observers = args.observers || []
    this.benchTests = []
    this.totalMilisecs = 0
  }

  add(url){
    this.benchTests.push(new BenchTest(url, this.observers))
    return this
  }

  runSeries(){
    this.totalMilisecs = 0
    async.eachSeries(this.benchTests, (benchTest, next) => {
      benchTest.run((result) => {
        this.totalMilisecs += result.milisecs
        next()
      })
    }, () => {
      this.observers.map((o) => o.allTestsComplete({
        totalTestsRun: this.benchTests.length,
        totalMilisecs: this.totalMilisecs
      }))
    })
  }

  runParallel(){
    this.totalNanosecs = 0
    async.each(this.benchTests, (benchTest, done) => {
      benchTest.run((result) => {
        this.totalNanosecs += result.milisecs
        done()
      })
    }, () => {
      this.observers.map((o) => o.allTestsComplete({
        totalTestsRun: this.benchTests.length,
        totalMilisecs: this.totalNanosecs
      }))
    })
  }
}

class BenchLoadTests {
  constructor(args) {
    this.args = args
    this.totalRequests = args.totalRequests || 0
    this.observers = args.observers || []
    this.url = args.url || ''
  }

  run() {

    this.observers.map((o) => {
      o.allTestsStarted({
        name: 'Load test',
        url: this.url,
        totalRequests: this.totalRequests
      })
    })

    let benchTests = new BenchTests({
      observers: this.observers
    })

    for(let i = 0; i < this.totalRequests; i++) {
      benchTests.add(this.url)
    }

    benchTests.runParallel()
  }
}

class OutputLogger {
  allTestsStarted(args) {
    logger.info(chalk.black.bold.bgYellow(`${args.name} started for ${args.url} * ${args.totalRequests}`))
  }

  benchTestError(obj){
    logger.warn(chalk.red('error'), obj)
  }

  benchTestComplete(results){
    logger.info(chalk.green('complete'), {
      milisecs: chalk.green(`${results.milisecs}ms`),
      url: results.url,
      body: results.body
    })
  }

  benchTestStarting(obj){
    logger.info(chalk.yellow('request'), {
      url: obj.url
    })
  }

  allTestsComplete(results){
    let time = new Time(results.totalMilisecs)
    let resultsStr = `Time to serve: ${time.seconds()}s. Total endpoints called: ${results.totalTestsRun}.`
    logger.info(chalk.black.bold.bgGreen(resultsStr))
  }
}

let outputLogger = new OutputLogger()
let loadTests = new BenchLoadTests({
  totalRequests: 100,
  url: 'http://localhost:3001/random-delay',
  observers: [outputLogger]
}).run()

let instance = server.create()
