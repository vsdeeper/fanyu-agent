import { redirect } from 'next/navigation';
import { STUDIO_PATH } from '@/components/AppLayout/constants';

/** 公众号任务深链已失效：统一回到工作室首页。 */
export default function WechatArticleTaskRemovedPage() {
  redirect(STUDIO_PATH);
}
