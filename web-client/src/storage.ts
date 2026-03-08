import { useEffect, useState } from 'react';

import { EventEmitter } from './utils/EventEmitter';

type StringTransformer<T, Default extends T | undefined = undefined> = {
  from: (value: string) => T;
  to: (value: T) => string;
  defaultValue: Default;
};

const identityStringTransformer: StringTransformer<any, any> = { from: (v) => v, to: (v) => v, defaultValue: undefined };

class StorageItem<T = string, Default extends T | undefined = undefined> extends EventEmitter<{ change: T | Default }> {
  constructor(
    private readonly key: string,
    private readonly transformer: StringTransformer<T, Default> = identityStringTransformer,
  ) {
    super();
  }

  get(): T | Default {
    const value = localStorage.getItem(this.key);

    return value !== null ? this.transformer.from(value) : this.transformer.defaultValue;
  }

  set(value: T): void {
    localStorage.setItem(this.key, this.transformer.to(value));
    this.emit('change', value);
  }

  remove(): void {
    localStorage.removeItem(this.key);
    this.emit('change', this.transformer.defaultValue);
  }
}

export const useStorageItemState = <T, Default extends T | undefined>(item: StorageItem<T, Default>): [T | Default, (value: T) => void] => {
  const [value, setValue] = useState(() => item.get());
  useEffect(() => item.on('change', setValue), [item]);

  return [value, (v) => item.set(v)];
};

const boolTransformer: StringTransformer<boolean, boolean> = {
  from: (v) => v === 'true',
  to: (v) => (v ? 'true' : 'false'),
  defaultValue: false,
};

export const tokenStorage = new StorageItem('auth_token');
export const micEnabledStorage = new StorageItem('mic_enabled', boolTransformer);
export const micDeviceStorage = new StorageItem('mic_device_id');
export const cameraDeviceStorage = new StorageItem('camera_device_id');
export const deafEnabledStorage = new StorageItem('deaf_enabled', boolTransformer);
export const speakerDeviceStorage = new StorageItem('speaker_device_id');
export const noiseCancelStorage = new StorageItem('noise_cancel', { ...boolTransformer, defaultValue: true });
