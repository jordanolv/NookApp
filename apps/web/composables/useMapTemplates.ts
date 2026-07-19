import { getMapTemplate, isEmptyTemplate } from '~/components/world/scene/map-templates';

export function useMapTemplates() {
  const api = useApi();

  // Seed a freshly-created server's map from a template via REST.
  // The empty template is a no-op: the server falls back to the default map on first load.
  async function seedServerMap(serverId: string, templateId: string): Promise<void> {
    if (isEmptyTemplate(templateId)) return;
    const tpl = getMapTemplate(templateId);
    if (!tpl) return;
    await api.put(`/servers/${serverId}/map`, { data: tpl.build() });
  }

  return { seedServerMap };
}
