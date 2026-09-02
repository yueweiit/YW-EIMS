export interface ExternalSystemRuntimeConfig {
  url?: string;
}

interface RuntimeConfigFile {
  externalSystems?: Record<string, ExternalSystemRuntimeConfig>;
}

let runtimeExternalSystems: Record<string, ExternalSystemRuntimeConfig> = {};

export async function loadExternalSystemConfig() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}config/external-systems.json`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const config = (await response.json()) as RuntimeConfigFile;
    runtimeExternalSystems = config.externalSystems || {};
  } catch (error) {
    // Runtime config is optional during local development. Vite env values
    // remain available as a fallback when the JSON file is not present.
    console.warn('[external-system-config] failed to load runtime config', error);
  }
}

export function getExternalSystemUrl(key: string, fallback = '') {
  const value = runtimeExternalSystems[key]?.url?.trim();
  if (!value) return fallback;

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}
