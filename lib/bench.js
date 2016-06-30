'use strict'

let async = require('async')
let request = require('request')

let emitter = require('./emitter')
let Timer = require('./time').Timer

class Endpoint {
  constructor(url) {
    this.url = url
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

class Progress {
  constructor(args) {
    args = args || {}
    this.total = args.total
    this.progress = args.progress
  }
}


class BenchTests {

  constructor(args) {
    args = args || {}
    this.observers = args.observers || []
    this.benchTests = []
    this.name = args.name
  }

  addBatch(url, total) {
    for(let i = 0; i < total; i++) {
      this.add(url)
    }
  }

  add(url){
    this.benchTests.push(new BenchTest(url, this.observers))
    return this
  }

  runSeries(){
    let iterator = async.eachSeries
    this._run(iterator)
  }

  runParallel(){
    let iterator = async.each
    this._run(iterator)
  }

  _run(iterator) {

    let totalMilisecs = 0
    let totalErrors = 0
    let progress = 0
    let total = this.benchTests.length

    emitter.emit('benchTestsStarted', {
      name: this.name,
      total: total
    })

    iterator(this.benchTests, (benchTest, done) => {
      benchTest.run((result) => {

        if (result.error) totalErrors++
        progress++
        totalMilisecs += result.milisecs

        emitter.emit('benchTestsProgress', {
          name: this.name,
          total: total,
          progress: progress
        })

        done()
      })
    }, () => {
      emitter.emit('benchTestsFinished', {
        name: this.name,
        total: total,
        totalTestsRun: total,
        totalMilisecs: totalMilisecs,
        totalErrors: totalErrors
      })
    })
  }
}

class BenchLoadTests {

  constructor(args) {
    this.args = args
    this.totalRequests = args.totalRequests || 0
    this.observers = args.observers || []
    this.url = args.url || ''
    this.name = args.name || 'load tests'
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
      observers: this.observers,
      name: this.name

    })

    benchTests.addBatch(this.url, this.totalRequests)
    benchTests.runParallel()
  }
}

module.exports.Endpoint = Endpoint
module.exports.BenchTest = BenchTest
module.exports.BenchTests = BenchTests
module.exports.BenchLoadTests = BenchLoadTests
