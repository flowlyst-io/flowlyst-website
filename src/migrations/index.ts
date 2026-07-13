import * as migration_20260713_123011_initial from './20260713_123011_initial';

export const migrations = [
  {
    up: migration_20260713_123011_initial.up,
    down: migration_20260713_123011_initial.down,
    name: '20260713_123011_initial'
  },
];
