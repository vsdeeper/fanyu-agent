/** POST /api/studio/style-tuning/assist-style-prompt 请求体 */
export type AssistStylePromptRequest = {
  styleSamples: string;
};

/** POST /api/studio/style-tuning/assist-style-prompt 成功载荷 */
export type AssistStylePromptResult = {
  stylePrompt: string;
};
