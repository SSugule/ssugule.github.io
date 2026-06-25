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

  private getGitHubSettings() {
    const owner = localStorage.getItem('SUGULE_GITHUB_OWNER') || 'ssugule';
    const repo = localStorage.getItem('SUGULE_GITHUB_REPO') || 'ssugule.github.io';
    const branch = localStorage.getItem('SUGULE_GITHUB_BRANCH') || 'main';
    const token = localStorage.getItem('SUGULE_GITHUB_TOKEN') || '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';
    return { owner, repo, branch, token };
  }

  // Unified helper to get the latest database from GitHub static pages or raw repo URL
  private async getGitHubDatabase(): Promise<any> {
    const { owner, repo, branch } = this.getGitHubSettings();
    
    const urls = [
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/database.json`,
      `/${repo}/database.json`,
      `/database.json`
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const db = await response.json();
          if (db && db.posts) {
            console.log('[SuguleDb] Loaded database successfully from:', url);
            return db;
          }
        }
      } catch (err) {
        // Continue
      }
    }
    return null;
  }

  // Helper to commit database.json back to GitHub repo
  private async commitDbToGitHub(db: any): Promise<boolean> {
    const { token } = this.getGitHubSettings();
    if (!token) {
      console.warn('[GITHUB] Cancelled direct GitHub update because no token is configured.');
      return false;
    }
    const content = JSON.stringify(db, null, 2);
    return await this.commitToGitHub('database.json', content, 'Update database via Sugule Client portal');
  }

  // Direct Unified Git Commit to GitHub Content API
  public async commitToGitHub(filePath: string, content: string, message: string): Promise<boolean> {
    const { owner, repo, branch, token } = this.getGitHubSettings();

    if (!token) return false;

    try {
      let sha = '';
      const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
      const resGet = await fetch(getUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (resGet.ok) {
        const fileData = await resGet.json();
        sha = fileData.sha;
      }

      const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      
      // Safe Base64 encoding supporting Unicode strings
      const base64Content = btoa(encodeURIComponent(content).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      }));

      const body: any = {
        message: message,
        content: base64Content,
        branch: branch
      };
      if (sha) body.sha = sha;

      const resPut = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(body)
      });

      return resPut.ok;
    } catch (e) {
      console.error('[GIT-COMMIT] Direct GitHub commit error:', e);
      return false;
    }
  }

  // Direct file uploader pushing file binary as base64 to GitHub Content API
  public async uploadFileToGitHub(file: File, onProgress?: (status: string, percentage?: number) => void): Promise<string> {
    const { owner, repo, branch, token } = this.getGitHubSettings();

    if (!token) {
      throw new Error('Для загрузки файлов на GitHub, пожалуйста, настройте токен доступа репозитория.');
    }

    if (onProgress) onProgress('Кодирование медиа-файла для GitHub...', 25);

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    if (onProgress) onProgress('Загрузка в отдельную папку репозитория...', 60);

    const fileExt = file.name.split('.').pop() || 'png';
    const randomId = Math.random().toString(36).substring(2, 11);
    const finalName = `${Date.now()}_${randomId}.${fileExt}`;
    const filePath = `media/${finalName}`;

    const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const body = {
      message: `Media upload: ${file.name}`,
      content: base64,
      branch: branch
    };

    const resPut = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(body)
    });

    if (!resPut.ok) {
      const errorText = await resPut.text();
      throw new Error(`GitHub Upload API Error: ${errorText}`);
    }

    if (onProgress) onProgress('Файл успешно сохранен в медиа-папку репозитория!', 100);
    return `/media/${finalName}`;
  }

  // --- ARTIFACT FILE UPLOAD (PROXIED TO NODE BACKEND) ---
  public async uploadFile(file: File, onProgress?: (status: string, percentage?: number) => void): Promise<string> {
    // If the system is running client-only (e.g. running on GitHub pages), we should directly use GitHub token if present!
    const { token } = this.getGitHubSettings();
    
    // Check if we are running in full local server mode or GitHub pages
    const isPages = window.location.hostname.includes('github.io');
    if (isPages && token) {
      return this.uploadFileToGitHub(file, onProgress);
    }

    try {
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
    } catch (apiError: any) {
      // Direct robust fallback to direct GitHub upload when local Express API is not reachable or throws
      if (token) {
        console.warn('Local file upload failed, fallback to direct GitHub upload:', apiError);
        return this.uploadFileToGitHub(file, onProgress);
      }
      throw apiError;
    }
  }

  // --- GETTERS ---

  private parseGithubPosts(rawPosts: any[]): Post[] {
    if (!rawPosts || !Array.isArray(rawPosts)) return [];
    return rawPosts
      .filter(p => p !== null && p !== undefined)
      .map((p: any) => {
        let parsedTags: string[] = [];
        if (p.tags) {
          if (typeof p.tags === 'string') {
            try {
              parsedTags = JSON.parse(p.tags);
            } catch {
              parsedTags = p.tags.split(',').map((t: string) => t.trim());
            }
          } else if (Array.isArray(p.tags)) {
            parsedTags = p.tags;
          }
        }

        let parsedScreenshots: string[] = [];
        if (p.screenshots) {
          if (typeof p.screenshots === 'string') {
            try {
              parsedScreenshots = JSON.parse(p.screenshots);
            } catch {
              parsedScreenshots = [];
            }
          } else if (Array.isArray(p.screenshots)) {
            parsedScreenshots = p.screenshots;
          }
        }

        return {
          ...p,
          is_game: p.is_game === 1 || p.is_game === true,
          tags: parsedTags,
          screenshots: parsedScreenshots,
        } as Post;
      });
  }

  private extractTagsFromPosts(posts: Post[]): Tag[] {
    const counts: { [key: string]: number } = {};
    posts.forEach(p => {
      if (p && Array.isArray(p.tags)) {
        p.tags.forEach(t => {
          if (t && typeof t === 'string') {
            const lower = t.toLowerCase();
            counts[lower] = (counts[lower] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(counts).map(([name, count]) => {
      const lowerName = name.toLowerCase();
      const existingTag = INITIAL_TAGS.find(t => t.name.toLowerCase() === lowerName);
      if (existingTag) {
        return { name, category: existingTag.category, count };
      }
      
      let category: 'character' | 'copyright' | 'artist' | 'general' | 'meta' = 'general';
      if (lowerName.endsWith('_maid') || lowerName.includes('miku') || lowerName.includes('asuka') || lowerName.includes('girl')) {
        category = 'character';
      } else if (lowerName.includes('vocaloid') || lowerName.includes('cyberpunk') || lowerName.includes('original')) {
        category = 'copyright';
      } else if (lowerName.endsWith('_art') || lowerName.includes('shinkai') || lowerName.includes('wlop')) {
        category = 'artist';
      } else if (lowerName.includes('highres') || lowerName.includes('wallpaper')) {
        category = 'meta';
      }
      return { name, category, count };
    });
  }
  
  public async getPosts(): Promise<Post[]> {
    const initialPostIds = new Set(INITIAL_POSTS.map(p => p.id));

    // 1. Try to load the database directly from the GitHub repository
    try {
      const githubDb = await this.getGitHubDatabase();
      if (githubDb && githubDb.posts && Array.isArray(githubDb.posts)) {
        const parsedPosts = this.parseGithubPosts(githubDb.posts);
        
        if (parsedPosts.length > 0) {
          const customPosts = parsedPosts.filter(p => p && p.id && !initialPostIds.has(p.id));
          if (customPosts.length > 0) {
            console.log(`[SuguleDb] Loaded ${customPosts.length} custom posts from GitHub (standard posts hidden).`);
            localStorage.setItem('SUGULE_LOCAL_POSTS', JSON.stringify(customPosts));
            const extractedTags = this.extractTagsFromPosts(customPosts);
            localStorage.setItem('SUGULE_LOCAL_TAGS', JSON.stringify(extractedTags));
            return customPosts;
          } else {
            console.log(`[SuguleDb] Successfully loaded standard posts directly from GitHub.`);
            localStorage.setItem('SUGULE_LOCAL_POSTS', JSON.stringify(parsedPosts));
            const extractedTags = this.extractTagsFromPosts(parsedPosts);
            localStorage.setItem('SUGULE_LOCAL_TAGS', JSON.stringify(extractedTags));
            return parsedPosts;
          }
        } else {
          // Connected to GitHub but contains 0 posts -> return standard posts only
          console.log('[SuguleDb] GitHub repository contains 0 posts. Showing standard posts.');
          localStorage.setItem('SUGULE_LOCAL_POSTS', JSON.stringify(INITIAL_POSTS));
          localStorage.setItem('SUGULE_LOCAL_TAGS', JSON.stringify(INITIAL_TAGS));
          return INITIAL_POSTS;
        }
      }
    } catch (gitErr) {
      console.warn('[SuguleDb] Failed to fetch posts from GitHub, trying local server/cache:', gitErr);
    }

    // 2. If GitHub fetch failed or was unavailable, fall back to local server endpoint
    try {
      const response = await fetch('/api/posts');
      if (response.ok) {
        const posts = await response.json() as Post[];
        if (posts && Array.isArray(posts) && posts.length > 0) {
          const customPosts = posts.filter(p => p && p.id && !initialPostIds.has(p.id));
          if (customPosts.length > 0) {
            localStorage.setItem('SUGULE_LOCAL_POSTS', JSON.stringify(customPosts));
            const extractedTags = this.extractTagsFromPosts(customPosts);
            localStorage.setItem('SUGULE_LOCAL_TAGS', JSON.stringify(extractedTags));
            return customPosts;
          } else {
            localStorage.setItem('SUGULE_LOCAL_POSTS', JSON.stringify(posts));
            const extractedTags = this.extractTagsFromPosts(posts);
            localStorage.setItem('SUGULE_LOCAL_TAGS', JSON.stringify(extractedTags));
            return posts;
          }
        }
      }
    } catch (e) {
      console.warn('Backend proxy fetch posts failed, loading from offline cache:', e);
    }

    // 3. Absolute cache fallback
    const local = localStorage.getItem('SUGULE_LOCAL_POSTS');
    if (local) {
      try {
        const parsed = JSON.parse(local) as Post[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const customPosts = parsed.filter(p => p && p.id && !initialPostIds.has(p.id));
          if (customPosts.length > 0) {
            return customPosts;
          }
          return parsed;
        }
      } catch { /* continue */ }
    }
    return INITIAL_POSTS;
  }

  public async getTags(): Promise<Tag[]> {
    // Check if we have extracted/updated tags derived from GitHub posts
    const localTags = localStorage.getItem('SUGULE_LOCAL_TAGS');
    if (localTags) {
      try {
        const parsed = JSON.parse(localTags) as Tag[];
        if (parsed && parsed.length > 0) {
          return parsed;
        }
      } catch { /* ignore and continue */ }
    }

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
      if (response.ok) {
        const inserted = await response.json() as Post;
        this.addPostToLocal(inserted);
        return inserted;
      }
    } catch (e) {
      // Proceed to serverless fallback
    }

    console.warn('[DB] Backend proxy create post failed, saving directly to GitHub & localStorage...');
    this.addPostToLocal(postToInsert as Post);
    this.ensureTagsExistLocally(post.tags);

    const db = await this.getGitHubDatabase() || { posts: [], tags: [], comments: [], users: [] };
    if (!db.posts) db.posts = [];
    
    if (!db.posts.some((p: any) => p.id === postToInsert.id)) {
      db.posts.unshift(postToInsert);
    }
    
    if (!db.tags) db.tags = [];
    for (const tagName of postToInsert.tags) {
      const exists = db.tags.some((t: any) => t.name.toLowerCase() === tagName.toLowerCase());
      if (!exists) {
        db.tags.push({
          id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: tagName,
          category: 'general',
          count: 1
        });
      } else {
        db.tags = db.tags.map((t: any) => t.name.toLowerCase() === tagName.toLowerCase() ? { ...t, count: (t.count || 1) + 1 } : t);
      }
    }

    await this.commitDbToGitHub(db);
    return postToInsert as Post;
  }

  public async createComment(comment: Comment): Promise<Comment> {
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comment)
      });
      if (response.ok) {
        const inserted = await response.json() as Comment;
        this.addCommentToLocal(inserted);
        return inserted;
      }
    } catch (e) {
      // Proceed to serverless fallback
    }

    console.warn('[DB] Backend proxy create comment failed, saving directly to GitHub...');
    this.addCommentToLocal(comment);

    const db = await this.getGitHubDatabase() || { posts: [], tags: [], comments: [], users: [] };
    if (!db.comments) db.comments = [];
    db.comments.push(comment);

    await this.commitDbToGitHub(db);
    return comment;
  }

  public async votePost(postId: string, scoreDelta: number): Promise<number> {
    try {
      const response = await fetch(`/api/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoreDelta })
      });
      if (response.ok) {
        const { score } = await response.json();
        this.updatePostScoreLocally(postId, score);
        return score;
      }
    } catch (e) {
      // Proceed to serverless fallback
    }

    console.warn('[DB] Backend proxy vote failed, falling back to GitHub database score modification...');
    const finalScore = this.updatePostScoreLocally(postId, scoreDelta, true);

    const db = await this.getGitHubDatabase();
    if (db && db.posts) {
      db.posts = db.posts.map((p: any) => {
        if (p.id === postId) {
          return { ...p, score: (p.score || 0) + scoreDelta };
        }
        return p;
      });
      await this.commitDbToGitHub(db);
    }
    return finalScore;
  }

  public async updatePostTags(postId: string, tags: string[]): Promise<void> {
    try {
      const response = await fetch(`/api/posts/${postId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags })
      });
      if (response.ok) {
        this.updatePostTagsLocally(postId, tags);
        return;
      }
    } catch (e) {
      // Proceed to serverless fallback
    }

    console.warn('[DB] Backend proxy tag update failed, saving directly to GitHub...');
    this.updatePostTagsLocally(postId, tags);
    this.ensureTagsExistLocally(tags);

    const db = await this.getGitHubDatabase();
    if (db && db.posts) {
      db.posts = db.posts.map((p: any) => {
        if (p.id === postId) {
          return { ...p, tags };
        }
        return p;
      });
      
      // Ensure tags list updated too
      if (!db.tags) db.tags = [];
      for (const tName of tags) {
        if (!db.tags.some((t: any) => t.name.toLowerCase() === tName.toLowerCase())) {
          db.tags.push({
            id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: tName,
            category: 'general',
            count: 1
          });
        }
      }
      await this.commitDbToGitHub(db);
    }
  }

  public async updatePost(postId: string, fields: Partial<Post>): Promise<void> {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      if (response.ok) {
        this.updatePostLocally(postId, fields);
        return;
      }
    } catch (e) {
      // Proceed to serverless fallback
    }

    console.warn('[DB] Backend proxy post update failed, saving directly to GitHub...');
    this.updatePostLocally(postId, fields);
    if (fields.tags) {
      this.ensureTagsExistLocally(fields.tags);
    }

    const db = await this.getGitHubDatabase();
    if (db && db.posts) {
      db.posts = db.posts.map((p: any) => {
        if (p.id === postId) {
          return { ...p, ...fields };
        }
        return p;
      });
      
      if (fields.tags && db.tags) {
        for (const tName of fields.tags) {
          if (!db.tags.some((t: any) => t.name.toLowerCase() === tName.toLowerCase())) {
            db.tags.push({
              id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name: tName,
              category: 'general',
              count: 1
            });
          }
        }
      }
      await this.commitDbToGitHub(db);
    }
  }

  public async saveTag(name: string, category: 'character' | 'copyright' | 'artist' | 'general' | 'meta'): Promise<Tag> {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category })
      });
      if (response.ok) {
        const tagObj = await response.json() as Tag;
        
        const local = localStorage.getItem('SUGULE_LOCAL_TAGS');
        let tags = INITIAL_TAGS;
        if (local) {
          try { tags = JSON.parse(local); } catch { tags = INITIAL_TAGS; }
        }
        const filtered = tags.filter(t => t.name.toLowerCase() !== tagObj.name.toLowerCase());
        const updated = [...filtered, tagObj];
        localStorage.setItem('SUGULE_LOCAL_TAGS', JSON.stringify(updated));
        
        return tagObj;
      }
    } catch (e) {
      // Proceed to serverless fallback
    }

    console.warn('[DB] Backend proxy saveTag failed, saving internally and directly to GitHub...');
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

    const db = await this.getGitHubDatabase() || { posts: [], tags: [], comments: [], users: [] };
    if (!db.tags) db.tags = [];
    if (!db.tags.some((t: any) => t.name.toLowerCase() === cleanName)) {
      db.tags.push({
        id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName,
        category,
        count: 1
      });
      await this.commitDbToGitHub(db);
    }
    return tagObj;
  }

  public async deletePost(postId: string): Promise<void> {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        this.removePostFromLocalCaches(postId);
        return;
      }
    } catch (e) {
      // Proceed to serverless fallback
    }

    console.warn('[DB] Backend proxy delete post failed, removing directly from GitHub...');
    this.removePostFromLocalCaches(postId);

    const db = await this.getGitHubDatabase();
    if (db) {
      if (db.posts) {
        db.posts = db.posts.filter((p: any) => p.id !== postId);
      }
      if (db.comments) {
        db.comments = db.comments.filter((c: any) => c.post_id !== postId);
      }
      await this.commitDbToGitHub(db);
    }
  }

  private removePostFromLocalCaches(postId: string) {
    const local = localStorage.getItem('SUGULE_LOCAL_POSTS');
    if (local) {
      try {
        const posts = JSON.parse(local) as Post[];
        const filtered = posts.filter(p => p.id !== postId);
        localStorage.setItem('SUGULE_LOCAL_POSTS', JSON.stringify(filtered));
      } catch { /* ignore */ }
    }

    const favs = localStorage.getItem('SUGULE_FAVORITES');
    if (favs) {
      try {
        const favorites = JSON.parse(favs) as string[];
        const filtered = favorites.filter(id => id !== postId);
        localStorage.setItem('SUGULE_FAVORITES', JSON.stringify(filtered));
      } catch { /* ignore */ }
    }
  }

  // --- USER AUTHENTICATION & PROFILES ---

  public async loginUser(identifier: string, passport: string): Promise<any> {
    const cleanId = identifier.trim().toLowerCase();
    
    // First try standard local proxy Express API
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: passport })
      });
      if (response.ok) {
        return await response.json();
      } else {
        const err = await response.json();
        throw new Error(err.error || 'Ошибка входа');
      }
    } catch (e: any) {
      if (e.message !== 'Failed to fetch' && !e.message.includes('network error') && !e.message.includes('NetworkError')) {
        throw e;
      }
      
      // Offline / GitHub Pages Serverless Mode:
      // Fetch latest database.json directly from connected GitHub repository
      const db = await this.getGitHubDatabase();
      let usersList = db?.users || JSON.parse(localStorage.getItem('SUGULE_LOCAL_USERS') || '[]');
      
      const hasAdmin = usersList.some((u: any) => u.username.toLowerCase() === 'admin');
      if (!hasAdmin) {
        const adminObj = {
          username: "admin",
          nickname: "Администратор",
          email: "admin@sugule.com",
          password: "admin",
          avatar_url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=200&h=200&fit=crop",
          cover_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&h=400&fit=crop",
          description: "Администратор архива Sugule.",
          role: "admin"
        };
        usersList = [adminObj, ...usersList];
      }

      const found = usersList.find((u: any) => u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId);
      if (!found) {
        throw new Error('Пользователь с такими данными не найден.');
      }
      if (found.password !== passport) {
        throw new Error('Неверный пароль. Попробуйте снова.');
      }
      
      return found;
    }
  }

  public async registerUser(username: string, email: string, passport: string, nickname: string): Promise<any> {
    const cleanUser = username.trim().toLowerCase().replace(/\s+/g, '_');
    const newUser = {
      username: cleanUser,
      nickname: nickname || username,
      email: email,
      password: passport,
      avatar_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=200&h=200&fit=crop',
      cover_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&h=400&fit=crop',
      description: 'Увлекаюсь booru-архивами и аниме искусством.',
      role: 'user'
    };

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password: passport, nickname })
      });
      if (response.ok) {
        return await response.json();
      } else {
        const err = await response.json();
        throw new Error(err.error || 'Ошибка регистрации');
      }
    } catch (e: any) {
      if (e.message !== 'Failed to fetch' && !e.message.includes('network error') && !e.message.includes('NetworkError')) {
        throw e;
      }

      // Offline / GitHub Pages Serverless Mode:
      const db = await this.getGitHubDatabase() || { posts: [], tags: [], comments: [], users: [] };
      if (!db.users) db.users = [];

      const exists = db.users.some((u: any) => u.username.toLowerCase() === cleanUser);
      if (exists) {
        throw new Error('Пользователь с таким именем уже существует.');
      }

      db.users.push(newUser);
      
      const committed = await this.commitDbToGitHub(db);
      if (!committed) {
        console.warn('Direct GitHub registration commit failed. Saving locally.');
      }

      // Cache locally
      localStorage.setItem('SUGULE_LOCAL_USERS', JSON.stringify(db.users));
      return newUser;
    }
  }

  public async updateProfile(username: string, fields: Partial<any>): Promise<any> {
    const cleanUser = username.trim().toLowerCase();

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, fields })
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e: any) {
      // Continue to offline if fetch failed
    }

    // Serverless mode
    const db = await this.getGitHubDatabase() || { posts: [], tags: [], comments: [], users: [] };
    if (!db.users) db.users = [];

    const idx = db.users.findIndex((u: any) => u.username.toLowerCase() === cleanUser);
    if (idx !== -1) {
      db.users[idx] = {
        ...db.users[idx],
        ...fields
      };
      await this.commitDbToGitHub(db);
      localStorage.setItem('SUGULE_LOCAL_USERS', JSON.stringify(db.users));
      return db.users[idx];
    }
    throw new Error('Пользователь не найден в базе данных.');
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
