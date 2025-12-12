# ...existing content...

## 🧪 Testing

PairFX heeft **complete unit test coverage** met 174 tests die alle functionaliteit valideren.

### Quick Start

```powershell
# Installeer dependencies
npm install

# Run alle tests
npm test

# Run met coverage rapport
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Suite Overview

- **174 tests** verdeeld over 6 test files
- **80%+ code coverage** target
- **Unit tests** voor alle models en services
- **Integration tests** voor complete workflows
- **Edge case tests** voor foutcondities
- **Performance tests** voor schaalbaarheid

### Test Categories

| Category | Tests | Files |
|----------|-------|-------|
| Models | 81 | Player, Match, Tournament |
| Services | 78 | PairingService, StorageService |
| Integration | 15 | Complete workflows |

### What's Tested

✅ **Core Features**
- Tournament creation & management
- Player CRUD operations
- Automatic pairing algorithm
- Manual pairing override
- Result entry & score calculation
- Color balancing (white/black)
- JSON export/import
- CSV player import
- HTML standings export
- localStorage persistence

✅ **Pairing Algorithm**
- Constraint X (recent opponent avoidance)
- Constraint Y (point difference limit)
- Soft constraint (class avoidance)
- Fallback logic
- Color preference calculation

✅ **Edge Cases**
- Empty tournaments
- Single player
- Odd number of players
- All players absent
- Invalid data handling
- Large datasets (50+ players)

### Documentation

- **[TESTING.md](TESTING.md)** - Complete testing guide
- **[tests/README.md](tests/README.md)** - Test suite details
- **Coverage Report** - Run `npm run test:coverage` and open `coverage/lcov-report/index.html`

### Example Test Run

```powershell
npm test
```

**Expected output:**
```
PASS tests/models/Player.test.js
PASS tests/models/Match.test.js
PASS tests/models/Tournament.test.js
PASS tests/services/PairingService.test.js
PASS tests/services/StorageService.test.js
PASS tests/integration.test.js

Test Suites: 6 passed, 6 total
Tests:       174 passed, 174 total
Time:        3-5s
```

