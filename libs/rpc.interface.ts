import { type AnyAbstractClass } from './types';

export type RpcOptions = { timeoutMs?: number };

type MethodsWithRpcOptions<T> = {
  [Key in keyof T]: T[Key] extends (payload: infer P) => infer R ? (Parameters<T[Key]> extends [] ? () => R : (payload: P, options?: RpcOptions) => R) : never;
};

type RpcInterface<Modules extends Record<string, AnyAbstractClass> = {}> = {
  new (): { [ModuleName in keyof Modules]: MethodsWithRpcOptions<InstanceType<Modules[ModuleName]>> };
} & Modules;

export const createRpcInterface = <Modules extends Record<string, AnyAbstractClass>>(modules: Modules): RpcInterface<Modules> =>
  Object.assign(
    class {
      constructor() {
        Object.assign(this, modules);
      }
    },
    modules,
  ) as RpcInterface<Modules>;
