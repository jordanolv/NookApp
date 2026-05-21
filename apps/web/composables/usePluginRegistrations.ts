import type { CreatePluginRegistrationInput, PluginCapabilities } from '@nookapp/protocol';

export interface PluginRegistrationPublic {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  apiKeyPrefix: string;
  status: 'active' | 'disabled';
  capabilities: PluginCapabilities | null;
  createdAt: string;
  lastConnectedAt: string | null;
  connected: boolean;
}

export interface CreatePluginRegistrationResult {
  registration: Omit<PluginRegistrationPublic, 'connected'>;
  apiKey: string;
}

export function usePluginRegistrations() {
  const api = useApi();

  async function listMine(): Promise<PluginRegistrationPublic[]> {
    return api.get<PluginRegistrationPublic[]>('/plugin-registrations');
  }

  async function create(
    input: CreatePluginRegistrationInput,
  ): Promise<CreatePluginRegistrationResult> {
    return api.post<CreatePluginRegistrationResult>(
      '/plugin-registrations',
      input as unknown as Record<string, unknown>,
    );
  }

  return { listMine, create };
}
