import type { CategoryPublic, CreateCategoryInput, UpdateCategoryInput } from '@nookapp/protocol';
import { useServersStore } from '~/stores/servers';

export function useCategories() {
  const api = useApi();
  const store = useServersStore();

  async function fetchCategories(serverId: string) {
    const categories = await api.get<CategoryPublic[]>(`/servers/${serverId}/categories`);
    store.setCategories(categories);
    return categories;
  }

  async function createCategory(
    serverId: string,
    input: CreateCategoryInput,
  ): Promise<CategoryPublic> {
    const category = await api.post<CategoryPublic>(
      `/servers/${serverId}/categories`,
      input as Record<string, unknown>,
    );
    store.upsertCategory(category);
    return category;
  }

  async function updateCategory(
    serverId: string,
    categoryId: string,
    input: UpdateCategoryInput,
  ): Promise<CategoryPublic> {
    const updated = await api.patch<CategoryPublic>(
      `/servers/${serverId}/categories/${categoryId}`,
      input as Record<string, unknown>,
    );
    store.upsertCategory(updated);
    return updated;
  }

  async function deleteCategory(serverId: string, categoryId: string): Promise<void> {
    await api.del(`/servers/${serverId}/categories/${categoryId}`);
    store.removeCategory(categoryId);
  }

  async function setCategoryIcon(
    serverId: string,
    categoryId: string,
    file: File,
  ): Promise<CategoryPublic> {
    const form = new FormData();
    form.append('file', file);
    const updated = await api.postForm<CategoryPublic>(
      `/servers/${serverId}/categories/${categoryId}/icon`,
      form,
    );
    store.upsertCategory(updated);
    return updated;
  }

  async function setCategoryBanner(
    serverId: string,
    categoryId: string,
    file: File,
  ): Promise<CategoryPublic> {
    const form = new FormData();
    form.append('file', file);
    const updated = await api.postForm<CategoryPublic>(
      `/servers/${serverId}/categories/${categoryId}/banner`,
      form,
    );
    store.upsertCategory(updated);
    return updated;
  }

  return {
    store,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    setCategoryIcon,
    setCategoryBanner,
  };
}
