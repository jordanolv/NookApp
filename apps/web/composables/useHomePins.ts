import type { ChannelPublic, UiLayoutEntry } from '@nookapp/protocol';
import type { ComputedRef, Ref } from 'vue';

export type HomePinKind = 'channel' | 'game';

export interface HomePin {
  key: string;
  kind: HomePinKind;
  channelId: string;
  parentId: string | null;
  parentName: string | null;
  title: string;
  createdAt: number;
}

type ServerIdSource = string | Ref<string> | ComputedRef<string>;

function resolveServerId(source: ServerIdSource): string {
  return typeof source === 'string' ? source : source.value;
}

function prefixFor(serverId: string) {
  return `home-pin:${serverId}:`;
}

function keyFor(serverId: string, kind: HomePinKind, channelId: string) {
  return `${prefixFor(serverId)}${kind}:${channelId}`;
}

function parsePin(key: string, entry: UiLayoutEntry): HomePin | null {
  const kind = entry.kind === 'game' || entry.kind === 'channel' ? entry.kind : null;
  if (!kind || typeof entry.channelId !== 'string' || typeof entry.title !== 'string') return null;

  return {
    key,
    kind,
    channelId: entry.channelId,
    parentId: typeof entry.parentId === 'string' ? entry.parentId : null,
    parentName: typeof entry.parentName === 'string' ? entry.parentName : null,
    title: entry.title,
    createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : 0,
  };
}

export function useHomePins(serverId: ServerIdSource) {
  const layout = useUiLayout();

  if (import.meta.client) void layout.ensureLoaded();

  const pins = computed(() =>
    layout
      .entriesByPrefix(prefixFor(resolveServerId(serverId)))
      .map(([key, entry]) => parsePin(key, entry))
      .filter((pin): pin is HomePin => pin !== null)
      .sort((a, b) => a.createdAt - b.createdAt),
  );

  function isPinned(channelId: string, kind: HomePinKind = 'channel'): boolean {
    return layout.get(keyFor(resolveServerId(serverId), kind, channelId)) !== null;
  }

  function pinChannel(
    channel: Pick<ChannelPublic, 'id' | 'name' | 'parentId'>,
    kind: HomePinKind = 'channel',
    parentName: string | null = null,
  ): void {
    layout.set(keyFor(resolveServerId(serverId), kind, channel.id), {
      kind,
      channelId: channel.id,
      parentId: channel.parentId ?? null,
      parentName,
      title: channel.name,
      createdAt: Date.now(),
    });
  }

  function unpin(channelId: string, kind: HomePinKind = 'channel'): void {
    layout.remove(keyFor(resolveServerId(serverId), kind, channelId));
  }

  function toggleChannel(
    channel: Pick<ChannelPublic, 'id' | 'name' | 'parentId'>,
    kind: HomePinKind = 'channel',
    parentName: string | null = null,
  ): void {
    if (isPinned(channel.id, kind)) unpin(channel.id, kind);
    else pinChannel(channel, kind, parentName);
  }

  return { ensureLoaded: layout.ensureLoaded, pins, isPinned, pinChannel, unpin, toggleChannel };
}
