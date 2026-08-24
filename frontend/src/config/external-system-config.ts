export interface ExternalSystemOAuthConfig {
  authorizeUrl?: string;
  clientId?: string;
  redirectUri?: string;
  scope?: string;
}

export interface ExternalSystemRuntimeConfig {
  url?: string;
  oauth?: ExternalSystemOAuthConfig;
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
  return runtimeExternalSystems[key]?.url?.trim() || fallback;
}

export function getExternalSystemOAuthConfig(
  key: string,
  fallback: ExternalSystemOAuthConfig,
) {
  return {
    ...fallback,
    ...runtimeExternalSystems[key]?.oauth,
  };
}
