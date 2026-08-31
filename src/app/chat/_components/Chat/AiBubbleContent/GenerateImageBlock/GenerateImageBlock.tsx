import { Image, Skeleton } from 'antd';
import { openDetailImages } from '@/app/chat/_components/AuxiliaryPanel/open-detail-images';
import ChatImage, {
  CHAT_IMAGE_FAILED_CLASS_NAMES,
  CHAT_IMAGE_PREVIEW_GROUP_CLASS_NAMES,
  FALLBACK_ICON_SRC,
} from '../../ChatImage';
import OverlapStack from './OverlapStack';
import type { MessagePart } from '../utils';
import styles from './GenerateImageBlock.module.css';
import {
  type GenerateImageOutput,
  GENERATE_IMAGE_CATEGORY_LABELS,
  getCategorizedGroups,
  getImageAssets,
  getPreviewableImages,
  isGenerateImageFailed,
  isGenerateImagePending,
  isGenerateImageReady,
  isGenerateImageSourceMissing,
} from './utils';

function GenerateImageItem({ part }: { part: MessagePart }) {
  const state = typeof part.state === 'string' ? part.state : '';
  const output = part.output as GenerateImageOutput | undefined;

  if (isGenerateImageSourceMissing(output)) {
    return null;
  }

  if (isGenerateImageFailed(state, output)) {
    return (
      <ChatImage
        src={FALLBACK_ICON_SRC}
        size={60}
        alt="图片生成失败"
        preview={false}
        classNames={CHAT_IMAGE_FAILED_CLASS_NAMES}
      />
    );
  }

  if (output && isGenerateImageReady(output)) {
    const assets = getImageAssets(output);
    return (
      <>
        {assets.map((asset) => (
          <ChatImage
            key={asset.assetId || asset.url}
            src={asset.url || `/api/images/${asset.assetId}`}
            size={60}
            alt="生成的图片"
          />
        ))}
      </>
    );
  }

  if (isGenerateImagePending(state)) {
    return <Skeleton.Image active style={{ width: 60, height: 60, borderRadius: 8 }} />;
  }

  return null;
}

export type GenerateImageBlockProps = {
  parts: ReadonlyArray<MessagePart>;
};

export default function GenerateImageBlock({ parts }: GenerateImageBlockProps) {
  const visibleParts = parts.filter((part) => {
    const output = part.output as GenerateImageOutput | undefined;
    return !isGenerateImageSourceMissing(output);
  });
  if (visibleParts.length === 0) return null;

  // 分类渲染仅在「已声明分组能力的 skill（如电商设计）激活 + 全部图片生成成功 + 每张都带 type + 至少一组」时启用；
  // 否则走现有平铺（含流式 Skeleton / 失败缩略图），不影响其它生图 skill。
  const allReady = visibleParts.every((part) =>
    isGenerateImageReady(part.output as GenerateImageOutput | undefined),
  );
  const groupingOn = visibleParts.some(
    (part) => (part.output as GenerateImageOutput | undefined)?.imageGrouping === true,
  );
  const { groups, allTyped } = getCategorizedGroups(visibleParts);
  // 放宽为「至少一组」：单类型批量（如仅 4 张详情图）也走分类渲染，详情图簇打开右侧 360px 侧栏。
  // allTyped 已隐含至少一组，保留 > 0 作显式兜底；非电商（groupingOn=false）仍平铺，不受影响。
  const categorize = groupingOn && allReady && allTyped && groups.length > 0;

  if (!categorize) {
    // 预览图册顺序与缩略图行同源：避免 antd PreviewGroup 按图片注册（挂载）顺序生成预览序列，导致「N/M」序号错位
    const previewItems = getPreviewableImages(visibleParts);

    return (
      <div className={styles.list}>
        <Image.PreviewGroup items={previewItems} classNames={CHAT_IMAGE_PREVIEW_GROUP_CLASS_NAMES}>
          {visibleParts.map((part, index) => (
            <GenerateImageItem key={`generate-image-${index}`} part={part} />
          ))}
        </Image.PreviewGroup>
      </div>
    );
  }

  return (
    <div className={styles.categorized}>
      {groups.map((group) => {
        const label = GENERATE_IMAGE_CATEGORY_LABELS[group.category];
        const isDetail = group.category === 'detail';
        if (isDetail) {
          return (
            <div key={group.category} className={styles.cluster}>
              <span className={styles.clusterLabel}>{label}</span>
              {/* 详情图簇：整块点击右侧 360px 侧栏，缩略图禁用自带预览以免吞掉点击 */}
              <button
                type="button"
                className={styles.clusterButton}
                onClick={() =>
                  openDetailImages(
                    label,
                    group.items.map((item) => ({ src: item.src, key: item.assetId })),
                  )
                }
              >
                <OverlapStack items={group.items} preview={false} />
              </button>
            </div>
          );
        }
        // 主图 / 营销图簇：横向书页叠，点击走组内 antd 轮播（items 保证与簇内顺序一致）
        return (
          <div key={group.category} className={styles.cluster}>
            <span className={styles.clusterLabel}>{label}</span>
            <Image.PreviewGroup
              items={group.items.map((item) => ({ src: item.src }))}
              classNames={CHAT_IMAGE_PREVIEW_GROUP_CLASS_NAMES}
            >
              <OverlapStack items={group.items} preview />
            </Image.PreviewGroup>
          </div>
        );
      })}
    </div>
  );
}
