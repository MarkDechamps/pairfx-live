# 🧪 PairFX Testing Guide

## Quick Start

### 1. Installeer Dependencies

```powershell
npm install
```

Dit installeert:
- `jest` - Test framework
- `jest-environment-jsdom` - DOM emulatie voor localStorage tests

### 2. Run All Tests

```powershell
npm test
```

**Verwachte output:**
```
PASS tests/models/Player.test.js
PASS tests/models/Match.test.js
PASS tests/models/Tournament.test.js
PASS tests/services/PairingService.test.js
PASS tests/services/StorageService.test.js
PASS tests/integration.test.js

Test Suites: 6 passed, 6 total
Tests:       174 passed, 174 total
Time:        3.5s
```

### 3. Run Tests with Coverage

```powershell
npm run test:coverage
```

Dit genereert een coverage rapport in `coverage/` directory.

**Coverage targets:**
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

## 📊 Test Breakdown

### Model Tests (81 tests)

#### Player Model (15 tests)
```powershell
npx jest tests/models/Player.test.js
```
- Constructor validatie
- Full name generation
- JSON serialization
- State management

#### Match Model (23 tests)
```powershell
npx jest tests/models/Match.test.js
```
- Match lifecycle
- Result validation
- Score calculation
- Timestamp tracking

#### Tournament Model (43 tests)
```powershell
npx jest tests/models/Tournament.test.js
```
- Player management
- Match management
- Score calculation
- Color preference
- Round tracking
- Serialization

### Service Tests (78 tests)

#### PairingService (47 tests)
```powershell
npx jest tests/services/PairingService.test.js
```
- Constraint X (recent opponent)
- Constraint Y (point difference)
- Class constraint (soft)
- Available players filtering
- Best opponent algorithm
- Color determination

#### StorageService (31 tests)
```powershell
npx jest tests/services/StorageService.test.js
```
- localStorage CRUD
- Tournament list management
- JSON export/import
- CSV parsing
- HTML export

### Integration Tests (15 tests)

```powershell
npx jest tests/integration.test.js
```
- Complete tournament workflow
- Multi-round scenarios
- Edge cases
- Performance tests

## 🎯 Specific Test Scenarios

### Run Tests by Pattern

```powershell
# Alle constraint tests
npx jest --testNamePattern="constraint"

# Alle color tests
npx jest --testNamePattern="color"

# Alle export tests
npx jest --testNamePattern="export"
```

### Run Single Test File

```powershell
npx jest tests/models/Player.test.js
```

### Run in Watch Mode

```powershell
npm run test:watch
```

Dit herstart tests automatisch bij file wijzigingen.

## 🐛 Debugging

### Verbose Output

```powershell
npm test -- --verbose
```

### Run Specific Test

```powershell
npx jest --testNamePattern="should create player with required fields"
```

### Show Only Failed Tests

```powershell
npm test -- --onlyFailures
```

## 📈 Coverage Rapport

### Generate HTML Coverage Report

```powershell
npm run test:coverage
```

Open `coverage/lcov-report/index.html` in browser voor visueel rapport.

### Coverage Summary

```powershell
npm test -- --coverage --coverageReporters=text
```

Dit toont coverage direct in terminal.

## ✅ Test Checklist

Voordat je commit:

- [ ] Alle tests slagen (`npm test`)
- [ ] Coverage > 80% (`npm run test:coverage`)
- [ ] Geen console errors
- [ ] Nieuwe features hebben tests
- [ ] Edge cases zijn getest

## 🔧 Troubleshooting

### Jest kan niet gevonden worden

```powershell
npm install
```

### Tests falen met module errors

Controleer dat `jest.config.js` correct is:
```javascript
testEnvironment: 'jsdom'
```

### localStorage errors

Check `tests/setup.js` - localStorage mock moet geladen zijn.

### Coverage te laag

Run met details:
```powershell
npm run test:coverage -- --verbose
```

Zie welke files/lines niet covered zijn.

## 📝 Writing New Tests

### Template voor Model Test

```javascript
describe('MyModel', () => {
  describe('Constructor', () => {
    test('should create instance with required fields', () => {
      const instance = new MyModel(1, 'value');
      expect(instance.id).toBe(1);
    });
  });

  describe('methodName', () => {
    test('should do expected behavior', () => {
      // Arrange
      const instance = new MyModel(1, 'value');
      
      // Act
      const result = instance.methodName();
      
      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Template voor Service Test

```javascript
describe('MyService', () => {
  let service;
  
  beforeEach(() => {
    service = new MyService();
    localStorage.clear();
  });

  test('should perform service action', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = service.doSomething(input);
    
    // Assert
    expect(result).toBeDefined();
  });
});
```

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## 📚 Test Categories

### Unit Tests ✅
- Testen individuele functies/methoden
- Geen dependencies tussen tests
- Snel (< 1ms per test)

### Integration Tests ✅
- Testen complete workflows
- Meerdere componenten samen
- Langzamer (5-10ms per test)

### Edge Case Tests ✅
- Lege inputs
- Ongeldige data
- Boundary conditions
- Error scenarios

### Performance Tests ✅
- Grote datasets (50+ items)
- Vele operaties (20+ rounds)
- Memory/storage limits

## 🎓 Best Practices

1. **Descriptive Names**
   - ✅ `should calculate score correctly for mixed results`
   - ❌ `test1`

2. **AAA Pattern**
   ```javascript
   // Arrange
   const tournament = new Tournament(1, 'Test');
   
   // Act
   const score = tournament.calculateScore(playerId);
   
   // Assert
   expect(score).toBe(3);
   ```

3. **One Assertion Per Concept**
   - Test één ding per test
   - Meerdere expects OK als ze hetzelfde concept testen

4. **Clear Failures**
   ```javascript
   expect(result).toBe(expected); // ✅ Clear failure message
   expect(result === expected).toBe(true); // ❌ Unclear
   ```

5. **Independent Tests**
   - Tests mogen elkaar niet beïnvloeden
   - Gebruik `beforeEach` voor setup
   - Gebruik `afterEach` voor cleanup

## 🔍 Test Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| Models | 90%+ | ✅ |
| Services | 85%+ | ✅ |
| Integration | 75%+ | ✅ |
| Overall | 80%+ | ✅ |

## 📞 Support

Bij problemen:
1. Check `tests/README.md` voor details
2. Run `npm test -- --verbose` voor meer info
3. Check Jest docs: https://jestjs.io/

---

**Happy Testing! 🎉**

Alle 174 tests dekken de complete PairFX functionaliteit af.

