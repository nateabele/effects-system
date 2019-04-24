import { readdirSync } from 'fs';
import { resolve } from 'path';
import { complement as not, test, unnest, replace, pipe, filter, map, unary, values, has } from 'ramda';
import { Message, MsgCtor } from './message';

const ConfTag = Symbol.for('@effects/config');

export function AutoConfig(target) {
  target[ConfTag] = true;
  return target;
}

export const configured = filter(ctor => ctor[ConfTag]);

const listing = (dir: string): string[] => (
  readdirSync(dir)
    .filter(not(test(/^index/)))
    .map(replace(/\.\w+/, ''))
    .filter(test(/^[\w\d_\-]+$/))
    .map(effect => resolve(`${dir}/${effect}`))
);

export const importAll: (dir: string) => {}[] = pipe(
  listing,
  map(pipe(unary(require), values)),
  unnest
);

export const toMap = (ctors: (MsgCtor<any> & { handler?: typeof Message.handler })[]) => new Map(
  ctors.filter(has('handler')).map(ctor => [ctor, ctor.handler!])
);

/**
 * Load all auto-configured effect modules into a map.
 */
export const autoLoad: (dir: string) => Map<MsgCtor<any>, typeof Message.handler> = pipe(importAll, toMap);
