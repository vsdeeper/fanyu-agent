import { useThemeMode } from '@/components/theme';
import { useEffect, useRef } from 'react';
import { CHARACTER_ROLE_OPTIONS } from '../../../constants';
import type { BibleStepSnapshot } from '../../../types';
import { RELATION_GRAPH_HEIGHT } from './constants';
import { createRelationGraph, syncRelationGraph } from './graph';
import styles from './RelationGraph.module.css';

type RelationGraphProps = {
  bible: BibleStepSnapshot;
};

/** 设定人物关系的只读图谱。关闭弹层后实例销毁，再次打开重新布局。 */
export default function RelationGraph({ bible }: RelationGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ReturnType<typeof createRelationGraph> | null>(null);
  const paintedBible = useRef<BibleStepSnapshot | null>(null);
  const { mode } = useThemeMode();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const graph = createRelationGraph(container, bible);
    graphRef.current = graph;
    paintedBible.current = bible;
    void graph.render();
    return () => {
      graph.destroy();
      graphRef.current = null;
      paintedBible.current = null;
    };
    // 主题切换才重建，好重新读取 CSS 变量。人物和关系变化走下面的 setData。
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bible 见上
  }, [mode]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || paintedBible.current === bible) {
      paintedBible.current = null;
      return;
    }
    syncRelationGraph(graph, bible);
  }, [bible, mode]);

  return (
    <div className={styles.root}>
      <ul className={styles.legend}>
        {CHARACTER_ROLE_OPTIONS.map((option) => (
          <li key={option.value} className={styles.legendItem}>
            <span className={styles.swatch} data-role={option.value} />
            {option.label}
          </li>
        ))}
      </ul>
      <div ref={containerRef} className={styles.canvas} style={{ height: RELATION_GRAPH_HEIGHT }} />
    </div>
  );
}
