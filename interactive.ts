import { tap, equals, pick, identity, always } from 'ramda';
import yargs from 'yargs';

import Future, { FutureInstance } from 'fluture';

import difflet from 'difflet';
import { Message } from './message';
import * as Terminal from './interactive/terminal';

export type TransactionRecord<In, Err, Out> = [
  { type: string, data: In },
  { result: Out } | { result: null, error: Err }
];

export type TransactionRecordOut<In, Err, Out> = [
  Message<In>,
  { result: Out } | { error: Err }
];

let entries: TransactionRecordOut<any, any, any>[] = [];
let stack: TransactionRecord<any, any, any>[] | null = null;

const flags: any = yargs(process.argv).argv;
const diffView = difflet({ indent: 2 });
const clean = pick(['status', 'headers', 'data']);

if (flags.out) {
  Terminal.writeHook(flags.out, () => JSON.stringify(entries, null, 2));
}
if (flags.in) {
  stack = Terminal.readLog(flags.in);
}

const logger = <In, Err, Out>(cmd: Message<In>): [(e: Err) => Err, (r: Out) => Out] => [
  tap((error: Err) => entries.push([cmd, { result: null, error: clean((error as any).response) }])),
  tap((result: Out) => entries.push([cmd, { result: clean(result) }]))
];

const log = flags.out
  ? <In, Err, Out>(cmd: Message<In>) => Future.bimap(...logger<In, Err, Out>(cmd))
  : always(identity);

const handleEmptyStack = <In, Err, Out>(cmd: Message<In>, tx: FutureInstance<Err, Out>) => (
  new Future<Err, Out>((reject, resolve) => {
    Terminal.prompt(
      [`Unexpected ${cmd.constructor.name} command, transcript stack is empty.`, ''],
      'Execute live effect?'
    ).then((answer: string) => (
      (/^y/i).test(answer)
        ? tx.fork(reject, resolve)
        : reject(new Error('Unexpected empty transcript stack') as any as Err)
    ));
  })
);

const compare = <In, Err, Out>(
  cmd: Message<In>,
  tx: FutureInstance<Err, Out>,
  [req, res]: TransactionRecord<In, Err, Out>
): FutureInstance<Err, Out> => (
  equals(req, cmd.toJSON())
    ? log(cmd)(!!res.result ? Future.of(res.result) : Future.reject((res as any).error as Err))
    : new Future<Err, Out>((reject, resolve) => {
      Terminal.prompt(
        [
          '', '', `Executed command \`${cmd.constructor.name}\` differs from transcript:`,
          '', '', diffView.compare(req, cmd.toJSON()), ''
        ],
        'Execute live effect?'
      ).then((answer: string) => (
        (/^y/i).test(answer)
          ? tx.fork(reject, resolve)
          : res.result
            ? resolve(logger[1](res.result))
            : reject(logger[0]((res as any).error) as Err)
      ));
    })
);


const applyInner = <In, Err, Out>(cmd: Message<In>, tx: FutureInstance<Err, Out>) => (
  !stack
    ? tx
    : stack.length === 0
      ? handleEmptyStack(cmd, tx)
      : compare(cmd, tx, stack.shift()!)
);

type ExecFn<In, Err, Out> = (cmd: Message<In>) => FutureInstance<Err, Out>;

export const apply = <In, Err, Out>(exec: ExecFn<In, Err, Out>): ExecFn<In, Err, Out> => (
  (cmd: Message<In>) => applyInner(cmd, log(cmd)(exec(cmd)))
);
