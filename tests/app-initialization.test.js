/**
 * App Smoke Tests
 * These tests catch syntax errors and ensure app.js is loadable
 * They don't test full functionality but catch breaking changes
 */

describe('App.js Smoke Tests', () => {
  beforeAll(() => {
    // Mock browser globals that app.js needs
    global.document = {
      addEventListener: jest.fn(),
      getElementById: jest.fn(() => ({ style: { display: 'none' } })),
      createElement: jest.fn(() => ({
        setAttribute: jest.fn(),
        click: jest.fn(),
        style: {}
      })),
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
      }
    };

    global.window = {
      addEventListener: jest.fn()
    };

    global.alert = jest.fn();
    global.Blob = jest.fn();
    global.URL = { createObjectURL: jest.fn(), revokeObjectURL: jest.fn() };

    // Mock the required classes so app.js doesn't fail
    global.StorageService = jest.fn();
    global.PairingService = jest.fn();
    global.TournamentManager = jest.fn(() => ({ showTournamentSelection: jest.fn() }));
    global.PlayerManager = jest.fn();
    global.PairingManager = jest.fn();
  });

  test('app.js should load without syntax errors', () => {
    // ⭐ THIS IS THE KEY TEST ⭐
    // If app.js has syntax errors (like unclosed comments), this will FAIL
    expect(() => {
      require('../js/app.js');
    }).not.toThrow();
  });

  test('app.js should export app object', () => {
    const appModule = require('../js/app.js');
    expect(appModule).toBeDefined();
    expect(appModule.app).toBeDefined();
    expect(typeof appModule.app).toBe('object');
  });

  test('app.js should export toggleCsvHelp function', () => {
    const appModule = require('../js/app.js');
    expect(appModule.toggleCsvHelp).toBeDefined();
    expect(typeof appModule.toggleCsvHelp).toBe('function');
  });

  test('app.js should export downloadExampleCSV function', () => {
    const appModule = require('../js/app.js');
    expect(appModule.downloadExampleCSV).toBeDefined();
    expect(typeof appModule.downloadExampleCSV).toBe('function');
  });
});

describe('CSV Helper Functions', () => {
  let toggleCsvHelp;
  let downloadExampleCSV;

  beforeAll(() => {
    // Import functions from app.js
    const appModule = require('../js/app.js');
    toggleCsvHelp = appModule.toggleCsvHelp;
    downloadExampleCSV = appModule.downloadExampleCSV;
  });

  test('toggleCsvHelp function should be defined', () => {
    expect(toggleCsvHelp).toBeDefined();
    expect(typeof toggleCsvHelp).toBe('function');
  });

  test('downloadExampleCSV function should be defined', () => {
    expect(downloadExampleCSV).toBeDefined();
    expect(typeof downloadExampleCSV).toBe('function');
  });

  test('toggleCsvHelp should toggle element display style', () => {
    const mockElement = { style: { display: 'none' } };
    global.document.getElementById = jest.fn(() => mockElement);

    // First call should show
    toggleCsvHelp();
    expect(mockElement.style.display).toBe('block');

    // Second call should hide
    toggleCsvHelp();
    expect(mockElement.style.display).toBe('none');
  });

  // Note: Full DOM manipulation tests for downloadExampleCSV are skipped
  // as they require complex browser environment mocking. The function
  // is tested manually in the browser and covered by the export check above.
});

describe('App Structure Validation', () => {
  let appModule;

  beforeAll(() => {
    appModule = require('../js/app.js');
  });

  test('app.js should export app object', () => {
    expect(appModule.app).toBeDefined();
    expect(typeof appModule.app).toBe('object');
  });

  test('toggleCsvHelp should be exported', () => {
    expect(appModule.toggleCsvHelp).toBeDefined();
    expect(typeof appModule.toggleCsvHelp).toBe('function');
  });

  test('downloadExampleCSV should be exported', () => {
    expect(appModule.downloadExampleCSV).toBeDefined();
    expect(typeof appModule.downloadExampleCSV).toBe('function');
  });
});

