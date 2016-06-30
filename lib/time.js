'use strict'

let NanoTimer = require('nanotimer')

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

class Time {
  constructor(milisecs){
    this.milisecs = milisecs || 0
  }

  seconds() {
    return this.milisecs / 1000.0
  }
}


module.exports.Timer = Timer
module.exports.Time = Time
