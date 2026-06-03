import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Post, Tag, Comment } from './types';
import { INITIAL_POSTS, INITIAL_TAGS, INITIAL_COMMENTS } from './sampleData';

class SuguleDatabaseManager {
  private client: SupabaseClient | null = null;
  private isSupabaseEnabled: boolean = false;
  private configUrl: string = '';
  private configKey: string = '';

  constructor() {
    this.init();
  }

  // Initialize client from env, localStorage, or automatic production fallbacks
  public init() {
    const defaultUrl = 'https://erularobdstwkqtfemwh.supabase.co';
    const defaultKey = 'sb_publishable_hu0N73F6z7RKD_-62Qlkew_IJFLSyYA';

    const envUrl = (
      typeof import.meta !== 'undefined' && (
        (import.meta as any).env?.VITE_SUPABASE_URL || 
        (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL
      ) || ''
    ).trim();

    const envKey = (
      typeof import.meta !== 'undefined' && (
        (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
        (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ) || ''
    ).trim();

    let localUrl = (localStorage.getItem('SUGULE_SUPABASE_URL') || '').trim();
    let localKey = (localStorage.getItem('SUGULE_SUPABASE_KEY') || '').trim();

    // Sanitize any corrupt/stale values stored in local storage
    if (localUrl === 'undefined' || localUrl === 'null' || (!localUrl.startsWith('http://') && !localUrl.startsWith('https://'))) {
      localUrl = '';
    }
    if (localKey === 'undefined' || localKey === 'null') {
      localKey = '';
    }

    let finalUrl = envUrl || localUrl || defaultUrl;
    let finalKey = envKey || localKey || defaultKey;

    // Double-check final URL before calling createClient to avoid crash
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = defaultUrl;
    }
    if (!finalKey) {
      finalKey = defaultKey;
    }

    if (finalUrl && finalKey) {
      try {
        this.client = createClient(finalUrl, finalKey, {
          auth: { persistSession: false }
        });
        this.isSupabaseEnabled = true;
        this.configUrl = finalUrl;
        this.configKey = finalKey;
        console.log('Sugule Database initialized with Supabase:', finalUrl);
      } catch (err) {
        console.error('Failed to initialize Supabase client:', err);
        this.isSupabaseEnabled = false;
        this.client = null;
      }
    } else {
      this.isSupabaseEnabled = false;
      this.client = null;
    }
  }

  public getConfiguration() {
    return {
      isEnabled: this.isSupabaseEnabled,
      url: this.configUrl,
      key: this.configKey
    };
  }

  public saveConfiguration(url: string, key: string) {
    localStorage.setItem('SUGULE_SUPABASE_URL', url.trim());
    localStorage.setItem('SUGULE_SUPABASE_KEY', key.trim());
    this.init();
    return this.isSupabaseEnabled;
  }

  public disconnectSupabase() {
    localStorage.removeItem('SUGULE_SUPABASE_URL');
    localStorage.removeItem('SUGULE_SUPABASE_KEY');
    this.isSupabaseEnabled = false;
    this.client = null;
    this.configUrl = '';
    this.configKey = '';
  }

  // Helper to prevent infinite hanging when Supabase server is unresponsive or dormant
  private async withTimeout<T = any>(promise: any, timeoutMs = 3500): Promise<any> {
    const wrappedPromise = Promise.resolve(promise);
    return new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('TIMEOUT'));
      }, timeoutMs);

      wrappedPromise.then(
        (res) => {
          clearTimeout(timer);
          resolve(res);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        }
      );
    });
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
        return { ...p, tags: tags };
      }
      return p;
    });

    localStorage.setItem('SUGULE_LOCAL_POSTS', JSON.stringify(posts));
  }

  // --- ARTIFACT FILE UPLOAD ---
  // Prioritize uploading directly and exclusively to Supabase Storage bucket 'media'
  // Fallback to local Express uploader ONLY if Supabase is unconfigured or encounters errors
  public async uploadFile(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'png';
    const randomId = Math.random().toString(36).substring(2, 11);
    const fileName = `${Date.now()}_${randomId}.${fileExt}`;
    const filePath = `${fileName}`;

    if (this.isSupabaseEnabled && this.client) {
      try {
        // Automatically try to create the public bucket "media" in case it's a fresh Supabase environment
        await this.client.storage.createBucket('media', { public: true }).catch(() => {});

        console.log('Uploading directly to Supabase storage bucket "media" first...', filePath);
        const { data, error } = await this.client.storage
          .from('media')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || undefined
          });

        if (error) {
          throw error;
        }

        const { data: publicUrlData } = this.client.storage
          .from('media')
          .getPublicUrl(filePath);

        if (!publicUrlData || !publicUrlData.publicUrl) {
          throw new Error('Не удалось получить публичную ссылку на загруженный файл.');
        }

        console.log('Successfully saved to Supabase Storage:', publicUrlData.publicUrl);
        return publicUrlData.publicUrl;
      } catch (supabaseErr: any) {
        console.warn('Supabase storage upload failed, attempting fallback to local Express uploader:', supabaseErr);
      }
    }

    // Fallback to local server upload in case Supabase is completely unconfigured or experiencing CORS/Network issues
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-file-name': encodeURIComponent(fileName),
          'Content-Type': 'application/octet-stream'
        },
        body: file
      });

      if (!response.ok) {
        throw new Error(await response.text() || 'Ошибка бэкенд-загрузчика.');
      }

      const resJson = await response.json();
      if (resJson && resJson.url) {
        console.log('File successfully uploaded to local Express backend fallback:', resJson.url);
        return resJson.url;
      }
      throw new Error('Локальный загрузчик не вернул URL.');
    } catch (localErr: any) {
      console.error('Fatal upload fallback failure:', localErr);
      throw new Error(`Ошибка загрузки: ${localErr.message || 'не удалось сохранить файл ни в Supabase Storage, ни локально'}`);
    }
  }

  // --- GETTERS ---
  
  public async getPosts(): Promise<Post[]> {
    if (this.isSupabaseEnabled && this.client) {
      try {
        const { data, error } = await this.withTimeout(
          this.client
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false }),
          3500
        );
        if (error) throw error;
        const posts = (data || []) as Post[];
        localStorage.setItem('SUGULE_LOCAL_POSTS', JSON.stringify(posts));
        return posts;
      } catch (e) {
        console.warn('Supabase fetch posts failed or timed out, loading from localStorage:', e);
      }
    }
    
    const local = localStorage.getItem('SUGULE_LOCAL_POSTS');
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        return INITIAL_POSTS;
      }
    }
    localStorage.setItem('SUGULE_LOCAL_POSTS', JSON.stringify(INITIAL_POSTS));
    return INITIAL_POSTS;
  }

  public async getTags(): Promise<Tag[]> {
    if (this.isSupabaseEnabled && this.client) {
      try {
        const { data, error } = await this.withTimeout(
          this.client.from('tags').select('*'),
          3500
        );
        if (error) throw error;
        const tags = (data || []) as Tag[];
        localStorage.setItem('SUGULE_LOCAL_TAGS', JSON.stringify(tags));
        return tags;
      } catch (e) {
        console.warn('Supabase fetch tags failed, loading from localStorage:', e);
      }
    }

    const local = localStorage.getItem('SUGULE_LOCAL_TAGS');
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        return INITIAL_TAGS;
      }
    }
    localStorage.setItem('SUGULE_LOCAL_TAGS', JSON.stringify(INITIAL_TAGS));
    return INITIAL_TAGS;
  }

  public async getComments(postId: string): Promise<Comment[]> {
    if (this.isSupabaseEnabled && this.client) {
      try {
        const { data, error } = await this.withTimeout(
          this.client
            .from('comments')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true }),
          3500
        );
        if (error) throw error;
        const comments = (data || []) as Comment[];
        
        // Dynamic merge comments local storage cache for maximum hybrid response
        const localComments = this.getLocalCommentsList();
        const filtered = localComments.filter(c => c.post_id !== postId);
        const merged = [...filtered, ...comments];
        localStorage.setItem('SUGULE_LOCAL_COMMENTS', JSON.stringify(merged));
        
        return comments;
      } catch (e) {
        console.warn('Supabase fetch comments failed, loading from localStorage:', e);
      }
    }

    const localComments = this.getLocalCommentsList();
    return localComments.filter(c => c.post_id === postId);
  }

  public async getFavorites(): Promise<string[]> {
    // Favorites can be saved locally for simple individual preference
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
    // Set defaults
    const postToInsert = {
      ...post,
      score: post.score || 1,
      elo: post.elo || 1500
    };

    if (this.isSupabaseEnabled && this.client) {
      try {
        await this.withTimeout(this.ensureTagsExist(post.tags), 2500).catch(err => {
          console.warn('ensureTagsExist failed or timed out:', err);
        });

        const { data, error } = await this.withTimeout(
          this.client
            .from('posts')
            .insert([postToInsert])
            .select(),
          4000
        );

        if (error) throw error;
        if (data && data[0]) {
          const inserted = data[0] as Post;
          this.addPostToLocal(inserted);
          return inserted;
        }
        this.addPostToLocal(postToInsert as Post);
        return postToInsert as Post;
      } catch (e) {
        console.warn('Supabase post create failed or timed out, saving to localStorage:', e);
      }
    }

    // Save locally
    this.addPostToLocal(postToInsert as Post);
    this.ensureTagsExistLocally(post.tags);
    return postToInsert as Post;
  }

  public async createComment(comment: Comment): Promise<Comment> {
    if (this.isSupabaseEnabled && this.client) {
      try {
        const { data, error } = await this.withTimeout(
          this.client
            .from('comments')
            .insert([comment])
            .select(),
          4000
        );
        if (error) throw error;
        
        this.addCommentToLocal(comment);
        if (data && data[0]) return data[0] as Comment;
        return comment;
      } catch (e) {
        console.warn('Supabase comment create failed, saving to localStorage:', e);
      }
    }

    this.addCommentToLocal(comment);
    return comment;
  }

  public async votePost(postId: string, scoreDelta: number): Promise<number> {
    if (this.isSupabaseEnabled && this.client) {
      try {
        // Fetch current score
        const { data: current, error: fetchErr } = await this.withTimeout(
          this.client
            .from('posts')
            .select('score')
            .eq('id', postId)
            .single(),
          3000
        );
        
        if (fetchErr) throw fetchErr;

        const newScore = (current?.score || 0) + scoreDelta;

        const { error: updateErr } = await this.withTimeout(
          this.client
            .from('posts')
            .update({ score: newScore })
            .eq('id', postId),
          3000
        );

        if (updateErr) throw updateErr;
        
        this.updatePostScoreLocally(postId, newScore);
        return newScore;
      } catch (e) {
        console.warn('Supabase vote failed, updating locally:', e);
      }
    }

    return this.updatePostScoreLocally(postId, scoreDelta, true);
  }

  public async updatePostTags(postId: string, tags: string[]): Promise<void> {
    if (this.isSupabaseEnabled && this.client) {
      try {
        await this.withTimeout(this.ensureTagsExist(tags), 2500).catch(err => {
          console.warn('ensureTagsExist failed, ignoring:', err);
        });

        const { error } = await this.withTimeout(
          this.client
            .from('posts')
            .update({ tags: tags })
            .eq('id', postId),
          3000
        );
        if (error) throw error;
        
        this.updatePostTagsLocally(postId, tags);
        return;
      } catch (e) {
        console.warn('Supabase update tags failed, updating locally:', e);
      }
    }

    this.updatePostTagsLocally(postId, tags);
    this.ensureTagsExistLocally(tags);
  }

  public async deletePost(postId: string): Promise<void> {
    if (this.isSupabaseEnabled && this.client) {
      try {
        const { error } = await this.withTimeout(
          this.client
            .from('posts')
            .delete()
            .eq('id', postId),
          4000
        );
        if (error) throw error;
      } catch (e) {
        console.warn('Supabase delete post failed, deleting locally:', e);
      }
    }

    // Delete locally
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

    // Also clean up favorites if present
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

  private async ensureTagsExist(tagNames: string[]) {
    if (!this.client) return;
    try {
      if (tagNames.length === 0) return;
      
      const { data: existing } = await this.client
        .from('tags')
        .select('name')
        .in('name', tagNames);
      
      const existingNames = (existing || []).map(t => t.name);
      const missingNames = tagNames.filter(n => !existingNames.includes(n));

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

        await this.client.from('tags').insert(newTags);
      }
    } catch (e) {
      console.error('Error ensuring tags exist in Supabase:', e);
    }
  }

  // Direct script setup SQL instructions helper for Russian translation
  public getSqlInstructions(): string {
    return `-- 1. СОЗДАНИЕ ТАБЛИЦЫ ТЕГОВ (tags)
CREATE TABLE IF NOT EXISTS public.tags (
    name text PRIMARY KEY,
    category text NOT NULL DEFAULT 'general'::text,
    count integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);

-- Включить публичный доступ (чтение/запись) для всех
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.tags;
CREATE POLICY "Allow public read" ON public.tags FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write" ON public.tags;
CREATE POLICY "Allow public write" ON public.tags FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update" ON public.tags;
CREATE POLICY "Allow public update" ON public.tags FOR UPDATE USING (true);

-- 2. СОЗДАНИЕ ТАБЛИЦЫ ПОСТОВ (posts)
CREATE TABLE IF NOT EXISTS public.posts (
    id text PRIMARY KEY,
    title text NOT NULL,
    url text NOT NULL,
    rating text NOT NULL DEFAULT 'safe'::text,
    score integer DEFAULT 0,
    elo integer DEFAULT 1500,
    created_at timestamp with time zone DEFAULT now(),
    uploader text NOT NULL,
    source_url text,
    description text,
    tags text[] DEFAULT '{}'::text[]
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.posts;
CREATE POLICY "Allow public read" ON public.posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write" ON public.posts;
CREATE POLICY "Allow public write" ON public.posts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update" ON public.posts;
CREATE POLICY "Allow public update" ON public.posts FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow public delete" ON public.posts;
CREATE POLICY "Allow public delete" ON public.posts FOR DELETE USING (true);

-- 3. СОЗДАНИЕ ТАБЛИЦЫ КОММЕНТАРИЕВ (comments)
CREATE TABLE IF NOT EXISTS public.comments (
    id text PRIMARY KEY,
    post_id text NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author text NOT NULL,
    text text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    likes integer DEFAULT 0
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.comments;
CREATE POLICY "Allow public read" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write" ON public.comments;
CREATE POLICY "Allow public write" ON public.comments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update" ON public.comments;
CREATE POLICY "Allow public update" ON public.comments FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow public delete" ON public.comments;
CREATE POLICY "Allow public delete" ON public.comments FOR DELETE USING (true);

-- 4. ВАЖНО: Создайте бакет (Bucket) с именем "media" в разделе Storage вашей панели Supabase и сделайте его Public (Публичным)!`;
  }
}

export const dbManager = new SuguleDatabaseManager();
