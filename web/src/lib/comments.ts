export type Comment = {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
  };
  created_at: string;
  parent_id: string | null;
  likes_count: number;
};
