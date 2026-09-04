import { StarOutlined } from '@ant-design/icons';
import { Button, Skeleton } from 'antd';
import {
  COMPLETE_BUTTON,
  EMPTY_MULTIVIEW_HINT,
  EMPTY_REFINE_HINT,
  NEXT_BUTTON,
  PREV_BUTTON,
  REFINE_STANDARD_BADGE,
} from '../constants';
import type { ProductRetouchPhase, ResultImage } from '../types';
import { aspectRatioToSize, hasReadyImage } from '../utils';
import ResultImageItem from './ResultImageItem';
import styles from './ResultPanel.module.css';

type ResultPanelProps = {
  phase: ProductRetouchPhase;
  needsMultiview: boolean;
  refineImages: readonly ResultImage[];
  multiviewImages: readonly ResultImage[];
  refineExpectedCount: number;
  multiviewExpectedCount: number;
  refineAspectRatio: string;
  multiviewAspectRatio: string;
  selectedRefineIndex: number | null;
  onSelectRefine: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onComplete: () => void;
};

/** 产品精修工作台右栏：展示当前步骤结果并承载步骤导航。 */
export default function ResultPanel({
  phase,
  needsMultiview,
  refineImages,
  multiviewImages,
  refineExpectedCount,
  multiviewExpectedCount,
  refineAspectRatio,
  multiviewAspectRatio,
  selectedRefineIndex,
  onSelectRefine,
  onPrev,
  onNext,
  onComplete,
}: ResultPanelProps) {
  const showRefine = phase === 'refine' || phase === 'refineGenerating';
  const generating = phase === 'refineGenerating' || phase === 'multiviewGenerating';
  const images = showRefine ? refineImages : multiviewImages;
  const expectedCount = showRefine ? refineExpectedCount : multiviewExpectedCount;
  const aspectRatio = showRefine ? refineAspectRatio : multiviewAspectRatio;
  const placeholderSize = aspectRatioToSize(aspectRatio, 280);
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        {showRefine ? '精修结果' : '产品多视角'}
      </div>
      {images.length > 0 ? (
        <div className={styles.scroll}>
          <div className={styles.grid}>
            {images.map((image) => {
              const size = aspectRatioToSize(image.aspectRatio, 280);
              return (
                <ResultImageItem
                  key={image.index}
                  image={image}
                  width={size.width}
                  height={size.height}
                  selectable={showRefine && phase === 'refine'}
                  selected={showRefine && selectedRefineIndex === image.index}
                  selectedBadge={REFINE_STANDARD_BADGE}
                  onSelect={onSelectRefine}
                />
              );
            })}
          </div>
        </div>
      ) : generating ? (
        <div className={styles.scroll}>
          <div className={styles.grid}>
            {Array.from({ length: Math.max(1, expectedCount) }, (_, index) => (
              <Skeleton.Image
                key={index}
                active
                style={{
                  width: placeholderSize.width,
                  height: placeholderSize.height,
                  borderRadius: 8,
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.empty}>
          <StarOutlined className={styles.emptyIcon} />
          <p>{showRefine ? EMPTY_REFINE_HINT : EMPTY_MULTIVIEW_HINT}</p>
        </div>
      )}
      <div className={styles.footer}>
        {!showRefine ? (
          <>
            <Button size="large" disabled={generating} onClick={onPrev}>
              {PREV_BUTTON}
            </Button>
            <Button size="large" type="primary" disabled={generating} onClick={onComplete}>
              {COMPLETE_BUTTON}
            </Button>
          </>
        ) : null}
        {showRefine ? (
          <Button
            size="large"
            type="primary"
            disabled={
              generating ||
              !hasReadyImage(refineImages) ||
              (needsMultiview && selectedRefineIndex === null)
            }
            onClick={onNext}
          >
            {needsMultiview ? NEXT_BUTTON : COMPLETE_BUTTON}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
