'use strict'


let logger = require('winston')
let chalk = require('chalk')
let server = require('./server')
let ProgressBar = require('progress')
let async = require('async')

let emitter = require('./lib/emitter')

let time = require('./lib/time')
let Time = time.Time

let bench = require('./lib/bench')
let BenchLoadTests = bench.BenchLoadTests


class ProgressManager {

  constructor() {
    this.bars = {}
  }

  setup(){
    return
    emitter.on('benchTestsStarted', (tests) => {
      this.bars[tests.name] = new ProgressBar('Running ' + tests.total + ' tests for ' + tests.name + ' [:bar] :percent', {
        complete: '=',
        incomplete: '0',
        width: 80,
        total: tests.total
      })
    })

    emitter.on('benchTestsProgress', (tests) => {
      this.bars[tests.name].tick()
    })

    emitter.on('benchTestsFinished', (tests) => {
      this.bars[tests.name].tick()
    })
  }
}

let progressManager = new ProgressManager().setup()


class OutputLogger {

  constructor() {
    this.setup()
  }

  setup(){
    emitter.on('benchTestsFinished', (results) => {
      let time = new Time(results.totalMilisecs)
      let resultsArr = [
        `Time to serve: ${time.seconds()}s.`,
        `Total endpoints called: ${results.totalTestsRun}.`,
        `Total errors: ${results.totalErrors}.`
      ]

      if (results.totalErrors > 0) {
          logger.info(chalk.black.bold.bgRed(resultsArr.join(' ')))
          return
      }

      logger.info(chalk.black.bold.bgGreen(resultsArr.join(' ')))
    })
  }

  allTestsStarted(args) {
    logger.info(chalk.black.bold.bgYellow(`${args.name} started for ${args.url}. ${args.totalRequests} requests.`))
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
    // logger.info(chalk.yellow('request'), {
    //   url: obj.url
    // })
  }
}

let outputLogger = new OutputLogger()

let loadTests1 = new BenchLoadTests({
  totalRequests: 50,
  url: 'http://localhost:3001/random-delay',
  name: 'random delay batch 1',
  observers: [outputLogger]
})

let loadTests2 = new BenchLoadTests({
  totalRequests: 50,
  url: 'http://localhost:3001/random-delay',
  name: 'random delay batch 2',
  observers: [outputLogger]
})

async.eachSeries([loadTests1, loadTests2], (benchTests, done) => {
  benchTests.run()
  done()
})


let instance = server.create()
