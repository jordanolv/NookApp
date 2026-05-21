import type { PluginClient } from '@nookapp/plugin-sdk-client';

export function registerCardsFeature(plugin: PluginClient) {
  const feature = plugin.feature('cards', {
    name: 'Card Collector',
    icon: '🃏',
    description: 'Pull cards, trade with other members.',
  });

  feature.addCommand({ name: 'pull', description: 'Pull a random card' }, (_args, ctx) => {
    plugin.sendChat({
      serverId: ctx.serverId,
      channelId: ctx.channelId,
      content: '🃏 [stub] You pulled… the Joker. (Stub implementation.)',
    });
  });

  feature.addCommand(
    { name: 'inventory', description: 'Show your card collection' },
    (_args, ctx) => {
      plugin.sendChat({
        serverId: ctx.serverId,
        channelId: ctx.channelId,
        content: `🃏 [stub] ${ctx.userName}, your collection is empty.`,
      });
    },
  );

  feature.addMenu({ id: 'collection', label: 'My Collection', icon: '📚' }, (ctx) => {
    plugin.updatePanel({
      serverId: ctx.serverId,
      featureId: ctx.featureId,
      menuId: ctx.menuId,
      userId: ctx.userId,
      children: [
        { type: 'text', variant: 'heading', content: 'My Collection' },
        {
          type: 'text',
          variant: 'muted',
          content: '🚧 No cards yet. Build the inventory UI here.',
        },
      ],
    });
  });

  feature.addMenu({ id: 'trade', label: 'Trading', icon: '🤝' }, (ctx) => {
    plugin.updatePanel({
      serverId: ctx.serverId,
      featureId: ctx.featureId,
      menuId: ctx.menuId,
      userId: ctx.userId,
      children: [
        { type: 'text', variant: 'heading', content: 'Trading post' },
        {
          type: 'text',
          variant: 'muted',
          content: '🚧 Stub — list offers and trade with members.',
        },
      ],
    });
  });
}
