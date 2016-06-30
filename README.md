# Benchmarker

Simple project to load and speed test API endpoints.

Executing 'node run' will create a test express API serving as a sample API under test.

Careful where you point this and what numbers you give - mis-use may result in a DDoS.

## Backlog

+ Progress bars - https://www.npmjs.com/package/progress
+ Perform test runs based on configuration
+ Run load test in batches. e.g. 10 iterations of 100 bench tests
+ Point to config file from command line arguments so can have a bunch of configs
