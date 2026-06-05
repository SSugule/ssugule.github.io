/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Post {
  id: string; // uuid or string
  title?: string;
  url: string;
  rating: 'safe' | 'questionable' | 'explicit';
  score: number; // sum of upvotes/downvotes
  elo: number; // Elo rating for Arena mode
  created_at: string;
  uploader: string;
  source_url?: string;
  description?: string;
  tags: string[]; // list of tag names
}

export interface Tag {
  name: string;
  category: 'character' | 'copyright' | 'artist' | 'general' | 'meta';
  count?: number; // visual helper
}

export interface Comment {
  id: string;
  post_id: string;
  author: string;
  text: string;
  created_at: string;
  likes: number;
}

export interface DatabaseState {
  posts: Post[];
  tags: Tag[];
  comments: Comment[];
  favorites: string[]; // post_id list
}
