import { CheckCircleFilled } from '@ant-design/icons';
import { Image, Skeleton } from 'antd';
import { aspectRatioToSize } from '@/app/studio/_utils/result-images';
import { IMAGE_ASPECT_RATIO_OPTIONS, PREVIEW_MARK } from '../../constants';
import type { ImageTextRatioGroup } from '../../types';
import { GALLERY_THUMB_WIDTH, PICK_PREVIEW_LABEL } from './constants';
import styles from './GeneratedGallery.module.css';

type GeneratedGalleryProps = {
  groups: ImageTextRatioGroup[];
  /** 当前出图比例；生成中骨架按此尺寸占位。 */
  aspectRatio: string;
  generating: boolean;
  onToggle: (imageId: string) => void;
};

function ratioLabel(ratio: string): string {
  return IMAGE_ASPECT_RATIO_OPTIONS.find((item) => item.value === ratio)?.label ?? ratio;
}

/** 当前比例组末尾的出图骨架，尺寸与同组缩略图一致。 */
function GeneratingSkeleton({ aspectRatio }: { aspectRatio: string }) {
  const { width, height } = aspectRatioToSize(aspectRatio, GALLERY_THUMB_WIDTH);
  return (
    <div className={styles.skeleton} style={{ width, height }}>
      <Skeleton.Image active style={{ width, height, borderRadius: 8 }} />
    </div>
  );
}

/** 已出图：仅按生成比例分组展示，角标勾选是否进入预览步；生成中追加骨架。 */
export default function GeneratedGallery({
  groups,
  aspectRatio,
  generating,
  onToggle,
}: GeneratedGalleryProps) {
  const previewItems = groups.flatMap((group) => group.images.map((image) => ({ src: image.url })));
  const skeletonInExisting = generating && groups.some((group) => group.ratio === aspectRatio);

  return (
    <div className={styles.gallery}>
      <Image.PreviewGroup items={previewItems} preview={{ minScale: 0.5 }}>
        {groups.map((group) => (
          <section key={group.ratio} className={styles.ratioGroup}>
            <p className={styles.ratioTitle}>{ratioLabel(group.ratio)}</p>
            <div className={styles.grid}>
              {group.images.map((image) => {
                const { width, height } = aspectRatioToSize(image.aspectRatio, GALLERY_THUMB_WIDTH);
                return (
                  <div
                    key={image.id}
                    className={`${styles.thumb} ${image.selected ? styles.selected : ''}`}
                    style={{ width, height }}
                  >
                    <Image
                      src={image.url}
                      width={width}
                      height={height}
                      alt={image.cardTitle ?? ratioLabel(group.ratio)}
                      preview={{ mask: '预览', minScale: 0.5 }}
                    />
                    <button
                      type="button"
                      className={image.selected ? styles.mark : styles.pick}
                      aria-pressed={image.selected}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggle(image.id);
                      }}
                    >
                      {image.selected ? (
                        <>
                          <CheckCircleFilled />
                          {PREVIEW_MARK}
                        </>
                      ) : (
                        PICK_PREVIEW_LABEL
                      )}
                    </button>
                  </div>
                );
              })}
              {generating && group.ratio === aspectRatio ? (
                <GeneratingSkeleton aspectRatio={aspectRatio} />
              ) : null}
            </div>
          </section>
        ))}
      </Image.PreviewGroup>
      {generating && !skeletonInExisting ? (
        <section className={styles.ratioGroup}>
          <p className={styles.ratioTitle}>{ratioLabel(aspectRatio)}</p>
          <div className={styles.grid}>
            <GeneratingSkeleton aspectRatio={aspectRatio} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
