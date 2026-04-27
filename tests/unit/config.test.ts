import { describe as test, it, expect } from 'vitest';
import config from '../../server/src/config';

test('plugin config', () => {
  it('default values match the spec', () => {
    expect(config.default.maxRows).toBe(50_000);
    expect(config.default.pageSize).toBe(500);
    expect(config.default.flattenDepth).toBe(3);
    expect(config.default.relationDisplayField).toBe('id');
    expect(config.default.excludeAttributes).toEqual(['password', 'resetPasswordToken']);
    expect(config.default.filenameTemplate).toBe('{collection}-{date}.xlsx');
    expect(config.default.sanitizeFormulas).toBe(true);
  });

  it('validator throws when maxRows is non-integer', () => {
    expect(() => config.validator({ maxRows: 'lots' as any })).toThrow();
  });

  it('validator throws when pageSize is < 1', () => {
    expect(() => config.validator({ pageSize: 0 })).toThrow();
  });

  it('validator clamps pageSize to maxRows with a warning (no throw)', () => {
    // The validator mutates the input rather than throwing for this case.
    const cfg = { maxRows: 100, pageSize: 500 };
    config.validator(cfg);
    expect(cfg.pageSize).toBe(100);
  });

  it('validator throws when flattenDepth is out of bounds', () => {
    expect(() => config.validator({ flattenDepth: 0 })).toThrow();
    expect(() => config.validator({ flattenDepth: 11 })).toThrow();
  });

  it('validator throws when relationDisplayField is not a string', () => {
    expect(() => config.validator({ relationDisplayField: 42 as any })).toThrow();
  });

  it('validator throws when excludeAttributes is not an array', () => {
    expect(() => config.validator({ excludeAttributes: 'password' as any })).toThrow();
  });

  it('validator throws when filenameTemplate is not a string', () => {
    expect(() => config.validator({ filenameTemplate: 123 as any })).toThrow();
  });

  it('validator throws when sanitizeFormulas is not a boolean', () => {
    expect(() => config.validator({ sanitizeFormulas: 'true' as any })).toThrow();
  });
});
