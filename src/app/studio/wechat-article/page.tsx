import { redirect } from 'next/navigation';
import { STUDIO_PATH } from '@/components/AppLayout/constants';

/** 公众号产品已下线：旧入口统一回到工作室首页。 */
export default function WechatArticleRemovedPage() {
  redirect(STUDIO_PATH);
}
