import { Typography } from 'antd';
import { ECOMMERCE_TASK_TYPES } from '@/app/api/studio/ecommerce/_shared/task-constants';
import type { DesignResultGroups as DesignResultGroupsState } from '../../types';
import ResultImageGrid from '../ResultImageGrid';
import { groupResultImagesByRatio } from '../utils';
import styles from './DesignResultGroups.module.css';

type DesignResultGroupsProps = {
  groups: DesignResultGroupsState;
  /** 是否展示物料类型标题；营销海报关闭以免与结果区标题重复 */
  showTitles?: boolean;
};

/**
 * 按任务类型稳定排序展示视觉设计结果，各组内再按比例拆成二级分类；保留连续生成的全部批次。
 */
export default function DesignResultGroups({ groups, showTitles = true }: DesignResultGroupsProps) {
  return (
    <div className={styles.groups}>
      {ECOMMERCE_TASK_TYPES.map((taskType) => {
        const images = groups[taskType];
        if (!images?.length) return null;
        return (
          <section key={taskType} className={styles.group}>
            {showTitles ? (
              <Typography.Title level={5} className={styles.title}>
                {taskType}
              </Typography.Title>
            ) : null}
            {groupResultImagesByRatio(images).map(({ aspectRatio, images: ratioImages }) => (
              <section key={aspectRatio} className={styles.ratioGroup}>
                <Typography.Text className={styles.ratioTitle}>{aspectRatio}</Typography.Text>
                <ResultImageGrid
                  images={ratioImages}
                  expectedCount={ratioImages.length}
                  aspectRatio={aspectRatio}
                />
              </section>
            ))}
          </section>
        );
      })}
    </div>
  );
}
