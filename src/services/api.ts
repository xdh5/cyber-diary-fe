import * as auth from './auth';
import * as entry from './entry';
import * as chat from './chat';
import * as food from './food';

export const api = {
  ...auth,
  ...entry,
  ...chat,
  ...food,
};

export * from './auth';
export * from './entry';
export * from './chat';
export * from './food';
