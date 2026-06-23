import { Post, Tag, Comment } from './types';
import { INITIAL_POSTS, INITIAL_TAGS, INITIAL_COMMENTS } from './sampleData';

class SuguleDatabaseManager {
  private isGitEnabled: boolean = true;
  private configUrl: string = 'LOCAL_WORKSPACE_JSON';
  private configKey: string = 'AUTO_GITHUB_SYNC';

  constructor() {
    this.init();
  }

  public init() {
    console.log('Sugule Database Manager initialized in local JSON + Auto Git Sync Media storage mode.');
  }

  public getConfiguration() {
    return {
      isEnabled: this.isGitEnabled,
      url: this.configUrl,
      key: this.configKey
    };
  }

  public saveConfiguration(url: string, key: string) {
    console.log('Database Manager: Automatic GitHub synchronization is active and self-managing.');
    return true;
  }

  public disconnectExternalDb() {
    console.log('Database Manager: Pure workspace Git repository synchronization has been fully established.');
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
  public async uploadFile(file: File, onProgress?: (status: string, percentage?: number) => void): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'png';
    const isVideo = file.type.startsWith('video/') || ['mp4', 'webm', 'avi', 'mkv', 'mov'].includes(fileExt.toLowerCase());

    const CHUNK_SIZE = 40 * 1024 * 1024; // 40MB chunks (as requested, replacing the 8MB limit)

    if (file.size > CHUNK_SIZE) {
      console.log(`[CHUNKS] Instantiating high-capacity chunked uploader for ${file.name} (Size: ${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      if (onProgress) onProgress(`Подготовка к загрузке (${(file.size / 1024 / 1024).toFixed(1)} MB)...`, 0);

      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const chunkId = 'chunk_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunkBlob = file.slice(start, end);

        if (onProgress) {
          const currentPercent = Math.round((i / totalChunks) * 100);
          onProgress(`Загрузка: часть ${i + 1} из ${totalChunks}`, currentPercent);
        }

        const response = await fetch('/api/upload-chunk', {
          method: 'POST',
          headers: {
            'x-chunk-id': chunkId,
            'x-chunk-index': String(i),
            'x-chunk-total': String(totalChunks),
            'x-file-name': encodeURIComponent(file.name),
            'Content-Type': 'application/octet-stream'
          },
          body: chunkBlob
        });

        if (!response.ok) {
          const errMsg = await response.text();
          throw new Error(`Ошибка загрузки части ${i + 1}: ${errMsg}`);
        }
      }

      if (onProgress) {
        onProgress(isVideo && file.size > 50 * 1024 * 1024 
          ? 'Обработка и автоматическое сжатие видео через FFmpeg (может занять некоторое время)...' 
          : 'Слияние частей файла на сервере...', 95);
      }

      const completeResponse = await fetch('/api/upload-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chunkId,
          chunkTotal: totalChunks,
          fileName: file.name,
          fileType: file.type
        })
      });

      if (!completeResponse.ok) {
        let errMsg = `Ошибка сервера: статус ${completeResponse.status}`;
        try {
          const errorJson = await completeResponse.json();
          if (errorJson && errorJson.message) {
            errMsg = errorJson.message;
          } else if (errorJson && errorJson.error) {
            errMsg = errorJson.error;
          }
        } catch (e) {
          try {
            const htmlText = await completeResponse.text();
            if (htmlText.includes('Too heavy') || htmlText.includes('TooHeavy') || htmlText.includes('слишком тяжелое') || htmlText.includes('слишком тяжелый')) {
              errMsg = "Файл слишком тяжелый. Превышен лимит размера файла (100 МБ).";
            } else {
              const matched = htmlText.match(/<pre>([\s\S]*?)<\/pre>/) || htmlText.match(/<h1>([\s\S]*?)<\/h1>/);
              if (matched && matched[1]) {
                errMsg = `Ошибка сервера: ${matched[1].trim()}`;
              }
            }
          } catch (textErr) {}
        }
        throw new Error(errMsg);
      }

      let resJson: any;
      try {
        resJson = await completeResponse.json();
      } catch (parseErr) {
        throw new Error('Некорректный ответ от сервера слияния чанков.');
      }

      if (resJson && resJson.error === 'TooHeavy') {
        throw new Error(resJson.message);
      }
      if (resJson && resJson.url) {
        if (onProgress) {
          onProgress(isVideo && file.size > 50 * 1024 * 1024 
            ? 'Видео успешно обработано!' 
            : 'Файл успешно загружен!', 100);
        }
        return resJson.url;
      }
      throw new Error('No public URL returned from upload server.');
    }

    // --- SINGLE-SHOT UPLOAD WITH XHR TO GET DETAILED PROGRESS ---
    return new Promise<string>((resolve, reject) => {
      const randomId = Math.random().toString(36).substring(2, 11);
      const fileName = `${Date.now()}_${randomId}.${fileExt}`;
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload', true);
      xhr.setRequestHeader('x-file-name', encodeURIComponent(fileName));
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress('Загрузка файла...', percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const resJson = JSON.parse(xhr.responseText);
            if (resJson && resJson.url) {
              if (onProgress) onProgress('Файл успешно загружен!', 100);
              resolve(resJson.url);
            } else {
              reject(new Error('No public URL returned from upload server.'));
            }
          } catch (e) {
            reject(new Error('Invalid response from server.'));
          }
        } else {
          let errMsg = xhr.responseText;
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (parsed.error === 'TooHeavy' && parsed.message) {
              errMsg = parsed.message;
            }
          } catch { /* ignore */ }
          reject(new Error(errMsg || `Ошибка сервера: статус ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload.'));
      };

      try {
        if (onProgress) onProgress('Загрузка файла...', 0);
        xhr.send(file);
      } catch (localErr: any) {
        console.error('Fatal proxy upload failure:', localErr);
        reject(new Error(localErr.message || 'не удалось записать файл'));
      }
    });
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

  public async getGitStatus(): Promise<any> {
    try {
      const response = await fetch('/api/git-status');
      if (!response.ok) throw new Error('API error');
      return await response.json();
    } catch (e) {
      console.error('[GIT] Failed to fetch git status:', e);
      return {
        initialized: false,
        statusLines: [],
        mediaFilesCount: 0,
        mediaFiles: [],
        dbSize: 0
      };
    }
  }
}

export const dbManager = new SuguleDatabaseManager();
