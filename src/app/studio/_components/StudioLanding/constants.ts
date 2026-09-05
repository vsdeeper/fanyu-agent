import { BgColorsOutlined, ShoppingOutlined, UserOutlined } from '@ant-design/icons';
import {
  ECOMMERCE_PATH,
  PRODUCT_MODEL_PATH,
  PRODUCT_RETOUCH_PATH,
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
];
