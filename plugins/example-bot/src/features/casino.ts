import type { PluginClient } from '@nookapp/plugin-sdk-client';

export function registerCasinoFeature(plugin: PluginClient) {
  const feature = plugin.feature('casino', {
    name: 'Casino',
    icon: '🎰',
    description: 'Slot machine, roulette and friends.',
  });

  feature.addCommand({ name: 'spin', description: 'Spin the slot machine' }, (_args, ctx) => {
    plugin.sendChat({
      serverId: ctx.serverId,
      channelId: ctx.channelId,
      content: '🎰 [stub] Spinning… you got three lemons. Better luck next time.',
    });
  });

  feature.addMenu({ id: 'slot', label: 'Slot Machine', icon: '🎰' }, (ctx) => {
    plugin.updatePanel({
      serverId: ctx.serverId,
      featureId: ctx.featureId,
      menuId: ctx.menuId,
      userId: ctx.userId,
      children: [
        { type: 'text', variant: 'heading', content: 'Slot Machine' },
        {
          type: 'text',
          variant: 'muted',
          content: '🚧 Not implemented yet — wire your game logic here.',
        },
        { type: 'button', actionId: 'pull', label: 'Pull the lever', style: 'primary' },
      ],
    });
  });

  feature.addMenu({ id: 'roulette', label: 'Roulette', icon: '🎡' }, (ctx) => {
    plugin.updatePanel({
      serverId: ctx.serverId,
      featureId: ctx.featureId,
      menuId: ctx.menuId,
      userId: ctx.userId,
      children: [
        { type: 'text', variant: 'heading', content: 'Roulette' },
        { type: 'text', variant: 'muted', content: '🚧 Stub — pick a number and the wheel.' },
      ],
    });
  });

  feature.onInteraction((event) => {
    if (event.actionId === 'pull') {
      plugin.sendChat({
        serverId: event.serverId,
        channelId: event.channelId ?? '',
        content: '🎰 [stub] The lever rumbles but nothing happens. (Not implemented.)',
      });
    }
  });
}
