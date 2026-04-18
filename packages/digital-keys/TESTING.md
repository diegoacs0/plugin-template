# Digital Products Plugin - Test Suite

## Overview

The test suite for the Digital Products Plugin is organized into three levels:

1. **Unit Tests** (`src/services/__tests__/*.spec.ts`) — Test individual service methods in isolation
2. **Integration Tests** (`e2e/*.e2e-spec.ts`) — Test the complete workflow end-to-end with a real Vendure server

## Running Tests

### Prerequisites

```bash
cd packages/digital-keys
pnpm install
```

### Run All Tests

```bash
pnpm run e2e
```

### Run Unit Tests Only

```bash
pnpm run test --run "src/services/__tests__"
```

### Run E2E Tests Only

```bash
pnpm run e2e
```

### Watch Mode (Development)

```bash
pnpm run test --watch "src/services/__tests__"
```

### Debug Mode (Extended Timeout)

```bash
E2E_DEBUG=1 pnpm run e2e
```

## Test Structure

### Unit Tests

#### `digital-product.service.spec.ts`
- ✅ Create digital products with validation (name, productVariantId)
- ✅ Normalize and trim input strings
- ✅ Update and delete products
- ✅ Find products by ID or variant
- ✅ Error handling for invalid inputs

**Key Test Cases:**
```typescript
- Create with valid input
- Reject empty names
- Reject missing productVariantId
- Handle optional templates
- Delete with error recovery
```

#### `digital-key.service.spec.ts`
- ✅ Add keys in bulk with normalization
- ✅ Filter empty codes automatically
- ✅ Assign keys to digital orders
- ✅ Revoke keys back to available
- ✅ Count available keys
- ✅ Delete only available keys
- ✅ Sync ProductVariant stock after key inventory changes
- ✅ Error handling for insufficient stock

**Key Test Cases:**
```typescript
- Add multiple keys with whitespace trimming
- Filter out empty/null codes
- Assign keys with quantity validation
- Reject assignment if not enough keys
- Revoke keys and reset status
- Count available per product
```

#### `digital-order.service.spec.ts`
- ✅ Handle FILE delivery (collect download URLs)
- ✅ Handle KEY delivery (assign license keys)
- ✅ Handle SERVICE delivery (generate chat URLs)
- ✅ Multi-product delivery per variant
- ✅ Partial failure handling (some products fail, others succeed)
- ✅ Email notification event emission
- ✅ Failed order tracking with reason
- ✅ Chat provider URL building (url-template, crisp)

**Key Test Cases:**
```typescript
- FILE: Collect MAIN media URLs, warn if none
- KEY: Assign N keys, mark order FAILED if insufficient
- SERVICE: Generate provider-specific chat URLs
- Multi-product: Process all products, allow partial failures
- Email: Emit event with customer + delivery details
- Failures: Log, mark status, record reason
```

#### `digital-variant-stock.service.spec.ts`
- ✅ Syncs digital variant stock using the lowest key inventory among linked digital products
- ✅ Ignores non-digital variants
- ✅ Ignores variants with only non-key delivery products
- ✅ Resolves variant from digital product ID and delegates sync

### End-to-End Tests

#### `digital-products.e2e-spec.ts`

Complete workflow testing with real database:

1. **Product Creation**
   - Create digital products with FILE, KEY, SERVICE delivery types
   - Verify custom fields (isDigital)
   - Test all mutation fields

2. **License Key Management**
   - Add keys in bulk
   - Verify available count
   - Delete available keys
   - Track inventory

3. **Media Management**
   - Add main (private) media files
   - Add preview (public) media
   - Link media to products

4. **Admin Queries**
   - List all digital products
   - Get product by ID with relations
   - Find products by variant
   - List failed orders

5. **Data Validation**
   - Reject empty product names
   - Reject empty key codes
   - Validation at GraphQL level

6. **Full Lifecycle**
   - Create → Update → Delete product
   - Manage inventory
   - Query results

## Test File Organization

```
packages/digital-keys/
├── src/
│   └── services/
│       ├── __tests__/
│       │   ├── digital-product.service.spec.ts
│       │   ├── digital-key.service.spec.ts
│       │   ├── digital-order.service.spec.ts
│       │   └── digital-variant-stock.service.spec.ts
│       ├── digital-product.service.ts
│       ├── digital-key.service.ts
│       └── digital-order.service.ts
└── e2e/
    └── digital-products.e2e-spec.ts
```

## Mocking Strategy

### Unit Tests

- **Services:** Mocked repositories using `vi.fn()`
- **Database:** TypeORM `Repository` mocked methods
- **EventBus:** Mocked with `vi.fn()` to capture events
- **Logger:** Spied to verify logging calls

**Example:**
```typescript
const repository = {
    create: vi.fn((input) => ({ ...input, id: 'dp-1' })),
    save: vi.fn(async (entity) => entity),
    find: vi.fn(async () => []),
};
```

### E2E Tests

- **Real Server:** `createTestEnvironment()` from `@vendure/testing`
- **Real Database:** SQLite in-memory (`testConfig`)
- **Real GraphQL:** Execute actual mutations/queries
- **Admin Client:** Full auth + superadmin access

## Coverage Goals

| Module | Unit | E2E | Coverage |
|--------|------|-----|----------|
| `DigitalProductService` | ✅ 8 tests | ✅ 6 tests | ~95% |
| `DigitalKeyService` | ✅ 7 tests | ✅ 2 tests | ~90% |
| `DigitalOrderService` | ✅ 9 tests | — | ~85% |
| Admin Resolver | — | ✅ 5 tests | ~80% |
| **Total** | **24 tests** | **13 tests** | **~88%** |

## Common Issues & Solutions

### Issue: "Cannot find module" in tests

**Solution:** Ensure `tsconfig.e2e.json` is properly configured:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

### Issue: E2E timeout (15s default)

**Solution:** Use debug mode for breakpoints:
```bash
E2E_DEBUG=1 pnpm run e2e
```

Or increase timeout in `vitest.config.mts`:
```typescript
testTimeout: 30 * 1000, // 30 seconds
```

### Issue: Tests fail with "Connection not initialized"

**Solution:** Ensure `beforeAll` completes with sufficient timeout:
```typescript
beforeAll(async () => {
  // ...
}, 120000); // 2 minutes for initial setup
```

## Adding New Tests

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('NewService', () => {
  let service: NewService;
  let mockDependency: any;

  beforeEach(() => {
    mockDependency = { method: vi.fn() };
    service = new NewService(mockDependency);
  });

  it('should do something', async () => {
    const result = await service.method();
    expect(result).toEqual(expected);
  });
});
```

### E2E Test Template

```typescript
import { createTestEnvironment } from '@vendure/testing';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';

describe('Feature E2E', () => {
  const { server, adminClient } = createTestEnvironment({
    ...testConfig(8002),
    plugins: [/* ... */],
  });

  beforeAll(async () => {
    await server.init({
      productsCsvPath: path.join(__dirname, '../../../utils/e2e/e2e-products-full.csv'),
      initialData,
      customerCount: 2,
    });
    await adminClient.asSuperAdmin();
  }, 120000);

  afterAll(async () => {
    await server.destroy();
  });

  it('should do something', async () => {
    const result = await adminClient.query(/* ... */);
    expect(result).toEqual(expected);
  });
});
```

## Continuous Integration

The test suite runs automatically on:
- Push to `main` branch
- Pull requests
- Pre-commit hook (if configured)

**CI Command:**
```bash
PACKAGE=digital-keys pnpm run e2e
```

## Performance Notes

- **Unit tests:** ~2 seconds
- **E2E tests:** ~30 seconds (includes DB init)
- **Full suite:** ~45 seconds

Cache SQLite databases between runs to improve E2E speed:
```bash
# Keep __sqlite-data__ directory
pnpm run e2e  # Uses cached DB
```

## Debugging

### Run Single Test

```bash
pnpm run test --run "digital-product.service.spec.ts"
```

### Print Debug Info

```typescript
it('test', async () => {
  console.log('Debug:', service.internalState);
  // Tests now show console output
});
```

### Use Debugger

```bash
node --inspect-brk ./node_modules/.bin/vitest --run
# Open chrome://inspect in Chrome DevTools
```

---

For more info, see [Vitest Docs](https://vitest.dev) and [Vendure Testing Guide](https://docs.vendure.io/guides/developer-guide/testing/).
