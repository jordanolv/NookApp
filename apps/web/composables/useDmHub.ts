export function useDmHub() {
  const open = useState('dmHub.open', () => false);
  const activeId = useState<string | null>('dmHub.activeId', () => null);
  const composing = useState('dmHub.composing', () => false);

  function openHub() {
    open.value = true;
  }
  function close() {
    open.value = false;
  }
  function toggle() {
    open.value = !open.value;
  }
  function openConversation(id: string) {
    activeId.value = id;
    composing.value = false;
    open.value = true;
  }
  function startComposing() {
    composing.value = true;
    open.value = true;
  }

  return { open, activeId, composing, openHub, close, toggle, openConversation, startComposing };
}
