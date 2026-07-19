/**
 * Shared state for the channel being edited inline in the sidebar.
 * When set, the corresponding ChannelCard / VoiceChannelEntry renders its
 * name as an editable input (autofocused) instead of plain text.
 */
export function useChannelEditing() {
  const editingChannelId = useState<string | null>('channel.editing.id', () => null);

  function startEditing(id: string) {
    editingChannelId.value = id;
  }

  function stopEditing() {
    editingChannelId.value = null;
  }

  function isEditing(id: string): boolean {
    return editingChannelId.value === id;
  }

  return {
    editingChannelId,
    startEditing,
    stopEditing,
    isEditing,
  };
}
