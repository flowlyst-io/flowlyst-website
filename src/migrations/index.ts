import * as migration_20260713_123011_initial from './20260713_123011_initial';
import * as migration_20260713_151923_cms_content_model from './20260713_151923_cms_content_model';
import * as migration_20260713_160021_add_import_export_collections from './20260713_160021_add_import_export_collections';
import * as migration_20260714_040417_speaking_requests from './20260714_040417_speaking_requests';

export const migrations = [
  {
    up: migration_20260713_123011_initial.up,
    down: migration_20260713_123011_initial.down,
    name: '20260713_123011_initial',
  },
  {
    up: migration_20260713_151923_cms_content_model.up,
    down: migration_20260713_151923_cms_content_model.down,
    name: '20260713_151923_cms_content_model',
  },
  {
    up: migration_20260713_160021_add_import_export_collections.up,
    down: migration_20260713_160021_add_import_export_collections.down,
    name: '20260713_160021_add_import_export_collections',
  },
  {
    up: migration_20260714_040417_speaking_requests.up,
    down: migration_20260714_040417_speaking_requests.down,
    name: '20260714_040417_speaking_requests'
  },
];
