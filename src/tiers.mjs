// Shared worker tier roster. Plain data with zero dependencies on purpose:
// this module is imported by the DSH hub (inside the host realm), the external
// MCP server, the CLI bridge and the standalone runtime — each realm is
// forbidden from importing @deepseek-ai copies, and this one imports nothing.

export const TIERS = {
  flash: { model: 'deepseek-v4-flash', label: 'V4 Flash' },
  pro: { model: 'deepseek-v4-pro', label: 'V4 Pro' },
  vision: { model: 'deepseek-v4-flash-vision-exp', label: 'V4 Flash Vision', modalities: ['text', 'image'] },
};

/** All tier ids in roster order (`flash`, `pro`, `vision`). */
export const TIER_IDS = Object.keys(TIERS);

/** Model id for a tier, or `undefined` when the tier is unknown. */
export function tierModel(tier) {
  return TIERS[tier]?.model;
}

/** Config key holding the hub-mode agent preset for a tier (preset_flash, ...). */
export function presetKey(tier) {
  return TIERS[tier] === undefined ? undefined : `preset_${tier}`;
}
