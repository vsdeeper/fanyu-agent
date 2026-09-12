import { DownloadOutlined, FileTextOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Empty, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import FileCard from '@/components/FileCard';
import { DETAIL_IMAGE_THEMES } from '@/app/api/studio/ecommerce/_shared/detail-image-plan';
import { MAIN_IMAGE_THEMES } from '@/app/api/studio/ecommerce/_shared/main-image-plan';
import type { EcommerceTaskType } from '@/app/api/studio/ecommerce/_shared/task-types';
import AnalysisPreview from './AnalysisPreview';
import PhoneConcatPreview from './PhoneConcatPreview';
import { PREV_BUTTON } from '../constants';
import type { DesignResultGroups, StudioResultImage } from '../types';
import DesignResultGroupsView from '../ResultPanel/DesignResultGroups';
import ResultImageGrid from '../ResultPanel/ResultImageGrid';
import { groupResultImagesByRatio } from '../ResultPanel/utils';
import { isPosterTask } from '../workflow';
import {
  ANALYSIS_FILE_NAME,
  ANALYSIS_GROUP_TITLE,
  ANALYSIS_MEDIA_TYPE,
  COMPLETION_TITLE,
  EXPORT_BUTTON,
  EXPORT_DESELECT_ALL_BUTTON,
  EXPORT_PICK_LABEL,
  EXPORT_SELECT_ALL_BUTTON,
  EXPORT_SELECTED_BADGE,
  VISUAL_GROUP_TITLE,
} from './constants';
import { useExportResultImages } from './hooks/useExportResultImages';
import {
  getGeneratedDesignGroups,
  getGeneratedImages,
  isAllExportSelected,
  orderSelectedImagesByTheme,
} from './utils';
import styles from './CompletionPanel.module.css';

type CompletionPanelProps = {
  analysisText: string;
  visualImages: readonly StudioResultImage[];
  designResultGroups: DesignResultGroups;
  taskType: EcommerceTaskType;
  showDesignTitles?: boolean;
  groupByTheme?: boolean;
  detailPreview?: boolean;
  /** 主图完成页：结果网格可自由多选，标题栏出现「全选」 */
  selectExport?: boolean;
  /** 「全选」的可选 id，需与结果网格展示同一份已生成图 */
  selectableExportIds?: readonly string[];
  selectedExportIds?: string[];
  onSelectExport?: (id: string) => void;
  onSelectAllExport?: () => void;
  onPrev: () => void;
  onExportPersist?: () => void | Promise<void>;
};

/** 汇总商业分析、营销主视觉与各类视觉设计，并提供全部图片打包导出。 */
export default function CompletionPanel({
  analysisText,
  visualImages,
  designResultGroups,
  taskType,
  showDesignTitles = true,
  groupByTheme = false,
  detailPreview = false,
  selectExport = false,
  selectableExportIds = [],
  selectedExportIds = [],
  onSelectExport,
  onSelectAllExport,
  onPrev,
  onExportPersist,
}: CompletionPanelProps) {
  const visualResults = getGeneratedImages(visualImages);
  const designResults = getGeneratedDesignGroups(designResultGroups);
  const hasDesignResults = Object.keys(designResults).length > 0;
  const hasResults = visualResults.length > 0 || hasDesignResults;
  const [open, setOpen] = useState(false);
  const detailImages = designResults['详情图'] ?? [];
  const selectedDetailImages = orderSelectedImagesByTheme(
    detailImages,
    selectedExportIds,
    DETAIL_IMAGE_THEMES,
  );
  const mainImages = designResults['主图'] ?? [];
  // 详情图按每主题一张拼长图，主图自由多选；海报两项都不走，传 undefined 即全量导出
  const selectedExportImages = detailPreview
    ? selectedDetailImages
    : selectExport
      ? orderSelectedImagesByTheme(mainImages, selectedExportIds, MAIN_IMAGE_THEMES)
      : undefined;
  const allExportSelected = isAllExportSelected(selectedExportIds, selectableExportIds);
  const { exporting, handleExport } = useExportResultImages(
    visualResults,
    designResults,
    analysisText,
    taskType,
    selectedExportImages,
  );
  const analysisFile = useMemo(() => {
    // 只有营销海报的 analysisText 才是上传的商业分析原文；主图 / 详情图的 analysisText
    // 是各自主分析结果（主题卡 / 分屏目标），与「商业分析」不是一回事，故不外露
    if (!isPosterTask(taskType) || !analysisText.trim()) return undefined;
    return {
      href: URL.createObjectURL(new Blob([analysisText], { type: ANALYSIS_MEDIA_TYPE })),
      byteSize: new TextEncoder().encode(analysisText).length,
    };
  }, [analysisText, taskType]);
  useEffect(() => {
    return () => {
      if (analysisFile) URL.revokeObjectURL(analysisFile.href);
    };
  }, [analysisFile]);
  const visualGroups = groupResultImagesByRatio(visualResults);
  // 详情图与主图都按点选导出（无选中即不可导出）；海报无选择态，只要有结果即可导出
  const exportDisabled =
    detailPreview || selectExport ? !selectedExportImages?.length : !hasResults;

  const runExport = async () => {
    await onExportPersist?.();
    await handleExport();
  };

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        {COMPLETION_TITLE}
        {selectExport ? (
          <div className={styles.headActions}>
            <Button
              size="small"
              disabled={selectableExportIds.length === 0}
              onClick={onSelectAllExport}
            >
              {allExportSelected ? EXPORT_DESELECT_ALL_BUTTON : EXPORT_SELECT_ALL_BUTTON}
            </Button>
          </div>
        ) : null}
      </div>
      <div className={detailPreview ? styles.splitScroll : styles.scroll}>
        {detailPreview ? (
          <>
            <div className={styles.splitMain}>
              {hasDesignResults ? (
                <DesignResultGroupsView
                  groups={designResults}
                  showTitles={false}
                  groupByTheme
                  themes={DETAIL_IMAGE_THEMES}
                  selectable
                  selectedIds={selectedExportIds}
                  onSelect={onSelectExport}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无生成图片" />
              )}
            </div>
            <aside className={styles.splitSide}>
              <PhoneConcatPreview images={selectedDetailImages} />
            </aside>
          </>
        ) : hasResults || analysisFile ? (
          <div className={styles.groups}>
            {analysisFile ? (
              <>
                <section className={styles.group}>
                  <Typography.Title level={5} className={styles.title}>
                    {ANALYSIS_GROUP_TITLE}
                  </Typography.Title>
                  <FileCard
                    fileName={ANALYSIS_FILE_NAME}
                    byteSize={analysisFile.byteSize}
                    href={analysisFile.href}
                    icon={<FileTextOutlined />}
                    onPreview={() => setOpen(true)}
                  />
                </section>
                <AnalysisPreview
                  open={open}
                  onClose={() => setOpen(false)}
                  fileName={ANALYSIS_FILE_NAME}
                  analysisText={analysisText}
                />
              </>
            ) : null}
            {visualResults.length > 0 ? (
              <section className={styles.group}>
                <Typography.Title level={5} className={styles.title}>
                  {VISUAL_GROUP_TITLE}
                </Typography.Title>
                {visualGroups.map(({ aspectRatio, images }) => (
                  <section key={aspectRatio} className={styles.ratioGroup}>
                    <Typography.Text className={styles.ratioTitle}>{aspectRatio}</Typography.Text>
                    <ResultImageGrid
                      images={images}
                      expectedCount={images.length}
                      aspectRatio={aspectRatio}
                    />
                  </section>
                ))}
              </section>
            ) : null}
            {hasDesignResults ? (
              <DesignResultGroupsView
                groups={designResults}
                showTitles={showDesignTitles}
                groupByTheme={groupByTheme}
                selectable={selectExport}
                selectedIds={selectExport ? selectedExportIds : undefined}
                selectedBadge={selectExport ? EXPORT_SELECTED_BADGE : undefined}
                pickLabel={selectExport ? EXPORT_PICK_LABEL : undefined}
                onSelect={selectExport ? onSelectExport : undefined}
              />
            ) : null}
          </div>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无生成图片" />
        )}
      </div>
      <div className={styles.footer}>
        <Button size="large" disabled={exporting} onClick={onPrev}>
          {PREV_BUTTON}
        </Button>
        <Button
          size="large"
          type="primary"
          icon={<DownloadOutlined />}
          loading={exporting}
          disabled={exportDisabled}
          onClick={() => void runExport()}
        >
          {EXPORT_BUTTON}
        </Button>
      </div>
    </section>
  );
}
