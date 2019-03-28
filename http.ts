export class Get {

  static id = 'Http.Get';

  public data: any;

  constructor(data) {
    this.data = data;
  }

  toJSON() {
    return { type: (this.constructor as any).id, data: this.data };
  }
}

export class Post {

  static id = 'Http.Post';

  public data: any;

  constructor(data) {
    this.data = data;
  }

  toJSON() {
    return { type: (this.constructor as any).id, data: this.data };
  }
}
