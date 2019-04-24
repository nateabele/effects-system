import { Message } from '../message';
import { FutureInstance, encaseP } from 'fluture';
import { merge, mergeAll, curry, pipe, when, compose, not, isNil, prop, omit, assoc } from 'ramda';
import { AutoConfig } from '../modules';

import axios from 'axios';

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

type StringMap = { [key: string]: string };

type StatusCode = (
  100 | 101 | 200 | 201 | 202 | 302 | 400 | 401 | 402 | 403 | 404 | 405 | 406 | 500 | 501 | 502 | 503
);

type Method = 'get' | 'post' | 'put' | 'patch' | 'head' | 'delete' | 'options';

type RequestConfig<In extends {} | null> = {
  url: string;
  method: Method;
  headers?: StringMap;
  body?: In;
};

export type Response<Out> = {
  status: StatusCode;
  headers: StringMap;
  body: Out;
};

export type TypedResponse<Type, T> = {
  status: StatusCode;
  headers: { 'Content-Type': Type } & StringMap;
  body: T
};

const rename: any = curry((a: string, b: string, obj: { [key: string]: any }) => pipe(
  when(
    compose(not, isNil, prop(a)),
    (o: { [key: string]: any }) => assoc(b, prop(a, o), o),
  ),
  omit([a]),
)(obj));


@AutoConfig
export class Request<P extends RequestConfig<{} | null>> extends Message<P> {
  static id = 'Http.Request';

  static handler: <In, Err>(msg: In) => FutureInstance<Err, any> = encaseP(pipe(
    rename('body', 'data'),
    axios.request
  ));
}

export class Get extends Request<RequestConfig<null>> {
  static id = 'Http.Get';

  constructor(data: Omit<RequestConfig<null>, 'method'>) {
    super(merge({ method: 'get' as Method }, data));
  }
}

export class Post<Body> extends Request<RequestConfig<Body>> {
  static id = 'Http.Post';

  constructor(data: Omit<RequestConfig<Body>, 'method'>) {
    super(merge({ method: 'post' as Method }, data));
  }
}
