export const keys = <T extends object>(object: T): `${keyof T & (string | number)}`[] => Object.keys(object) as `${keyof T & (string | number)}`[];
