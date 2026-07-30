'use client';

import { type ReactNode, useState } from 'react';
import { Think } from '@ant-design/x';
import styles from './ReasoningThink.module.css';

export type ReasoningThinkProps = {
  thinking: boolean;
  children: ReactNode;
};

export default function ReasoningThink({ thinking, children }: ReasoningThinkProps) {
  const [expanded, setExpanded] = useState(thinking);
  const [prevThinking, setPrevThinking] = useState(thinking);

  if (thinking !== prevThinking) {
    setPrevThinking(thinking);
    setExpanded(thinking);
  }

  return (
    <Think
      className={styles.think}
      title={thinking ? '思考中' : '思考过程'}
      loading={thinking}
      blink={thinking}
      expanded={expanded}
      onExpand={setExpanded}
    >
      {children}
    </Think>
  );
}
