import { FutureInstance } from 'fluture';

export interface MsgCtor<In> {

  new<T extends Message<In>>(data: In): T;
}

export abstract class Message<In> {

  static handler: <In, Err, Out>(msg: In) => FutureInstance<Err, Out>;

  static id: string;

  public data: In;

  constructor(data: In) {
    Object.assign(this, { data });
  }

  toJSON() {
    return { type: (this.constructor as typeof Message).id, data: this.data };
  }
}
