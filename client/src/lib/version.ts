/**
 * Version info - injected at build time from package.json
 * Single source of truth: package.json "version" field
 */
export const APP_VERSION = __APP_VERSION__;

// Type declaration for Vite's define
declare global {
  const __APP_VERSION__: string;
}


