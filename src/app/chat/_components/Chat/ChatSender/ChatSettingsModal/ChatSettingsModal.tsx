import { useEffect, useMemo } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
} from 'antd';

import {
  DEEPSEEK_REASONING_EFFORTS,
  DEFAULT_IMAGE_QUALITY,
  IMAGE_MODELS_BY_PROVIDER,
  PROVIDER_CAPABILITIES,
  PROVIDER_KINDS,
  PROVIDER_LABELS,
  ZHIPU_REASONING_EFFORTS,
  defaultImageQualityForModel,
  imageModelQualityPresets,
  imageModelSupportsQuality,
  type ChatProviderId,
  type ChatSettingsPayload,
  type ImageQualityValue,
  type ProviderKind,
} from '@/app/api/chat/_shared/chat-settings';
import { listCapabilityProviderOptions, listChatProviderOptions } from '../chat-settings';
import {
  ADD_PROVIDER,
  API_KEY_FIELD,
  BASE_URL_FIELD,
  CAPABILITY_TAG_LABEL,
  CHAT_PROVIDER_FIELD,
  CHAT_SECTION,
  DELETE_PROVIDER_CANCEL,
  DELETE_PROVIDER_CONFIRM,
  DELETE_PROVIDER_OK,
  EDIT_SECTION,
  GENERATE_SECTION,
  IMAGE_MODEL_FIELD,
  IMAGE_PROVIDER_FIELD,
  IMAGE_QUALITY_FIELD,
  IMAGE_QUALITY_LABEL,
  MODEL_LITE_FIELD,
  MODEL_MINI_FIELD,
  MODEL_PRO_FIELD,
  NEED_CHAT_PROVIDER,
  PROVIDER_CONFIG_SECTION,
  PROVIDER_FIELD,
  REASONING_FIELD,
  SAVE_OK,
  SETTINGS_MODAL_TITLE,
} from './constants';
import styles from './ChatSettingsModal.module.css';

type ChatSettingsModalProps = {
  open: boolean;
  settings: ChatSettingsPayload | null;
  onOpenChange: (open: boolean) => void;
  onSave: (settings: ChatSettingsPayload) => void;
};

type FormValues = ChatSettingsPayload;

/** 按模型 qualityPresets 生成质量下拉；不支持时为空 */
function toImageQualityOptions(modelId: string | undefined) {
  if (!modelId) return [];
  return imageModelQualityPresets(modelId).map((value) => ({
    value,
    label: IMAGE_QUALITY_LABEL[value] ?? value,
  }));
}

/** 无本地设置时的空表骨架（用户手动配置） */
const EMPTY_SETTINGS_FORM: FormValues = {
  providerConfigs: [],
  chatProvider: 'deepseek',
  chatModels: { modelPro: '', modelLite: '', modelMini: '' },
  generateImage: {
    provider: 'laozhang',
    modelId: IMAGE_MODELS_BY_PROVIDER.laozhang[0].id,
    quality: DEFAULT_IMAGE_QUALITY,
  },
  editImage: {
    provider: 'laozhang',
    modelId: IMAGE_MODELS_BY_PROVIDER.laozhang[0].id,
    quality: DEFAULT_IMAGE_QUALITY,
  },
};

function providerSelectLabel(kind: ProviderKind) {
  const caps = PROVIDER_CAPABILITIES[kind];
  return (
    <Space size={4}>
      <span>{PROVIDER_LABELS[kind]}</span>
      {caps.map((cap) => (
        <Tag key={cap} style={{ marginInlineEnd: 0 }}>
          {CAPABILITY_TAG_LABEL[cap]}
        </Tag>
      ))}
    </Space>
  );
}

const PROVIDER_OPTIONS = PROVIDER_KINDS.map((kind) => ({
  value: kind,
  label: providerSelectLabel(kind),
}));

/** 对话设置 Modal：顶部可自增供应商凭据 + 对话/生图/改图能力选型 */
export default function ChatSettingsModal({
  open,
  settings,
  onOpenChange,
  onSave,
}: ChatSettingsModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();

  const providerConfigs =
    Form.useWatch('providerConfigs', form) ?? EMPTY_SETTINGS_FORM.providerConfigs;
  const chatProvider = Form.useWatch('chatProvider', form) as ChatProviderId | undefined;
  const generateProvider = Form.useWatch(['generateImage', 'provider'], form) as
    'laozhang' | 'ark' | undefined;
  const editProvider = Form.useWatch(['editImage', 'provider'], form) as
    'laozhang' | 'ark' | undefined;
  const generateModelId = Form.useWatch(['generateImage', 'modelId'], form) as string | undefined;
  const editModelId = Form.useWatch(['editImage', 'modelId'], form) as string | undefined;
  const generateSupportsQuality = Boolean(
    generateModelId && imageModelSupportsQuality(generateModelId),
  );
  const editSupportsQuality = Boolean(editModelId && imageModelSupportsQuality(editModelId));

  const chatOptions = useMemo(
    () =>
      listChatProviderOptions(providerConfigs).map((item) => ({
        value: item.value,
        label: PROVIDER_LABELS[item.value],
      })),
    [providerConfigs],
  );

  const generateOptions = useMemo(
    () =>
      listCapabilityProviderOptions(providerConfigs, 'generate').map((item) => ({
        value: item.value,
        label: PROVIDER_LABELS[item.value as ProviderKind],
      })),
    [providerConfigs],
  );

  const editOptions = useMemo(
    () =>
      listCapabilityProviderOptions(providerConfigs, 'edit').map((item) => ({
        value: item.value,
        label: PROVIDER_LABELS[item.value as ProviderKind],
      })),
    [providerConfigs],
  );

  const generateModelOptions =
    generateProvider === 'ark' || generateProvider === 'laozhang'
      ? IMAGE_MODELS_BY_PROVIDER[generateProvider].map((item) => ({
          value: item.id,
          label: item.label,
        }))
      : [];

  const editModelOptions =
    editProvider === 'ark' || editProvider === 'laozhang'
      ? IMAGE_MODELS_BY_PROVIDER[editProvider].map((item) => ({
          value: item.id,
          label: item.label,
        }))
      : [];

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(settings ?? EMPTY_SETTINGS_FORM);
  }, [open, settings, form]);

  // 模型不支持 quality 时清掉表单字段；支持且为空/越界时回填该模型默认档
  useEffect(() => {
    if (!open || !generateModelId) return;
    if (imageModelSupportsQuality(generateModelId)) {
      const current = form.getFieldValue(['generateImage', 'quality']) as
        ImageQualityValue | undefined;
      const presets = imageModelQualityPresets(generateModelId);
      if (!current || !presets.includes(current)) {
        form.setFieldValue(
          ['generateImage', 'quality'],
          defaultImageQualityForModel(generateModelId),
        );
      }
    } else {
      form.setFieldValue(['generateImage', 'quality'], undefined);
    }
  }, [open, generateModelId, form]);

  useEffect(() => {
    if (!open || !editModelId) return;
    if (imageModelSupportsQuality(editModelId)) {
      const current = form.getFieldValue(['editImage', 'quality']) as ImageQualityValue | undefined;
      const presets = imageModelQualityPresets(editModelId);
      if (!current || !presets.includes(current)) {
        form.setFieldValue(['editImage', 'quality'], defaultImageQualityForModel(editModelId));
      }
    } else {
      form.setFieldValue(['editImage', 'quality'], undefined);
    }
  }, [open, editModelId, form]);

  // 上方列表变化时纠正非法的能力选中值
  useEffect(() => {
    if (!open) return;
    const chatValues = chatOptions.map((item) => item.value);
    if (chatProvider && !chatValues.includes(chatProvider)) {
      form.setFieldValue('chatProvider', chatValues[0]);
    }
    const genValues = generateOptions.map((item) => item.value);
    if (generateProvider && !genValues.includes(generateProvider)) {
      const next = genValues[0] as 'laozhang' | 'ark' | undefined;
      form.setFieldValue(['generateImage', 'provider'], next);
      if (next) {
        form.setFieldValue(['generateImage', 'modelId'], IMAGE_MODELS_BY_PROVIDER[next][0]?.id);
      }
    }
    const editValues = editOptions.map((item) => item.value);
    if (editProvider && !editValues.includes(editProvider)) {
      const next = editValues[0] as 'laozhang' | 'ark' | undefined;
      form.setFieldValue(['editImage', 'provider'], next);
      if (next) {
        form.setFieldValue(['editImage', 'modelId'], IMAGE_MODELS_BY_PROVIDER[next][0]?.id);
      }
    }
  }, [
    open,
    chatOptions,
    generateOptions,
    editOptions,
    chatProvider,
    generateProvider,
    editProvider,
    form,
  ]);

  return (
    <Modal
      title={SETTINGS_MODAL_TITLE}
      open={open}
      destroyOnHidden
      width={900}
      onCancel={() => onOpenChange(false)}
      onOk={async () => {
        try {
          const values = await form.validateFields();
          if (!values.chatProvider) {
            message.warning(NEED_CHAT_PROVIDER);
            return;
          }
          onSave(values);
          message.success(SAVE_OK);
          onOpenChange(false);
        } catch {
          /* 校验失败 */
        }
      }}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Divider titlePlacement="start">{PROVIDER_CONFIG_SECTION}</Divider>
        <Form.List name="providerConfigs">
          {(fields, { add, remove }) => {
            const selectedProviders = new Set(
              (providerConfigs as { provider?: ProviderKind }[])
                .map((row) => row?.provider)
                .filter((value): value is ProviderKind => Boolean(value)),
            );
            const unusedProviders = PROVIDER_KINDS.filter((kind) => !selectedProviders.has(kind));

            return (
              <>
                {fields.map(({ key, name, ...restField }, index) => {
                  const currentProvider = (providerConfigs as { provider?: ProviderKind }[])[name]
                    ?.provider;
                  const rowOptions = PROVIDER_OPTIONS.map((option) => ({
                    ...option,
                    disabled:
                      option.value !== currentProvider && selectedProviders.has(option.value),
                  }));

                  return (
                    <div key={key}>
                      {index > 0 ? <Divider className={styles.providerDivider} /> : null}
                      <div className={styles.providerRow}>
                        <div className={styles.providerFields}>
                          <Row gutter={[12, 0]} wrap>
                            <Col xs={24} sm={8} md={6} flex="1 1 160px">
                              <Form.Item
                                {...restField}
                                name={[name, 'provider']}
                                label={PROVIDER_FIELD}
                                rules={[{ required: true, message: '请选择供应商' }]}
                              >
                                <Select
                                  options={rowOptions}
                                  optionLabelProp="label"
                                  labelRender={(option) =>
                                    PROVIDER_LABELS[option.value as ProviderKind] ??
                                    String(option.value)
                                  }
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={16} md={8} flex="1 1 200px">
                              <Form.Item
                                {...restField}
                                name={[name, 'apiKey']}
                                label={API_KEY_FIELD}
                                rules={[{ required: true, message: '请填写 API Key' }]}
                              >
                                <Input.Password autoComplete="off" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={24} md={10} flex="2 1 240px">
                              <Form.Item
                                {...restField}
                                name={[name, 'baseUrl']}
                                label={BASE_URL_FIELD}
                                rules={[{ required: true, message: '请填写 Base URL' }]}
                              >
                                <Input />
                              </Form.Item>
                            </Col>
                          </Row>
                        </div>
                        <div className={styles.deleteCol}>
                          <Popconfirm
                            title={DELETE_PROVIDER_CONFIRM}
                            okText={DELETE_PROVIDER_OK}
                            cancelText={DELETE_PROVIDER_CANCEL}
                            okButtonProps={{ danger: true }}
                            onConfirm={() => remove(name)}
                          >
                            <Button
                              type="text"
                              danger
                              shape="circle"
                              icon={<DeleteOutlined />}
                              aria-label="删除供应商"
                            />
                          </Popconfirm>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Button
                  type="dashed"
                  disabled={unusedProviders.length === 0}
                  onClick={() =>
                    add({
                      provider: unusedProviders[0] ?? 'deepseek',
                      apiKey: '',
                      baseUrl: '',
                    })
                  }
                  block
                  icon={<PlusOutlined />}
                >
                  {ADD_PROVIDER}
                </Button>
              </>
            );
          }}
        </Form.List>

        <Divider titlePlacement="start">{CHAT_SECTION}</Divider>
        <Form.Item
          name="chatProvider"
          label={CHAT_PROVIDER_FIELD}
          rules={[{ required: true, message: NEED_CHAT_PROVIDER }]}
        >
          <Select options={chatOptions} placeholder={NEED_CHAT_PROVIDER} />
        </Form.Item>
        <Form.Item
          name={['chatModels', 'modelPro']}
          label={MODEL_PRO_FIELD}
          rules={[{ required: true, message: '请填写 Pro 模型' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name={['chatModels', 'modelLite']}
          label={MODEL_LITE_FIELD}
          rules={[{ required: true, message: '请填写 Lite 模型' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name={['chatModels', 'modelMini']}
          label={MODEL_MINI_FIELD}
          rules={[{ required: true, message: '请填写 Mini 模型' }]}
        >
          <Input />
        </Form.Item>
        {chatProvider === 'deepseek' || chatProvider === 'zhipu' ? (
          <Form.Item name="reasoningEffort" label={REASONING_FIELD}>
            <Select
              options={(chatProvider === 'deepseek'
                ? DEEPSEEK_REASONING_EFFORTS
                : ZHIPU_REASONING_EFFORTS
              ).map((value) => ({ value, label: value }))}
            />
          </Form.Item>
        ) : null}

        <Divider titlePlacement="start">{GENERATE_SECTION}</Divider>
        <Form.Item
          name={['generateImage', 'provider']}
          label={IMAGE_PROVIDER_FIELD}
          rules={[{ required: true, message: '请选择生图供应商' }]}
        >
          <Select
            options={generateOptions}
            onChange={(value: 'laozhang' | 'ark') => {
              form.setFieldValue(
                ['generateImage', 'modelId'],
                IMAGE_MODELS_BY_PROVIDER[value][0]?.id,
              );
            }}
          />
        </Form.Item>
        <Form.Item
          name={['generateImage', 'modelId']}
          label={IMAGE_MODEL_FIELD}
          rules={[{ required: true, message: '请选择生图模型' }]}
        >
          <Select options={generateModelOptions} />
        </Form.Item>
        {generateSupportsQuality ? (
          <Form.Item
            name={['generateImage', 'quality']}
            label={IMAGE_QUALITY_FIELD}
            rules={[{ required: true, message: '请选择生图质量' }]}
            preserve={false}
          >
            <Select options={toImageQualityOptions(generateModelId)} />
          </Form.Item>
        ) : null}

        <Divider titlePlacement="start">{EDIT_SECTION}</Divider>
        <Form.Item
          name={['editImage', 'provider']}
          label={IMAGE_PROVIDER_FIELD}
          rules={[{ required: true, message: '请选择改图供应商' }]}
        >
          <Select
            options={editOptions}
            onChange={(value: 'laozhang' | 'ark') => {
              form.setFieldValue(['editImage', 'modelId'], IMAGE_MODELS_BY_PROVIDER[value][0]?.id);
            }}
          />
        </Form.Item>
        <Form.Item
          name={['editImage', 'modelId']}
          label={IMAGE_MODEL_FIELD}
          rules={[{ required: true, message: '请选择改图模型' }]}
        >
          <Select options={editModelOptions} />
        </Form.Item>
        {editSupportsQuality ? (
          <Form.Item
            name={['editImage', 'quality']}
            label={IMAGE_QUALITY_FIELD}
            rules={[{ required: true, message: '请选择改图质量' }]}
            preserve={false}
          >
            <Select options={toImageQualityOptions(editModelId)} />
          </Form.Item>
        ) : null}
      </Form>
    </Modal>
  );
}
