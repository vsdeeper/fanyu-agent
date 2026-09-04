import { Typography } from 'antd';
import { ECOMMERCE_DESIGN_TYPES } from '@/app/api/ecommerce/_shared/constants';
import type { DesignResultGroups as DesignResultGroupsState } from '../../types';
import ResultImageGrid from '../ResultImageGrid';
import styles from './DesignResultGroups.module.css';

type DesignResultGroupsProps = {
  groups: DesignResultGroupsState;
};

/**
 * 按设计类型稳定排序展示第五步结果，各组内部保留连续生成的全部批次。
 */
export default function DesignResultGroups({ groups }: DesignResultGroupsProps) {
  return (
    <div className={styles.groups}>
      {ECOMMERCE_DESIGN_TYPES.map((designType) => {
        const images = groups[designType];
        if (!images?.length) return null;
        return (
          <section key={designType} className={styles.group}>
            <Typography.Title level={5} className={styles.title}>
              {designType}
            </Typography.Title>
            <ResultImageGrid
              images={images}
              expectedCount={images.length}
              aspectRatio={images[0]?.aspectRatio ?? '1:1'}
            />
          </section>
        );
      })}
    </div>
  );
}
