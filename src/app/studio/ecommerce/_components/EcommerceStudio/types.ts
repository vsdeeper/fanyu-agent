import type { EcommerceTaskType } from '@/app/api/studio/ecommerce/_shared/task-types';
import type { ThemePlanCard } from '@/app/api/studio/ecommerce/_shared/theme-plan';
import type { StudioResultImage } from '@/app/studio/_utils/result-images';
import type { StudioImageUploadItem } from '@/business-components/StudioImageUpload';

export type { StudioResultImage };

export type StudioPhase =
  | 'input'
  | 'analyzing'
  | 'analyzed'
  | 'visual'
  | 'visualGenerating'
  | 'design'
  | 'designGenerating'
  | 'complete';

/** 上传项与本地文件生命周期共用同一份定义，见 lib/shared/client/upload-items。 */
export type ProductImageItem = StudioImageUploadItem;
export type ProductDocItem = StudioImageUploadItem;

/** 生图规格字段，主视觉与产品模特表单共用 */
export type StudioSpecFields = {
  model: string;
  aspectRatio: string;
  quality: string;
  clarity: string;
};

export type StudioFormState = StudioSpecFields & {
  count: string;
};

export type DesignFormState = StudioFormState & {
  taskType: EcommerceTaskType;
  /** 纯视觉无文字：画面禁止可读文案 */
  textlessVisual: boolean;
  /** 统一视觉气质：出图注入气质摘要并要求套图一致 */
  unifyVisualMood: boolean;
};

export type DesignResultGroups = Partial<Record<EcommerceTaskType, StudioResultImage[]>>;

/**
 * 左栏表单值：与 ControlPanel 的 Form.Item name 一一对应。
 *
 * 主视觉与设计各占一套规格 name；几个上传项在互斥的步骤分支里复用同一个 key
 * （例如 brandLogo 在分析步与主视觉步都写它，两步不会同时渲染）。
 */
export type EcommercePanelValues = {
  images: ProductImageItem[];
  documents: ProductDocItem[];
  productDocs: ProductDocItem[];
  brandLogo: ProductImageItem[];
  modelImages: ProductImageItem[];
  visualSpec: StudioFormState;
  designSpec: DesignFormState;
};

export type AnalysisStepSnapshot = {
  images: ProductImageItem[];
  documents: ProductDocItem[];
  /** 主图 / 详情图任务的补充产品资料（TXT / MD）；documents 恒为商业分析文档，两组不可混用 */
  productDocs?: ProductDocItem[];
  /** 主图 / 详情图任务的品牌 Logo（至多一张，作出图参考图末位）；未上传时省略 */
  brandLogoImages?: ProductImageItem[];
  analysisText: string;
  planCards?: ThemePlanCard[];
  /** 分析产出的跨张气质摘要；旧快照可能缺此键 */
  visualMoodSummary?: string;
  selectedThemeIds?: string[];
};

export type VisualStepSnapshot = {
  form: StudioFormState;
  visualImages: StudioResultImage[];
  selectedVisualId: string | null;
  images?: ProductImageItem[];
  documents?: ProductDocItem[];
  analysisText?: string;
  /**
   * 营销海报任务的品牌 Logo（至多一张，作主视觉与海报出图的参考图末位）；未上传时省略。
   * 海报没有分析步，Logo 与产品精修图一起在主视觉步录入，故存在本快照而非分析快照。
   */
  brandLogoImages?: ProductImageItem[];
};

export type DesignStepSnapshot = {
  form: DesignFormState;
  designResultGroups: DesignResultGroups;
  modelImages: ProductImageItem[];
  images?: ProductImageItem[];
  documents?: ProductDocItem[];
  analysisText?: string;
  /**
   * 右栏结果网格里点选的参考图**在本任务类型对应分组**中的图片 id，至多一张：
   * 详情图 = designResultGroups['详情图'] 的上一屏；主图 = designResultGroups['主图'] 的文案标准参考图。
   * 同一任务只会是其中一种（designForm.taskType 被强制覆写为 task.taskType），故共用一个字段。
   * 若将来主图步需同时持有两种角色的参考图、或需多选，必须拆字段并把本字段改名为 previousScreenId。
   */
  referenceImageId?: string | null;
  /**
   * 完成页点选待导出的结果图 id，取自本任务类型对应的结果分组。
   * 详情图每主题至多一张、顺序即长图拼接与导出顺序（toggleExportSelectedIdByTheme）；
   * 主图自由多选、同主题可多张，导出时按主题序重排（toggleExportSelectedId）。
   */
  selectedExportIds?: string[];
};
