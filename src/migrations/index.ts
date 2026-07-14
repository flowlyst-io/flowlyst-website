import * as migration_20260713_123011_initial from './20260713_123011_initial';
import * as migration_20260713_151923_cms_content_model from './20260713_151923_cms_content_model';
import * as migration_20260713_160021_add_import_export_collections from './20260713_160021_add_import_export_collections';
import * as migration_20260714_040417_speaking_requests from './20260714_040417_speaking_requests';
import * as migration_20260714_104309_lead_capture_foundation from './20260714_104309_lead_capture_foundation';
import * as migration_20260714_142633_testimonials_keynotes_category from './20260714_142633_testimonials_keynotes_category';
import * as migration_20260714_162601_content_model_touchup from './20260714_162601_content_model_touchup';

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
    name: '20260714_040417_speaking_requests',
  },
  {
    up: migration_20260714_104309_lead_capture_foundation.up,
    down: migration_20260714_104309_lead_capture_foundation.down,
    name: '20260714_104309_lead_capture_foundation',
  },
  {
    up: migration_20260714_142633_testimonials_keynotes_category.up,
    down: migration_20260714_142633_testimonials_keynotes_category.down,
    name: '20260714_142633_testimonials_keynotes_category',
  },
  {
    up: migration_20260714_162601_content_model_touchup.up,
    down: migration_20260714_162601_content_model_touchup.down,
    name: '20260714_162601_content_model_touchup'
  },
];
