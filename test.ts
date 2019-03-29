/**
 * Futures: Because [promises are broken](https://medium.com/@avaq/broken-promises-2ae92780f33)
 */
import { hasPath, ifElse, map, path, prop, pipe, evolve, unnest } from 'ramda';
import { exec } from './effects';

import { Get, Post } from './http';
import * as Future from 'fluture';

type Holding = {
  name: string;
  ticker: string;
  quantity: number;
  price: number;
};

const API_ROOT = 'http://localhost:1138',
      username = 'test@account',
      password = 's3krit';

const getWithAuth = <T>(authToken: string) => (url: string) => exec(new Get<T>({
  url,
  headers: { authToken }
}));

const diagram = exec(new Post<{ token: string }>({
  url: `${API_ROOT}/token`,
  body: { username, password }
}))
  .map(path(['data', 'token']))
  .chain((authToken: string) => (
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
  .map(pipe(
    map(prop('data')) as any,
    unnest
  ));


console.log(diagram);



// diagram.fork(
//   console.error.bind(console, 'FALE:\n'),
//   console.log.bind(console, 'OK:\n')
// );
