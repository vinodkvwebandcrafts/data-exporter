// server/src/config/index.ts
export type PluginConfig = {
  maxRows: number;
  pageSize: number;
  flattenDepth: number;
  relationDisplayField: string;
  excludeAttributes: string[];
  filenameTemplate: string;
  sanitizeFormulas: boolean;
};

const defaults: PluginConfig = {
  maxRows: 50_000,
  pageSize: 500,
  flattenDepth: 3,
  relationDisplayField: 'id',
  excludeAttributes: ['password', 'resetPasswordToken'],
  filenameTemplate: '{collection}-{date}.xlsx',
  sanitizeFormulas: true,
};

function isPosInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1;
}

export default {
  default: defaults,
  validator(config: Partial<PluginConfig>) {
    if (config.maxRows !== undefined && !isPosInt(config.maxRows)) {
      throw new Error('data-exporter: maxRows must be a positive integer');
    }
    if (config.pageSize !== undefined && !isPosInt(config.pageSize)) {
      throw new Error('data-exporter: pageSize must be a positive integer');
    }
    if (config.flattenDepth !== undefined) {
      if (!isPosInt(config.flattenDepth) || config.flattenDepth > 10) {
        throw new Error('data-exporter: flattenDepth must be an integer in [1, 10]');
      }
    }
    if (config.relationDisplayField !== undefined && typeof config.relationDisplayField !== 'string') {
      throw new Error('data-exporter: relationDisplayField must be a string');
    }
    if (config.excludeAttributes !== undefined && !Array.isArray(config.excludeAttributes)) {
      throw new Error('data-exporter: excludeAttributes must be an array');
    }
    if (config.filenameTemplate !== undefined && typeof config.filenameTemplate !== 'string') {
      throw new Error('data-exporter: filenameTemplate must be a string');
    }
    if (config.sanitizeFormulas !== undefined && typeof config.sanitizeFormulas !== 'boolean') {
      throw new Error('data-exporter: sanitizeFormulas must be a boolean');
    }

    // pageSize clamp: pageSize > maxRows is meaningless; clamp down
    const max = config.maxRows ?? defaults.maxRows;
    if (config.pageSize !== undefined && config.pageSize > max) {
      // eslint-disable-next-line no-console
      console.warn(`data-exporter: pageSize ${config.pageSize} > maxRows ${max}; clamping to ${max}`);
      config.pageSize = max;
    }
  },
};
