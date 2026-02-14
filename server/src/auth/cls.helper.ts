import { AsyncLocalStorage } from 'async_hooks';
import type { UserId } from '../../../libs/api/entities';

type ClsStore = {
  userId: UserId;
};

export const cls = new AsyncLocalStorage<ClsStore>();

export const setUserId = (userId: UserId): void => {
  const store = cls.getStore();
  if (!store) {
    throw new Error('CLS store not initialized');
  }
  store.userId = userId;
};

export const getUserId = (): UserId => {
  const store = cls.getStore();
  if (!store) {
    throw new Error('CLS store not initialized');
  }

  return store.userId;
};
