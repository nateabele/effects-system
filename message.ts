export interface MsgCtor<T extends Message<any, any, any>> {
  new(data: any): T;
}

export abstract class Message<In, Out, Err> {

  static id: string;

  public data: In;

  constructor(data: In) {
    Object.assign(this, { data });
  }

  toJSON() {
    return { type: (this.constructor as typeof Message).id, data: this.data };
  }
}
