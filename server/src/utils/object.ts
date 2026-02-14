export const getMethods = (cls: Function): string[] => Object.getOwnPropertyNames(cls.prototype).filter((method) => method !== 'constructor');
