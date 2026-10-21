// Vitest global setup.

// Load .env files (DATABASE_URL, PAYLOAD_SECRET) for integration tests.
import 'dotenv/config'

// Blank, never absent: a local `.env` must not route an int test to a real Bigin or
// past a siteverify stub. Tests that need these stub them per test.
for (const name of [
  'BIGIN_CLIENT_ID',
  'BIGIN_CLIENT_SECRET',
  'BIGIN_REFRESH_TOKEN',
  'BIGIN_ACCOUNTS_URL',
  'BIGIN_API_DOMAIN',
  'RECAPTCHA_SITEVERIFY_URL',
])
  process.env[name] = ''

// Register @testing-library/jest-dom matchers (toBeInTheDocument, toHaveTextContent, ...)
// for component/unit tests.
import '@testing-library/jest-dom/vitest'
