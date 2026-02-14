const brandSymbol: unique symbol = Symbol();

export type Branded<Entity, BrandSymbol> = Entity & { [brandSymbol]: BrandSymbol };

export type UnionToIntersection<T> = (T extends unknown ? (_: T) => void : never) extends (_: infer R) => void ? R : never;

export type AssertIsNever<T extends never> = T;

export type Type<T> = new (...args: any) => T;

export type AnyAbstractClass = abstract new (...args: unknown[]) => object;
