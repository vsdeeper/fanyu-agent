import {
  filterProvidersByCapability,
  type ChatProviderId,
  type ProviderCredential,
  type ProviderKind,
} from '@/app/api/chat/_shared/chat-settings';

/** 从已配置列表取具备 chat 的供应商选项 */
export function listChatProviderOptions(
  configs: readonly ProviderCredential[],
): { value: ChatProviderId; label: string }[] {
  return filterProvidersByCapability(configs, 'chat').map((item) => ({
    value: item.provider as ChatProviderId,
    label: item.provider,
  }));
}

/** 从已配置列表取具备 generate/edit 的供应商选项 */
export function listCapabilityProviderOptions(
  configs: readonly ProviderCredential[],
  capability: 'generate' | 'edit',
): { value: ProviderKind; label: string }[] {
  return filterProvidersByCapability(configs, capability).map((item) => ({
    value: item.provider,
    label: item.provider,
  }));
}
