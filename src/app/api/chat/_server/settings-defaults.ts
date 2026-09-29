import 'server-only';

import {
  IMAGE_MODELS_BY_PROVIDER,
  type ChatModelsConfig,
  type ChatProviderId,
  type ChatSettingsPayload,
  type ProviderCredential,
  type ProviderKind,
} from '@/app/api/chat/_shared/chat-settings';
import { getChatProvider } from '@/app/api/chat/_server/providers/config';
import { DEFAULT_DEEPSEEK_REASONING_EFFORT } from '@/app/api/chat/_server/providers/deepseek/constants';
import {
  getConfiguredEditImageModelId,
  getConfiguredImageModelId,
  getImageModelProfile,
} from '@/app/api/images/_server/registry';

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? '';
}

function buildCredential(kind: ProviderKind): ProviderCredential | null {
  const envMap: Record<ProviderKind, { key: string; url: string }> = {
    deepseek: { key: 'DEEPSEEK_API_KEY', url: 'DEEPSEEK_BASE_URL' },
    ark: { key: 'ARK_API_KEY', url: 'ARK_BASE_URL' },
    zhipu: { key: 'ZHIPU_API_KEY', url: 'ZHIPU_BASE_URL' },
    laozhang: { key: 'LAOZHANG_API_KEY', url: 'LAOZHANG_BASE_URL' },
  };
  const { key, url } = envMap[kind];
  const apiKey = readEnv(key);
  const baseUrl = readEnv(url);
  if (!apiKey && !baseUrl) return null;
  return { provider: kind, apiKey, baseUrl };
}

function chatModelsFor(provider: ChatProviderId): ChatModelsConfig {
  if (provider === 'deepseek') {
    return {
      modelPro: readEnv('DEEPSEEK_MODEL_PRO') || 'deepseek-flash',
      modelLite: readEnv('DEEPSEEK_MODEL_LITE') || 'deepseek-flash',
      modelMini: readEnv('DEEPSEEK_MODEL_MINI') || 'deepseek-flash',
    };
  }
  if (provider === 'zhipu') {
    return {
      modelPro: readEnv('ZHIPU_MODEL_PRO') || 'glm-5.3-flash',
      modelLite: readEnv('ZHIPU_MODEL_LITE') || 'glm-5.3-flash',
      modelMini: readEnv('ZHIPU_MODEL_MINI') || 'glm-5.3-flash',
    };
  }
  return {
    modelPro: readEnv('ARK_MODEL_PRO') || 'doubao-seed-2-0-pro-260215',
    modelLite: readEnv('ARK_MODEL_LITE') || 'doubao-seed-2-0-lite-260215',
    modelMini: readEnv('ARK_MODEL_MINI') || 'doubao-seed-2-0-mini-260215',
  };
}

function resolveImageCapability(
  modelId: string,
  fallbackProvider: 'laozhang' | 'ark',
): { provider: 'laozhang' | 'ark'; modelId: string } {
  const profile = getImageModelProfile(modelId);
  if (profile?.provider === 'ark' || profile?.provider === 'laozhang') {
    return { provider: profile.provider, modelId: profile.id };
  }
  const list = IMAGE_MODELS_BY_PROVIDER[fallbackProvider];
  return { provider: fallbackProvider, modelId: list[0]?.id ?? modelId };
}

/** 从当前 env 导出表单初值（含 Key），供迁移到 settings；非请求时回退源 */
export function buildChatSettingsDefaults(): ChatSettingsPayload {
  const kinds: ProviderKind[] = ['deepseek', 'ark', 'zhipu', 'laozhang'];
  const providerConfigs = kinds
    .map(buildCredential)
    .filter(
      (item): item is ProviderCredential => item != null && Boolean(item.apiKey || item.baseUrl),
    );

  // 至少保证有一个对话供应商行，便于首次打开
  if (
    !providerConfigs.some(
      (item) =>
        item.provider === 'deepseek' || item.provider === 'ark' || item.provider === 'zhipu',
    )
  ) {
    providerConfigs.unshift({
      provider: 'deepseek',
      apiKey: readEnv('DEEPSEEK_API_KEY'),
      baseUrl: readEnv('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com',
    });
  }
  if (!providerConfigs.some((item) => item.provider === 'laozhang')) {
    providerConfigs.push({
      provider: 'laozhang',
      apiKey: readEnv('LAOZHANG_API_KEY'),
      baseUrl: readEnv('LAOZHANG_BASE_URL') || 'https://api2.laozhang.ai/v1',
    });
  }

  let chatProvider: ChatProviderId;
  try {
    chatProvider = getChatProvider();
  } catch {
    chatProvider = 'deepseek';
  }
  if (!providerConfigs.some((item) => item.provider === chatProvider)) {
    const firstChat = providerConfigs.find(
      (item) =>
        item.provider === 'deepseek' || item.provider === 'ark' || item.provider === 'zhipu',
    );
    chatProvider = (firstChat?.provider as ChatProviderId) ?? 'deepseek';
  }

  let generateModelId = '';
  let editModelId = '';
  try {
    generateModelId = getConfiguredImageModelId();
  } catch {
    generateModelId = IMAGE_MODELS_BY_PROVIDER.laozhang[0].id;
  }
  try {
    editModelId = getConfiguredEditImageModelId();
  } catch {
    editModelId = generateModelId;
  }

  const generateImage = resolveImageCapability(generateModelId, 'laozhang');
  const editImage = resolveImageCapability(editModelId, generateImage.provider);

  const reasoningEffort =
    chatProvider === 'deepseek'
      ? readEnv('DEEPSEEK_REASONING_EFFORT') || DEFAULT_DEEPSEEK_REASONING_EFFORT
      : chatProvider === 'zhipu'
        ? 'high'
        : undefined;

  return {
    providerConfigs,
    chatProvider,
    chatModels: chatModelsFor(chatProvider),
    ...(reasoningEffort ? { reasoningEffort } : {}),
    generateImage,
    editImage,
  };
}
