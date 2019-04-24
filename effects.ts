import { flip, is } from 'ramda';

import { FutureInstance } from 'fluture';

import { Message, MsgCtor } from './message';

type EffectMap = Map<MsgCtor<any>, typeof Message.handler>;

export const effectDispatch = <In, Out, Err>(effects: EffectMap) => (cmd: Message<In>): FutureInstance<Err, Out> => {
  const ctor = cmd.constructor as MsgCtor<In>
  const key = effects.has(ctor)
    ? ctor
    : Array.from(effects.keys()).find(flip(is)(cmd));

  const handler: typeof Message.handler | undefined = key && effects.get(key) || undefined;

  if (!handler) {
    throw new Error(`Unhandled message type: ${cmd.constructor.name}`);
  }
  return handler(cmd.data);
};
