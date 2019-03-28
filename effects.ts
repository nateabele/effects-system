import { fromPairs, map, match, pipe, pick, slice } from 'ramda';

import Future from 'fluture';
import axios from 'axios';

import * as Http from './http';

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const toFlags = pipe(
  slice(2, Infinity),
  map(match(/^--([^=]+)=(.+)$/)),
  map(slice(1, 3)),
  fromPairs
);

const flags = toFlags(process.argv);

let entries: any[] = [];
let stack = null;

export const log = () => [...entries];

if (flags.out) {
  setTimeout(() => {
    fs.writeFileSync(path.resolve(process.cwd(), flags.out), JSON.stringify(log()));
  }, 500);
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

  if (stack) {}

  return (commands.get(cmd.constructor) as any)(cmd.data).bimap(
    error => {
      entries.push([cmd, { error: cleanObj(error.response) }]);
      return error;
    },
    result => {
      entries.push([cmd, { result: cleanObj(result) }]);
      return result;
    }
  );
}