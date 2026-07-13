// Vitest global setup.

// Load .env files (DATABASE_URL, PAYLOAD_SECRET) for integration tests.
import 'dotenv/config'

// Register @testing-library/jest-dom matchers (toBeInTheDocument, toHaveTextContent, ...)
// for component/unit tests.
import '@testing-library/jest-dom/vitest'
