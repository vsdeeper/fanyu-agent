import {
  BgColorsOutlined,
  EditOutlined,
  FileImageOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  ReadOutlined,
  ShoppingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  BUSINESS_ANALYSIS_PATH,
  ECOMMERCE_PATH,
  IMAGE_TEXT_PATH,
  LONG_ARTICLE_PATH,
  NOVEL_PATH,
  PRODUCT_MODEL_PATH,
  PRODUCT_RETOUCH_PATH,
  WECHAT_ARTICLE_PATH,
} from '@/components/AppLayout/constants';
import type { StudioEntry } from './types';

export const STUDIO_TITLE = '工作室';

export const STUDIO_ENTRIES: StudioEntry[] = [
  {
    key: 'product-retouch',
    title: '产品精修',
    description: '产品精修/多角度，一键出图',
    path: PRODUCT_RETOUCH_PATH,
    icon: BgColorsOutlined,
  },
  {
    key: 'business-analysis',
    title: '商业分析',
    description: '产品定位、卖点与视觉方向分析',
    path: BUSINESS_ANALYSIS_PATH,
    icon: FileSearchOutlined,
  },
  {
    key: 'product-model',
    title: '产品模特',
    description: '参考产品和模特形象，生成符合产品气质的多角度模特',
    path: PRODUCT_MODEL_PATH,
    icon: UserOutlined,
  },
  {
    key: 'ecommerce',
    title: '电商设计',
    description: '主图、详情图、营销海报一站式设计',
    path: ECOMMERCE_PATH,
    icon: ShoppingOutlined,
  },
  {
    key: 'wechat-article',
    title: '公众号',
    description: '想法驱动：选题调研、内容思路与成稿',
    path: WECHAT_ARTICLE_PATH,
    icon: EditOutlined,
  },
  {
    key: 'long-article',
    title: '长文',
    description: '想法驱动：选题调研、内容思路与成稿',
    path: LONG_ARTICLE_PATH,
    icon: FileTextOutlined,
  },
  {
    key: 'image-text',
    title: '图文',
    description: '内容驱动：图文内容、生图与手机预览',
    path: IMAGE_TEXT_PATH,
    icon: FileImageOutlined,
  },
  {
    key: 'novel',
    title: '小说',
    description: '想法驱动：选题调研与成文',
    path: NOVEL_PATH,
    icon: ReadOutlined,
  },
];
