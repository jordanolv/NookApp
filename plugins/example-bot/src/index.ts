import 'dotenv/config';
import { createPlugin } from '@nookapp/plugin-sdk-client';
import { registerCasinoFeature } from './features/casino';
import { registerCardsFeature } from './features/cards';

const token = process.env.API_KEY;
const url = process.env.PLUGIN_WS_URL ?? 'http://localhost:3000/plugin-gateway';

if (!token) {
  console.error('Missing API_KEY env var. Create a plugin in the web app → Settings → Developer.');
  process.exit(1);
}

const plugin = createPlugin({
  token,
  url,
  name: 'example-bot',
  version: '0.0.1',
  description: 'Reference plugin showing the feature-based architecture.',
});

registerCasinoFeature(plugin);
registerCardsFeature(plugin);

async function main() {
  const { pluginId, enabledServerIds } = await plugin.connect();
  console.log(`✓ connected as plugin ${pluginId}`);
  console.log(`  enabled on ${enabledServerIds.length} server(s)`);
  console.log(`  features: casino, cards`);
}

process.on('SIGINT', () => {
  console.log('\nshutting down');
  plugin.disconnect();
  process.exit(0);
});

main().catch((err) => {
  console.error('plugin failed to start:', err);
  process.exit(1);
});
