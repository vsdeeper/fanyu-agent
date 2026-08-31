/** 文件预览内容源：会话附件为 data URL，会话文档为同源 http */
export type AuxiliaryPanelFileSource =
  { kind: 'data-url'; url: string } | { kind: 'http'; href: string };

/** 右侧来源概要卡片条目 */
export type SourceListItem = {
  key: string;
  title: string;
  url: string;
  snippet?: string;
  publishDate?: string;
};

/**
 * 右侧辅助面板载荷。按 type 扩展，壳内 switch 渲染。
 */
export type AuxiliaryPanelContent =
  | {
      type: 'file-preview';
      fileName: string;
      mediaType: string;
      source: AuxiliaryPanelFileSource;
    }
  | {
      type: 'source-list';
      messageId: string;
      items: SourceListItem[];
    }
  | {
      /** 详情图分组：点击分类叠加的详情图簇时打开，竖排顺序查看 */
      type: 'detail-images';
      title: string;
      images: Array<{ src: string; key?: string }>;
    };
