import { useEffect, useState } from 'react';

import { EventEmitter } from './utils/EventEmitter';
import { type ChannelId } from '../../libs/api/entities';

type StringTransformer<T, Default extends T | undefined = undefined> = {
  from: (value: string) => T;
  to: (value: T) => string;
  defaultValue: Default;
};

const identityStringTransformer: StringTransformer<any, any> = { from: (v) => v, to: (v) => v, defaultValue: undefined };

abstract class StorageItem<T = string, Default extends T | undefined = undefined> extends EventEmitter<{ change: T | Default }> {
  protected abstract storage: Storage;

  constructor(
    private readonly key: string,
    private readonly transformer: StringTransformer<T, Default> = identityStringTransformer,
  ) {
    super();
  }

  get(): T | Default {
    const value = this.storage.getItem(this.key);

    return value !== null ? this.transformer.from(value) : this.transformer.defaultValue;
  }

  set(value: T): void {
    this.storage.setItem(this.key, this.transformer.to(value));
    this.emit('change', value);
  }

  remove(): void {
    this.storage.removeItem(this.key);
    this.emit('change', this.transformer.defaultValue);
  }
}

class LocalStorageItem<T = string, Default extends T | undefined = undefined> extends StorageItem<T, Default> {
  protected storage = localStorage;
}

class SessionStorageItem<T = string, Default extends T | undefined = undefined> extends StorageItem<T, Default> {
  protected storage = sessionStorage;
}

export const useStorageItemState = <T, Default extends T | undefined>(item: StorageItem<T, Default>): [T | Default, (value: T | undefined) => void] => {
  const [value, setValue] = useState(() => item.get());
  useEffect(() => item.on('change', setValue), [item]);

  return [value, (v) => (v === undefined ? item.remove() : item.set(v))];
};

const boolTransformer: StringTransformer<boolean, boolean> = {
  from: (v) => v === 'true',
  to: (v) => (v ? 'true' : 'false'),
  defaultValue: false,
};

export const activeChannelStorage = new SessionStorageItem<ChannelId | undefined>('active_channel_id');

export const tokenStorage = new LocalStorageItem('auth_token');
export const micEnabledStorage = new LocalStorageItem('mic_enabled', boolTransformer);
export const micDeviceStorage = new LocalStorageItem('mic_device_id');
export const cameraDeviceStorage = new LocalStorageItem('camera_device_id');
export const deafEnabledStorage = new LocalStorageItem('deaf_enabled', boolTransformer);
export const speakerDeviceStorage = new LocalStorageItem('speaker_device_id');
export const noiseCancelStorage = new LocalStorageItem('noise_cancel', { ...boolTransformer, defaultValue: true });
