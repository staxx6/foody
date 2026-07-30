import { InjectionToken } from '@angular/core';
import { DataAccessConfig } from './data-access.model';

export const DATA_ACCESS_CONFIG = new InjectionToken<DataAccessConfig>(
  'DATA_ACCESS_CONFIG',
);
