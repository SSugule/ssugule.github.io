import { Post, Tag, Comment } from './types';
import { INITIAL_POSTS, INITIAL_TAGS, INITIAL_COMMENTS } from './sampleData';

class SuguleDatabaseManager {
  private isSupabaseEnabled: boolean = true;
  private configUrl: string = 'PROXIED_BACKEND';
  private configKey: string = 'SECURE_PROXY';

  constructor() {
    this.init();
  }

  public init() {
    console.log('Sugule Database Manager initialized in secure Proxy mode.');
  }

  public getConfiguration() {
    return {
      isEnabled: this.isSupabaseEnabled,
      url: this.configUrl,
      key: this.configKey
    };
  }

  public saveConfiguration(url: string, key: string) {
    console.log('Secure Proxy: Ignoring manual credentials override to protect system stability.');
    return true;
  }

  public disconnectSupabase() {
    console.log('Secure Proxy: Disconnect operation bypassed to always maintain stable database persistence.');
  }

  // Local storage cache helpers to secure absolute offline/hybrid resilience
  private getLocalCommentsList(): Comment[] {
    const local = localStorage.getItem('SUGULE_LOCAL_COMMENTS');
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        return INITIAL_COMMENTS;
      }
    }
    localStorage.setItem('SUGULE_LOCAL_COMMENTS', JSON.stringify(INITIAL_COMMENTS));
    return INITIAL_COMMENTS;
  }

  private addPostToLocal(post: Post) {
    const local = localStorage.getItem('SUGULE_LOCAL_POSTS');
    let posts = INITIAL_POSTS;
    if (local) {
      try {
        posts = JSON.parse(local);
      } catch {
        posts = INITIAL_POSTS;
      }
    }
    posts = [post, ...posts.filter(p => p.id !== post.id)];
    localStorage.setItem('SUGULE_LOCAL_POSTS', JSON.stringify(posts));
  }

  private ensureTagsExistLocally(tagNames: string[]) {
    const local = localStorage.getItem('SUGULE_LOCAL_TAGS');
    let tags = INITIAL_TAGS;
    if (local) {
      try {
        tags = JSON.parse(local);
      } catch {
        tags = INITIAL_TAGS;
      }
    }

    const existingNames = tags.map(t => t.name.toLowerCase());
    const missingNames = tagNames.filter(n => !existingNames.includes(n.toLowerCase()));

    if (missingNames.length > 0) {
      const newTags = missingNames.map(name => {
        let category: 'character' | 'copyright' | 'artist' | 'general' | 'meta' = 'general';
        const lowerName = name.toLowerCase();
        if (lowerName.endsWith('_maid') || lowerName.includes('miku') || lowerName.includes('asuka') || lowerName.includes('girl')) {
          category = 'character';
        } else if (lowerName.includes('vocaloid') || lowerName.includes('cyberpunk') || lowerName.includes('original')) {
          category = 'copyright';
        } else if (lowerName.endsWith('_art') || lowerName.includes('shinkai') || lowerName.includes('wlop')) {
          category = 'artist';
        } else if (lowerName.includes('highres') || lowerName.includes('wallpaper')) {
          category = 'meta';
        }
        return { name, category, count: 1 };
      });
      tags = [...tags, ...newTags];
      localStorage.setItem('SUGULE_LOCAL_TAGS', JSON.stringify(tags));
    }
  }

  private addCommentToLocal(comment: Comment) {
    const comments = this.getLocalCommentsList();
    const updated = [...comments.filter(c => c.id !== comment.id), comment];
    localStorage.setItem('SUGULE_LOCAL_COMMENTS', JSON.stringify(updated));
  }

  private updatePostScoreLocally(postId: string, scoreOrDelta: number, isDelta = false): number {
    const local = localStorage.getItem('SUGULE_LOCAL_POSTS');
    let posts = INITIAL_POSTS;
    if (local) {
      try {
        posts = JSON.parse(local);
      } catch {
        posts = INITIAL_POSTS;
      }
    }

    let finalScore = scoreOrDelta;
    posts = posts.map(p => {
      if (p.id === postId) {
        const calculated = isDelta ? (p.score || 0) + scoreOrDelta : scoreOrDelta;
        finalScore = calculated;
        return { ...p, score: calculated };
      }
      return p;
    });

    localStorage.setItem('SUGULE_LOCAL_POSTS', JSON.stringify(posts));
    return finalScore;
  }

  private updatePostTagsLocally(postId: string, tags: string[]) {
    this.updatePostLocally(postId, { tags });
  }

  private updatePostLocally(postId: string, fields: Partial<Post>) {
    const local = localStorage.getItem('SUGULE_LOCAL_POSTS');
    let posts = INITIAL_POSTS;
    if (local) {
      try {
        posts = JSON.parse(local);
      } catch {
        posts = INITIAL_POSTS;
      }
    }

    posts = posts.map(p => {
      if (p.id === postId) {
        return { ...p, ...fields };
      }
      return p;
    });

    localStorage.setItem('SUGULE_LOCAL_POSTS', JSON.stringify(posts));
  }

  // --- ARTIFACT FILE UPLOAD (PROXIED TO NODE BACKEND) ---
  public async uploadFile(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'png';
    const randomId = Math.random().toString(36).substring(2, 11);
    const fileName = `${Date.now()}_${randomId}.${fileExt}`;

    try {
      console.log('Proxying file upload to secure backend Express proxy...');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-file-name': encodeURIComponent(fileName),
          'Content-Type': 'application/octet-stream'
        },
        body: file
      });

      if (!response.ok) {
        throw new Error(await response.text() || 'Backend proxy upload failure.');
      }

      const resJson = await response.json();
      if (resJson && resJson.url) {
        console.log('Proxy upload succeeded. File URL:', resJson.url);
        return resJson.url;
      }
      throw new Error('No public URL returned from upload server.');
    } catch (localErr: any) {
      console.error('Fatal proxy upload failure, fallback is impossible:', localErr);
      throw new Error(`Ошибка сохранения: ${localErr.message || 'не удалось записать файл'}`);
    }
  }

  // --- GETTERS ---
  
  public async getPosts(): Promise<Post[]> {
    try {
      const response = await fetch('/api/posts');
      if (!response.ok) throw new Error('API error');
      const posts = await response.json() as Post[];
      localStorage.setItem('SUGULE_LOCAL_POSTS', JSON.stringify(posts));
      return posts;
    } catch (e) {
      console.warn('Backend proxy fetch posts failed, loading from offline cache:', e);
      const local = localStorage.getItem('SUGULE_LOCAL_POSTS');
      if (local) {
        try { return JSON.parse(local); } catch { return INITIAL_POSTS; }
      }
      return INITIAL_POSTS;
    }
  }

  public async getTags(): Promise<Tag[]> {
    try {
      const response = await fetch('/api/tags');
      if (!response.ok) throw new Error('API error');
      const tags = await response.json() as Tag[];
      localStorage.setItem('SUGULE_LOCAL_TAGS', JSON.stringify(tags));
      return tags;
    } catch (e) {
      console.warn('Backend proxy fetch tags failed, loading from offline cache:', e);
      const local = localStorage.getItem('SUGULE_LOCAL_TAGS');
      if (local) {
        try { return JSON.parse(local); } catch { return INITIAL_TAGS; }
      }
      return INITIAL_TAGS;
    }
  }

  public async getComments(postId: string): Promise<Comment[]> {
    try {
      const response = await fetch(`/api/comments/${postId}`);
      if (!response.ok) throw new Error('API error');
      const comments = await response.json() as Comment[];

      // Sync offline comments cache
      const localComments = this.getLocalCommentsList();
      const filtered = localComments.filter(c => c.post_id !== postId);
      const merged = [...filtered, ...comments];
      localStorage.setItem('SUGULE_LOCAL_COMMENTS', JSON.stringify(merged));

      return comments;
    } catch (e) {
      console.warn('Backend proxy fetch comments failed, loading from offline cache:', e);
      const localComments = this.getLocalCommentsList();
      return localComments.filter(c => c.post_id === postId);
    }
  }

  public async getFavorites(): Promise<string[]> {
    try {
      const favs = localStorage.getItem('SUGULE_FAVORITES');
      return favs ? JSON.parse(favs) : [];
    } catch {
      return [];
    }
  }

  public async toggleFavorite(postId: string): Promise<boolean> {
    try {
      const prev = await this.getFavorites();
      const index = prev.indexOf(postId);
      let added = false;
      if (index === -1) {
        prev.push(postId);
        added = true;
      } else {
        prev.splice(index, 1);
      }
      localStorage.setItem('SUGULE_FAVORITES', JSON.stringify(prev));
      return added;
    } catch {
      return false;
    }
  }

  // --- SETTERS ---

  public async createPost(post: Omit<Post, 'elo' | 'score'> & { score?: number; elo?: number }): Promise<Post> {
    const postToInsert = {
      ...post,
      score: post.score || 1,
      elo: post.elo || 1500
    };

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postToInsert)
      });
      if (!response.ok) throw new Error('API create post failed');
      const inserted = await response.json() as Post;
      this.addPostToLocal(inserted);
      return inserted;
    } catch (e) {
      console.warn('Backend proxy create post failed, saving in local offline backup:', e);
      this.addPostToLocal(postToInsert as Post);
      this.ensureTagsExistLocally(post.tags);
      return postToInsert as Post;
    }
  }

  public async createComment(comment: Comment): Promise<Comment> {
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comment)
      });
      if (!response.ok) throw new Error('API comment create failed');
      const inserted = await response.json() as Comment;
      this.addCommentToLocal(inserted);
      return inserted;
    } catch (e) {
      console.warn('Backend proxy create comment failed, saving in local offline backup:', e);
      this.addCommentToLocal(comment);
      return comment;
    }
  }

  public async votePost(postId: string, scoreDelta: number): Promise<number> {
    try {
      const response = await fetch(`/api/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoreDelta })
      });
      if (!response.ok) throw new Error('API vote failed');
      const { score } = await response.json();
      this.updatePostScoreLocally(postId, score);
      return score;
    } catch (e) {
      console.warn('Backend proxy vote failed, falling back to local offline backup score modification:', e);
      return this.updatePostScoreLocally(postId, scoreDelta, true);
    }
  }

  public async updatePostTags(postId: string, tags: string[]): Promise<void> {
    try {
      const response = await fetch(`/api/posts/${postId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags })
      });
      if (!response.ok) throw new Error('API tag update failed');
      this.updatePostTagsLocally(postId, tags);
    } catch (e) {
      console.warn('Backend proxy tag update failed, saving in local offline backup:', e);
      this.updatePostTagsLocally(postId, tags);
      this.ensureTagsExistLocally(tags);
    }
  }

  public async updatePost(postId: string, fields: Partial<Post>): Promise<void> {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      if (!response.ok) throw new Error('API post update failed');
      this.updatePostLocally(postId, fields);
    } catch (e) {
      console.warn('Backend proxy post update failed, saving in local offline backup:', e);
      this.updatePostLocally(postId, fields);
      if (fields.tags) {
        this.ensureTagsExistLocally(fields.tags);
      }
    }
  }

  public async saveTag(name: string, category: 'character' | 'copyright' | 'artist' | 'general' | 'meta'): Promise<Tag> {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category })
      });
      if (!response.ok) throw new Error('API save tag failed');
      const tagObj = await response.json() as Tag;
      
      // Sync local cache
      const local = localStorage.getItem('SUGULE_LOCAL_TAGS');
      let tags = INITIAL_TAGS;
      if (local) {
        try { tags = JSON.parse(local); } catch { tags = INITIAL_TAGS; }
      }
      const filtered = tags.filter(t => t.name.toLowerCase() !== tagObj.name.toLowerCase());
      const updated = [...filtered, tagObj];
      localStorage.setItem('SUGULE_LOCAL_TAGS', JSON.stringify(updated));
      
      return tagObj;
    } catch (e) {
      console.warn('Backend proxy saveTag failed, saving internally in offline cache:', e);
      const cleanName = name.trim().toLowerCase().replace(/\s+/g, '_');
      const tagObj: Tag = { name: cleanName, category, count: 1 };
      
      const local = localStorage.getItem('SUGULE_LOCAL_TAGS');
      let tags = INITIAL_TAGS;
      if (local) {
        try { tags = JSON.parse(local); } catch { tags = INITIAL_TAGS; }
      }
      const filtered = tags.filter(t => t.name.toLowerCase() !== cleanName);
      const updated = [...filtered, tagObj];
      localStorage.setItem('SUGULE_LOCAL_TAGS', JSON.stringify(updated));
      return tagObj;
    }
  }

  public async deletePost(postId: string): Promise<void> {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('API delete post failed');
    } catch (e) {
      console.warn('Backend proxy delete post failed, removing locally only:', e);
    }

    // Delete from offline LocalStorage backing
    const local = localStorage.getItem('SUGULE_LOCAL_POSTS');
    if (local) {
      try {
        const posts = JSON.parse(local) as Post[];
        const filtered = posts.filter(p => p.id !== postId);
        localStorage.setItem('SUGULE_LOCAL_POSTS', JSON.stringify(filtered));
      } catch {
        // Ignore
      }
    }

    const favs = localStorage.getItem('SUGULE_FAVORITES');
    if (favs) {
      try {
        const favorites = JSON.parse(favs) as string[];
        const filtered = favorites.filter(id => id !== postId);
        localStorage.setItem('SUGULE_FAVORITES', JSON.stringify(filtered));
      } catch {
        // Ignore
      }
    }
  }

  public getSqlInstructions(): string {
    return ``;
  }
}

export const dbManager = new SuguleDatabaseManager();
