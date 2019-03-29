import { equals, fromPairs, map, match, pipe, pick, slice } from 'ramda';

import Future, { FutureInstance } from 'fluture';
import axios from 'axios';

import { Message, MsgCtor } from './message';
import * as Http from './http';

import * as fs from 'fs';
import * as path from 'path';

import * as readline from 'readline';
import * as difflet from 'difflet';

const diffView = difflet({ indent: 2 });

const toFlags = pipe<string[], string[], string[][], [string, string][], { [key: string]: string }>(
  slice(2, Infinity) as (a: any) => string[],
  map(match(/^--([^=]+)=(.+)$/)),
  map(slice(1, 3) as unknown as (arg: string[]) => [string, string]),
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

const commands = new Map<MsgCtor<Message<any, any, any>>, (...args: any[]) => FutureInstance<any, any>>([
  [Http.Get, ({ url, headers = {}, params = {} }) => new Future((reject, resolve) => {
    axios.get(url, { params, headers }).then(resolve, reject);
  })],

  [Http.Post, ({ url, headers, params, body }) => new Future((reject, resolve) => {
    axios.post(url, body, { params, headers }).then(resolve, reject);
  })],
])

const clean = pick(['status', 'headers', 'data']);

export const exec = <In, Out, Err>(cmd: Message<In, Out, Err>): FutureInstance<Err, Out> => {

  const logger: [(e: Err) => Err, (r: Out) => Out] = [
    error => {
      entries.push([cmd, { error: clean((error as any).response) }]);
      return error;
    },
    result => {
      entries.push([cmd, { result: clean(result) }]);
      return result;
    }
  ];

  const handler = commands.get(cmd.constructor as MsgCtor<any>);

  if (!handler) {
    throw new Error('Unhandled message type: ' + cmd.constructor.name);
  }

  const execd = handler(cmd.data);
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
          : reject(new Error('Unexpected empty transcript stack') as any as Err)
      ))
    });
  }

  const [request, response]: [{ type: string, data: In }, { result: Out } | { result: null, error: Err }] = stack.shift();

  if (equals(request, cmd.toJSON())) {
    rl.close();

    const trx: FutureInstance<Err, Out> = (
      !!response.result
        ? Future.of(response.result)
        : Future.reject((response as any).error as Err)
    );
    return trx.bimap(...logger);
  }

  return (new Future<Err, Out>((reject, resolve) => {
    rl.write(`\n\nExecuted command \`${cmd.constructor.name}\` differs from transcript:\n\n`);
    rl.write(diffView.compare(request, cmd.toJSON()));

    rl.question('\nExecute live effect? ', (result: string) => {
      (/^y/i).test(result)
        ? tx.fork(reject, resolve)
        : response.result
        ? resolve(response.result)
        : reject((response as any).error as Err);

      rl.close();
    });
  })).bimap(...logger);
}
