# Effects System

A TypeScript-based effects system for managing and recording side effects in applications, with support for transaction recording and playback.

If you found yourself here, you probably already know that _effects_ are anything other than pure computations over values. Some examples would be HTTP requests, reading from or writing to disk, etc.

## Overview

This project implements an effects system that allows you to:

- Execute and manage side effects in a controlled manner
- Record transactions and their results for later playback
- Compare live executions with recorded transactions
- Interactive decision making for handling mismatches between recorded and live effects

What does that actually mean? Check it out...

## Running the demo

**First, start the server**

```bash
npm run start
```

**Then, run the test script with no arguments**

```bash
npx tsx ./test.ts
```

Nothing happened.

Yes, exactly. The system is based on _futures_, which are kind of like promises, but better. (You can read about some of the reasons why [promises are broken](https://avaq.medium.com/broken-promises-2ae92780f33)).

What happened behind the scenes is that a fully-specified computation graph of multiple HTTP transactions and data transformations was constructed. This is cool because it means you can analyze the state and behavior of a system *at runtime*, but without actually touching anything (i.e. hitting APIs, etc).

**Next, try running it in `--inspect` mode**

You'll see a top-level overview of the computation to be run:

```javascript
Future {
  _spawn: Future {
    _fn: [Function (anonymous)],
    _a: {
      method: 'post',
      url: 'http://localhost:1138/token',
      body: { username: 'test@account', password: 's3krit' }
    },
    context: <ref *1> { head: null, tail: [Circular *1] }
  },
  // ...
```

This is just native `console.log()` and `util.inspect()`, but with a real inspector and a few class / function annotations, you could see details of exactly what will happen.

**Actually running it**

```bash
npx tsx ./test.ts --run
```

Predictably, this executes the compute graph, and returns the results of the sequence of API calls:

```
OK
```
```json
 [
  { name: 'Acme, Inc.', ticker: 'ACM', quantity: 5, price: 1.11 },
  { name: 'Macrosaft', ticker: 'MASF', quantity: 11, price: 25.01 },
  {
    name: 'Goodnight Moonshot',
    ticker: 'GMI',
    quantity: 5000,
    price: 0.22
  },
  { name: 'BearBNB', ticker: 'BBNB', quantity: 40, price: 15.28 }
]
```

We should also see some output from the server:

```
POST /token
GET /accounts
GET /accounts/1
GET /accounts/2
GET /accounts/2/holdings
```

**Recording mode**

Let's run it again, but with the `--out` flag:

```bash
npx tsx ./test.ts --run --out tx.json
```

Same thing happens, but now, there's a `tx.json` file in the directory, that contains a record of inputs and outputs of all the effects that were run.

**Playback mode**

To see the transcript in action, swap `--out` for `--in`:

```bash
npx tsx ./test.ts --run --in tx.json
```

You'll notice we get the same result, but _no additional logs appear on the server_. The system is matching up requests from the transcript and replaying the responses. This is already pretty handy for iteratively working on apps that hit an API and not having to hit the API all the time.

**Playback with changes**

Now try changing `test.ts` to call a different initial endpoint:

```diff
     /**
      * Try swapping these two lines after recording a run and then re-running.
      */
-    getWithAuth(authToken)(`${API_ROOT}/v2/accounts`)
-    // getWithAuth(authToken)(`${API_ROOT}/accounts`)
+    // getWithAuth(authToken)(`${API_ROOT}/v2/accounts`)
+    getWithAuth(authToken)(`${API_ROOT}/accounts`)
       .chain(pipe(
```

Re-running it with `--in tx.json` yields the following:

<pre><code>Executed command `Get` differs from transcript:


{
  "type" : "Http.Get",
  "data" : {
    "method" : "get",
    "url" : <span style="color: blue;">"http://localhost:1138/v2/accounts"</span>,
    "headers" : {
      "authToken" : "THE-S3KRIT-T0K3N"
    }
  }
}

Execute live effect?</code></pre>

It noticed that the script is trying to run one of the effects with different parameters than the transcript, and prompts to execute it live or replay from the transcript anyway. The diff view in the prompt shows what's changed.

Type `y` to run it live. As the server log shows, it only re-runs effects where the inputs have changed.

### Conclusions

These features alone, the ability to record and playback transcripts of side effects, enable a number of interesting features:

- Offline testing & development of systems that interact with remote APIs
- Selectively isolating subsystems within an application
- Diffing inputs and outputs to external systems between runs using `--in` and `--out` together
- Capturing detailed traces in remote applications, live

### One more thing

These few features allow powerful insight into and control over applications, even in scenarios where tools like a Chrome inspector session are unavailable.

Imagine taking it further with interactive terminal sessions: check out [http://localhost:1138/interactive](http://localhost:1138/interactive)—when you visit, the server terminal session prompts you for input:

```bash
Test service running at http://localhost:1138
Test value: _
```

Whatever you type is then echoed in the HTTP response:

```json
{
  "result": "We'll do it live!"
}
```



## Core Features

### Message System
- Abstract `Message` class for representing effects
- Type-safe message handling with TypeScript generics
- JSON serialization support for messages

### Transaction Recording
- Record effect executions and their results
- Save transaction logs to files
- Replay recorded transactions
- Interactive diff viewing when live effects don't match recorded ones

### Interactive Mode
- CLI-based interactive mode for handling effect discrepancies
- Diff visualization for comparing expected vs actual effects
- Option to execute live effects or use recorded results

## Installation

```bash
npm install
```

## Dependencies

- **Runtime Dependencies**
  - `axios`: HTTP client for making API requests
  - `express`: Web server framework
  - `fluture`: Functional future implementation for handling async operations
  - `ramda`: Functional programming utilities
  - `difflet`: For generating readable diffs
  - `yargs`: Command-line argument parsing

- **Development Dependencies**
  - `typescript`: TypeScript compiler and type definitions

## Architecture

The system is built around several key components:

1. **Message System**: Base classes for defining effects
2. **Transaction Recording**: Infrastructure for recording and replaying effects
3. **Interactive Terminal**: UI for handling discrepancies between recorded and live effects
4. **Future-based Effects**: Uses the Fluture library for handling asynchronous operations

## License

BSD-3