import { equals, fromPairs, map, match, pipe, pick, slice } from 'ramda';

import Future, { FutureInstance } from 'fluture';
import axios from 'axios';

import * as Http from './http';

import * as fs from 'fs';
import * as path from 'path';

import * as readline from 'readline';
import * as difflet from 'difflet';

const diffView = difflet({ indent: 2 });

const toFlags = pipe(
  slice(2, Infinity),
  map(match(/^--([^=]+)=(.+)$/)),
  map(slice(1, 3)),
  fromPairs
);

const flags = toFlags(process.argv);

let entries: any[] = [];
let stack: any = null;

export const log = () => [...entries];

if (flags.out) {
  process.on('exit', () => {
    fs.writeFileSync(path.resolve(process.cwd(), flags.out), JSON.stringify(log()));
  });
}

if (flags.in) {
  try {
    stack = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), flags.in)).toString('utf8'));
  } catch (e) {
    console.error(`Could not load transaction log from file ${flags.in}`, e);
  }
}

const commands = new Map([
  [Http.Get, ({ url, headers = {}, params = {} }) => new Future((reject, resolve) => {
    axios.get(url, { params, headers }).then(resolve, reject);
  })],

  [Http.Post, ({ url, headers, params, body }) => new Future((reject, resolve) => {
    axios.post(url, body, { params, headers }).then(resolve, reject);
  })],
])

const cleanObj = pick(['status', 'headers', 'data']);

export const exec = (cmd: any) => {

  const logger: any = [error => {
    entries.push([cmd, { error: cleanObj(error.response) }]);
    return error;
  },
  result => {
    entries.push([cmd, { result: cleanObj(result) }]);
    return result;
  }];

  const execd = (commands.get(cmd.constructor) as any)(cmd.data);
  const tx = !flags.out ? execd : execd.bimap(...logger);

  if (!stack) {
    return tx;
  }
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  if (stack.length === 0) {
    rl.write(`Unexpected ${cmd.constructor.name} command, transcript stack is empty.`);

    return new Future((reject, resolve) => {
      rl.question('\nExecute live effect? ', (result: string) => (
        (/^y/i).test(result)
          ? tx.fork(reject, resolve)
          : reject(new Error('Unexpected empty transcript stack'))
      ))
    });
  }

  const [request, response] = stack.shift();

  if (equals(request, cmd.toJSON())) {
    rl.close();
    return ((
      response.result
        ? Future.of(response.result)
        : Future.reject(response.error)
    ) as any).bimap(logger[0], logger[1]);
  }

  return (new Future((reject, resolve) => {
    rl.write(`\n\nExecuted command ${cmd.constructor.name} differs from transcript:\n\n`);
    rl.write(diffView.compare(request, cmd.toJSON()));

    rl.question('\nExecute live effect? ', (result: string) => {
      (/^y/i).test(result)
        ? tx.fork(reject, resolve)
        : response.result
        ? resolve(response.result)
        : reject(response.error);

      rl.close();
    });
  })).bimap(logger[0], logger[1]);
}