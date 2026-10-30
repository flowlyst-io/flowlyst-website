import * as migration_20260713_123011_initial from './20260713_123011_initial';
import * as migration_20260713_151923_cms_content_model from './20260713_151923_cms_content_model';
import * as migration_20260713_160021_add_import_export_collections from './20260713_160021_add_import_export_collections';
import * as migration_20260714_040417_speaking_requests from './20260714_040417_speaking_requests';
import * as migration_20260714_104309_lead_capture_foundation from './20260714_104309_lead_capture_foundation';
import * as migration_20260714_142633_testimonials_keynotes_category from './20260714_142633_testimonials_keynotes_category';
import * as migration_20260714_162601_content_model_touchup from './20260714_162601_content_model_touchup';
import * as migration_20261012_023721_payload_3_90_upgrade from './20261012_023721_payload_3_90_upgrade';
import * as migration_20261014_003843_contact_reason_assessment_pricing from './20261014_003843_contact_reason_assessment_pricing';
import * as migration_20261017_000039_organizations from './20261017_000039_organizations';
import * as migration_20261017_184755_site_settings_founder_linkedin from './20261017_184755_site_settings_founder_linkedin';
import * as migration_20261021_024401_bigin_crm_sync from './20261021_024401_bigin_crm_sync';
import * as migration_20261030_212514_links_and_cards from './20261030_212514_links_and_cards';

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
    name: '20260714_162601_content_model_touchup',
  },
  {
    up: migration_20261012_023721_payload_3_90_upgrade.up,
    down: migration_20261012_023721_payload_3_90_upgrade.down,
    name: '20261012_023721_payload_3_90_upgrade',
  },
  {
    up: migration_20261014_003843_contact_reason_assessment_pricing.up,
    down: migration_20261014_003843_contact_reason_assessment_pricing.down,
    name: '20261014_003843_contact_reason_assessment_pricing',
  },
  {
    up: migration_20261017_000039_organizations.up,
    down: migration_20261017_000039_organizations.down,
    name: '20261017_000039_organizations',
  },
  {
    up: migration_20261017_184755_site_settings_founder_linkedin.up,
    down: migration_20261017_184755_site_settings_founder_linkedin.down,
    name: '20261017_184755_site_settings_founder_linkedin',
  },
  {
    up: migration_20261021_024401_bigin_crm_sync.up,
    down: migration_20261021_024401_bigin_crm_sync.down,
    name: '20261021_024401_bigin_crm_sync',
  },
  {
    up: migration_20261030_212514_links_and_cards.up,
    down: migration_20261030_212514_links_and_cards.down,
    name: '20261030_212514_links_and_cards'
  },
];
