/** AI SDK / 方舟 web_search 的近似用户位置 */
export type UserLocation = {
  type: 'approximate';
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
};
