/**
 * Futures: Because [promises are broken](https://medium.com/@avaq/broken-promises-2ae92780f33)
 */
import { curry, map, path, prop, pipe } from 'ramda';
import { exec, log } from './effects';
import { Get, Post } from './http';
import * as Future from 'fluture';

const API_ROOT = 'http://localhost:1138',
      username = 'test@account',
      password = 's3krit';

const getWithAuth = curry((authToken, url) => exec(new Get({
  url,
  headers: { authToken }
})));

const diagram = exec(new Post({ url: `${API_ROOT}/token`, body: { username, password } }))
  .map(path(['data', 'token']))
  .chain(authToken => (
    getWithAuth(authToken, `${API_ROOT}/accounts`)
      .chain(pipe(
        prop('data'),
        map(pipe(
          path(['_links', 'details', 'href']),
          getWithAuth(authToken)
        )),
        Future.parallel(Infinity)
      ))
  ))
  .map(map(prop('data')));

console.log(diagram);



// diagram.fork(
//   console.error.bind(console, 'FALE:\n'),
//   console.log.bind(console, 'OK:\n')
// );
