import * as migration_20260713_123011_initial from './20260713_123011_initial';
import * as migration_20260713_151923_cms_content_model from './20260713_151923_cms_content_model';

export const migrations = [
  {
    up: migration_20260713_123011_initial.up,
    down: migration_20260713_123011_initial.down,
    name: '20260713_123011_initial',
  },
  {
    up: migration_20260713_151923_cms_content_model.up,
    down: migration_20260713_151923_cms_content_model.down,
    name: '20260713_151923_cms_content_model'
  },
];
