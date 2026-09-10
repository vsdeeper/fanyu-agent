import { Typography } from 'antd';
import { ECOMMERCE_TASK_TYPES } from '@/app/api/studio/ecommerce/_shared/task-constants';
import { MAIN_IMAGE_THEMES } from '@/app/api/studio/ecommerce/_shared/main-image-plan';
import type { ThemeDefinition } from '@/app/api/studio/ecommerce/_shared/theme-plan';
import type { DesignResultGroups as DesignResultGroupsState } from '../../types';
import ResultImageGrid from '../ResultImageGrid';
import { groupResultImagesByRatio, groupResultImagesByTheme } from '../utils';
import styles from './DesignResultGroups.module.css';

type DesignResultGroupsProps = {
  groups: DesignResultGroupsState;
  /** 是否展示物料类型标题；营销海报关闭以免与结果区标题重复 */
  showTitles?: boolean;
  /** 按主题一级、比例二级分组 */
  groupByTheme?: boolean;
  themes?: readonly ThemeDefinition[];
  selectable?: boolean;
  selectedId?: string | null;
  selectedIds?: readonly string[];
  selectedBadge?: string;
  onSelect?: (id: string) => void;
};

/**
 * 按任务类型稳定排序展示视觉设计结果，各组内再按比例拆成二级分类；保留连续生成的全部批次。
 */
export default function DesignResultGroups({
  groups,
  showTitles = true,
  groupByTheme = false,
  themes = MAIN_IMAGE_THEMES,
  selectable = false,
  selectedId = null,
  selectedIds,
  selectedBadge,
  onSelect,
}: DesignResultGroupsProps) {
  return (
    <div className={styles.groups}>
      {ECOMMERCE_TASK_TYPES.map((taskType) => {
        const images = groups[taskType];
        if (!images?.length) return null;
        const themeGroups = groupByTheme ? groupResultImagesByTheme(images, themes) : [];
        return (
          <section key={taskType} className={styles.group}>
            {showTitles ? (
              <Typography.Title level={5} className={styles.title}>
                {taskType}
              </Typography.Title>
            ) : null}
            {groupByTheme
              ? themeGroups.map((themeGroup) => (
                  <section key={themeGroup.themeId} className={styles.group}>
                    <Typography.Title level={5} className={styles.title}>
                      {themeGroup.themeTitle}
                    </Typography.Title>
                    {groupResultImagesByRatio(themeGroup.images).map(
                      ({ aspectRatio, images: ratioImages }) => (
                        <section key={aspectRatio} className={styles.ratioGroup}>
                          <Typography.Text className={styles.ratioTitle}>
                            {aspectRatio}
                          </Typography.Text>
                          <ResultImageGrid
                            images={ratioImages}
                            expectedCount={ratioImages.length}
                            aspectRatio={aspectRatio}
                            selectable={selectable}
                            selectedId={selectedId}
                            selectedIds={selectedIds}
                            selectedBadge={selectedBadge}
                            onSelect={onSelect}
                          />
                        </section>
                      ),
                    )}
                  </section>
                ))
              : groupResultImagesByRatio(images).map(({ aspectRatio, images: ratioImages }) => (
                  <section key={aspectRatio} className={styles.ratioGroup}>
                    <Typography.Text className={styles.ratioTitle}>{aspectRatio}</Typography.Text>
                    <ResultImageGrid
                      images={ratioImages}
                      expectedCount={ratioImages.length}
                      aspectRatio={aspectRatio}
                      selectable={selectable}
                      selectedId={selectedId}
                      selectedIds={selectedIds}
                      selectedBadge={selectedBadge}
                      onSelect={onSelect}
                    />
                  </section>
                ))}
          </section>
        );
      })}
    </div>
  );
}
