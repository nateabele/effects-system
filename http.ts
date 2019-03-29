
import { Message } from './message';

type StringMap = { [key: string]: string };

type Request = {
  url: string;
  headers?: StringMap;
};

type StatusCode = (
  100 | 101 | 200 | 201 | 202 | 302 | 400 | 401 | 402 | 403 | 404 | 405 | 406 | 500 | 501 | 502 | 503
);

export type Response<T> = {
  status: StatusCode;
  headers: StringMap;
  body: T
};

export type TypedResponse<Type, T> = {
  status: StatusCode;
  headers: { 'Content-Type': Type } & StringMap;
  body: T
};

export class Get<T> extends Message<Request, Response<T>, any> {
  static id = 'Http.Get';
}

export class Post<T> extends Message<Request & { body: string | StringMap }, Response<T>, any> {
  static id = 'Http.Post';
}
