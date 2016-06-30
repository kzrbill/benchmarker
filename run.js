'use strict'


let logger = require('winston')
let chalk = require('chalk')
let server = require('./server')

let time = require('./lib/time')
let Time = time.Time

let bench = require('./lib/bench')
let BenchLoadTests = bench.BenchLoadTests


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
  totalRequests: 2,
  url: 'http://localhost:3001/random-delay',
  observers: [outputLogger]
}).run()

let instance = server.create()
