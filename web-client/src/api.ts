import { dash } from 'radash';
import { tokenStorage } from './storage';
import { keys } from './utils/object';
import { Api } from '../../libs/api';
import { type RpcOptions } from '../../libs/rpc.interface';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const api = new Api();
keys(api).forEach(<ModuleName extends keyof Api>(moduleName: ModuleName) => {
  api[moduleName] = new Proxy(api[moduleName], {
    get(_, methodName: string) {
      return async (payload: object, options?: RpcOptions) => {
        const uri = `/api/${dash(moduleName)}/${dash(methodName)}`;
        const timeout = options?.timeoutMs ?? 30000;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };

          const token = tokenStorage.get();
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(uri, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          if (!response.ok) {
            const body = await response.json().catch(() => null);
            if (typeof body === 'object' && body && 'errors' in body && Array.isArray(body.errors) && body.errors.length > 0) {
              throw new HttpError(response.status, `Error${body.errors.length > 1 ? 's' : ''}:\n${body.errors.join('\n')}`);
            }
            throw new HttpError(response.status, `HTTP ${response.status}`);
          }

          return await response.json();
        } finally {
          clearTimeout(timeoutId);
        }
      };
    },
  });
});
