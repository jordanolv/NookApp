import type { PluginDefinition } from '@nookapp/plugin-sdk';
import { helloWorldPlugin } from '../../../../plugins/hello-world/server';

export const PLUGIN_REGISTRY: PluginDefinition[] = [helloWorldPlugin];
