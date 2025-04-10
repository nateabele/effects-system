/**
 * Futures: Because [promises are broken](https://medium.com/@avaq/broken-promises-2ae92780f33)
 */
import { hasPath, ifElse, map, path, prop, pipe, evolve, unnest } from 'ramda';
import util from 'util';
import yargs from 'yargs/yargs';
import { effectDispatch } from './effects';

import * as Modules from './modules';
import * as Future from 'fluture';
import * as Interactive from './interactive';

import { Get, Post } from './effects/http';

const flags: any = yargs(process.argv).argv;

const fromEffectDir = pipe(Modules.autoLoad, effectDispatch, Interactive.apply);

const exec = fromEffectDir('./effects');

const API_ROOT = 'http://localhost:1138',
  username = 'test@account',
  password = 's3krit';

const getWithAuth = (authToken: string) => (url: string) => exec(new Get({
  url,
  headers: { authToken }
}));

const flowDiagram = exec(new Post({ url: `${API_ROOT}/token`, body: { username, password } }))
  .map(path(['data', 'token']))
  .chain((authToken: string) => (
    /**
     * Try swapping these two lines after recording a run and then re-running.
     */
    // getWithAuth(authToken)(`${API_ROOT}/v2/accounts`)
    getWithAuth(authToken)(`${API_ROOT}/accounts`)
      .chain(pipe(
        prop('data'),
        map(pipe(
          path(['_links', 'details', 'href']),
          getWithAuth(authToken),

          Future.chain(ifElse(
            hasPath(['data', 'overview', 'holdings']),
            pipe(evolve({ data: path(['overview', 'holdings']) }), Future.of),
            pipe(
              path(['data', '_links', 'holdings', 'href']),
              getWithAuth(authToken)
            )
          ))

        )),
        Future.parallel(Infinity)
      ))
  ))
  .map(map(prop('data')))
  .map(unnest);

if (flags.inspect) {
  console.log(util.inspect(flowDiagram, { depth: 5, colors: true }));
}

if (flags.run) {
  flowDiagram.fork(
    console.error.bind(console, 'FALE:\n'),
    console.log.bind(console, 'OK:\n')
  );
}
