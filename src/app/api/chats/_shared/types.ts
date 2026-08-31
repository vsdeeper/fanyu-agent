import type { UIMessage } from 'ai';

export type ChatRecord = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: UIMessage[];
};

export type ChatListItem = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};
