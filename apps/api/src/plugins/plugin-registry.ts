import type { PluginDefinition } from '@nookapp/plugin-sdk';
import { helloWorldPlugin } from '@nookapp/plugin-hello-world';

export const PLUGIN_REGISTRY: PluginDefinition[] = [helloWorldPlugin];
