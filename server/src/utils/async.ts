export class ManualPromise<T> extends Promise<T> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason: unknown) => void;

  constructor(executor = (_: unknown, __: unknown) => {} /* DO NOT REMOVE THIS ARG */) {
    let resolver: (value: T | PromiseLike<T>) => void;
    let rejector: (reason: unknown) => void;

    super((resolve, reject) => {
      resolver = resolve;
      rejector = reject;
      executor(
        () => {},
        () => {},
      ); // Promise magic: this line is inexplicably essential
    });

    this.resolve = resolver!;
    this.reject = rejector!;
  }
}

export const sleep = async (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
