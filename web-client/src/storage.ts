type StringTransformer<T, Default extends T | undefined = undefined> = {
  from: (value: string) => T;
  to: (value: T) => string;
  defaultValue: Default;
};

const identityStringTransformer: StringTransformer<any, any> = { from: (v) => v, to: (v) => v, defaultValue: undefined };

const createStorageItem = <T = string, Default extends T | undefined = undefined>(
  key: string,
  { from, to, defaultValue }: StringTransformer<T, Default> = identityStringTransformer,
) => ({
  get: () => {
    const value = localStorage.getItem(key);

    return value !== null ? from(value) : defaultValue;
  },
  set: (value: T) => {
    localStorage.setItem(key, to(value));
  },
  remove: () => {
    localStorage.removeItem(key);
  },
});

const boolTransformer: StringTransformer<boolean, boolean> = {
  from: (v) => v === 'true',
  to: (v) => (v ? 'true' : 'false'),
  defaultValue: false,
};

export const tokenStorage = createStorageItem('auth_token');
export const micEnabledStorage = createStorageItem('mic_enabled', boolTransformer);
export const micDeviceStorage = createStorageItem('mic_device_id');
export const cameraDeviceStorage = createStorageItem('camera_device_id');
export const deafEnabledStorage = createStorageItem('deaf_enabled', boolTransformer);
export const speakerDeviceStorage = createStorageItem('speaker_device_id');
