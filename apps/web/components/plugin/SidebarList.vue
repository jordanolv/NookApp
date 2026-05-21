<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ChevronDown, ChevronRight, Pin, PinOff, Zap } from 'lucide-vue-next';
import { useServerPlugins, type ActivePluginItem } from '~/composables/useServerPlugins';
import { usePluginPanelsStore } from '~/stores/pluginPanels';
import { usePluginPins } from '~/composables/usePluginPins';

const props = defineProps<{ serverId: string }>();

const { listActive } = useServerPlugins();
const panels = usePluginPanelsStore();
const pins = usePluginPins(() => props.serverId);

const plugins = ref<ActivePluginItem[]>([]);
const loading = ref(true);
const expandedPlugins = ref<Set<string>>(new Set());
const expandedFeatures = ref<Set<string>>(new Set());

const featureKey = (pluginId: string, featureId: string) => `${pluginId}:${featureId}`;

function togglePlugin(pluginId: string) {
  const next = new Set(expandedPlugins.value);
  if (next.has(pluginId)) next.delete(pluginId);
  else next.add(pluginId);
  expandedPlugins.value = next;
}

function toggleFeature(pluginId: string, featureId: string) {
  const k = featureKey(pluginId, featureId);
  const next = new Set(expandedFeatures.value);
  if (next.has(k)) next.delete(k);
  else next.add(k);
  expandedFeatures.value = next;
}

async function load() {
  loading.value = true;
  try {
    plugins.value = await listActive(props.serverId);
    const plugSet = new Set<string>();
    const featSet = new Set<string>();
    for (const p of plugins.value) {
      plugSet.add(p.id);
      for (const f of p.capabilities?.features ?? []) {
        featSet.add(featureKey(p.id, f.id));
      }
    }
    expandedPlugins.value = plugSet;
    expandedFeatures.value = featSet;
  } finally {
    loading.value = false;
  }
}

function openMenu(
  plugin: ActivePluginItem,
  featureId: string,
  menuId: string,
  label: string,
  icon: string,
) {
  if (!plugin.connected) return;
  panels.open({
    pluginId: plugin.id,
    featureId,
    menuId,
    serverId: props.serverId,
    label,
    icon,
  });
}

const hasAnyContent = computed(() => plugins.value.length > 0);

onMounted(load);
</script>

<template>
  <div class="tree">
    <template v-for="plugin in plugins" :key="plugin.id">
      <button type="button" class="plugin-row" @click="togglePlugin(plugin.id)">
        <component
          :is="expandedPlugins.has(plugin.id) ? ChevronDown : ChevronRight"
          :size="11"
          :stroke-width="2.5"
        />
        <span class="plugin-row__dot" :class="{ 'plugin-row__dot--on': plugin.connected }" />
        <span class="plugin-row__name">{{ plugin.name }}</span>
      </button>

      <template v-if="expandedPlugins.has(plugin.id)">
        <template v-for="feature in plugin.capabilities?.features ?? []" :key="feature.id">
          <button type="button" class="feature-row" @click="toggleFeature(plugin.id, feature.id)">
            <component
              :is="
                expandedFeatures.has(featureKey(plugin.id, feature.id)) ? ChevronDown : ChevronRight
              "
              :size="12"
              :stroke-width="2"
            />
            <span class="feature-row__icon">{{ feature.icon }}</span>
            <span class="feature-row__name">{{ feature.name }}</span>
          </button>

          <div v-if="expandedFeatures.has(featureKey(plugin.id, feature.id))" class="feature-body">
            <div
              v-for="menu in feature.menus"
              :key="menu.id"
              class="menu-row"
              :class="{ 'menu-row--disabled': !plugin.connected }"
              role="button"
              tabindex="0"
              @click="openMenu(plugin, feature.id, menu.id, menu.label, menu.icon)"
              @keydown.enter="openMenu(plugin, feature.id, menu.id, menu.label, menu.icon)"
            >
              <span class="menu-row__icon">{{ menu.icon }}</span>
              <span class="menu-row__label">{{ menu.label }}</span>
              <button
                type="button"
                class="pin-btn"
                :class="{
                  'pin-btn--on': pins.isPinned({
                    pluginId: plugin.id,
                    featureId: feature.id,
                    menuId: menu.id,
                  }),
                }"
                :title="
                  pins.isPinned({ pluginId: plugin.id, featureId: feature.id, menuId: menu.id })
                    ? 'Unpin'
                    : 'Pin to sidebar'
                "
                @click.stop="
                  pins.toggle({ pluginId: plugin.id, featureId: feature.id, menuId: menu.id })
                "
              >
                <component
                  :is="
                    pins.isPinned({ pluginId: plugin.id, featureId: feature.id, menuId: menu.id })
                      ? PinOff
                      : Pin
                  "
                  :size="11"
                  :stroke-width="2"
                />
              </button>
            </div>

            <div v-for="cmd in feature.slashCommands" :key="cmd.name" class="cmd-row">
              <Zap :size="10" :stroke-width="2.5" />
              <span class="cmd-row__name">/{{ cmd.name }}</span>
              <span class="cmd-row__desc">{{ cmd.description }}</span>
            </div>

            <p
              v-if="feature.menus.length === 0 && feature.slashCommands.length === 0"
              class="empty-feature"
            >
              Aucun menu ni commande.
            </p>
          </div>
        </template>
      </template>
    </template>

    <p v-if="!loading && !hasAnyContent" class="empty">Aucun plugin installé.</p>
  </div>
</template>

<style scoped>
.tree {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 4px 6px;
}
.plugin-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 4px 4px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  border-radius: 4px;
  transition: background 120ms;
}
.plugin-row:hover {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.75);
}
.plugin-row__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}
.plugin-row__dot--on {
  background: rgb(74, 222, 128);
}
.feature-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  font-weight: 600;
  transition: background 120ms;
}
.feature-row:hover {
  background: rgba(255, 255, 255, 0.04);
}
.feature-row__icon {
  font-size: 13px;
}
.feature-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-left: 18px;
  margin-bottom: 4px;
}
.menu-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  cursor: pointer;
  transition: background 120ms;
}
.menu-row:hover {
  background: rgba(255, 255, 255, 0.04);
}
.menu-row--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.menu-row__icon {
  width: 14px;
  text-align: center;
}
.menu-row__label {
  flex: 1;
}
.pin-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
}
.pin-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
}
.pin-btn--on {
  color: rgb(250, 204, 21);
}
.cmd-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
}
.cmd-row__name {
  font-family: ui-monospace, monospace;
  color: rgba(255, 255, 255, 0.7);
}
.cmd-row__desc {
  font-size: 10px;
  opacity: 0.7;
}
.empty,
.empty-feature {
  font-size: 11px;
  padding: 4px 6px;
  color: rgba(255, 255, 255, 0.35);
}
</style>
