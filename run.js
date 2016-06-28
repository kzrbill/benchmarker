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
  }

  run(onComplete){
    let timer = new Timer().start()
    this.observers.map((o) => o.benchTestEvent('starting', {
      url: this.endpoint.url
    }))

    request
      .get(this.endpoint.url)
      .on('error', (err) => {
        timer.stop()
        this.observers.map((o) => o.benchTestEvent('error', {
          error: err,
          nanoseconds: timer.nanoseconds
        }))
        timer.reset()

        onComplete()
      })
      .on('response', (response) => {
        timer.stop()
        this.observers.map((o) => o.benchTestEvent('complete', {
          response: response.statusCode,
          nanoseconds: timer.nanoseconds
        }))
        timer.reset()

        onComplete()
      })
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

  run(){
    eachInSeries(this.benchTests, (benchTest, next) => {
      benchTest.run(() => {
        next()
      })
    })
  }
}


let outputLogger = new OutputLogger()
let benchTests = new BenchTests({
  observers: [outputLogger]
})
.add('http://localhost:3001/a')
.add('http://localhost:3001/b')
.add('http://localhost:3001/c')
.add('http://localhost:3001/d')

let instance = server.create()
benchTests.run()
