import { createClient } from '@supabase/supabase-js';
import { Post, Tag, Comment } from './types';
import { INITIAL_POSTS, INITIAL_TAGS, INITIAL_COMMENTS } from './sampleData';

class SuguleDatabaseManager {
  private isSupabaseEnabled: boolean = true;
  private configUrl: string = 'PROXIED_BACKEND';
  private configKey: string = 'SECURE_PROXY';
  
  private directSupabase: any = null;
  private useProxyMode: boolean = true;
  
  private rawUrl: string = (typeof window !== 'undefined' ? localStorage.getItem('sugule_custom_supabase_url') : '') || (import.meta as any).env?.VITE_SUPABASE_URL || '';
  private rawKey: string = (typeof window !== 'undefined' ? localStorage.getItem('sugule_custom_supabase_key') : '') || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  // Fallback options (matching server-side defaults for flawless client-side connection)
  private fallbackUrl = 'https://erularobdstwkqtfemwh.supabase.co';
  private fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVydWxhcm9iZHN0d2txdGZlbXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzg2NjcsImV4cCI6MjA1NjgyMjY2N30.S3YjM6Yv1YVbYkE8_ZfVqP_V-8Z9Vv9X9Z-'; 

  constructor() {
    this.init();
  }

  public init() {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isStaticHost = hostname.includes('github.io') || 
                         hostname.includes('pages.dev') || 
                         hostname.includes('web.app') || 
                         hostname.includes('firebaseapp.com') ||
                         hostname.includes('netlify.app') ||
                         hostname.includes('vercel.app');
    
    if (isStaticHost) {
      this.useProxyMode = false;
      console.log('Sugule Database Manager: Static host detected. Pre-configuring Direct client-side Supabase connection.');
    } else {
      this.useProxyMode = true;
      console.log('Sugule Database Manager: Server host detected. Pre-configuring Proxy connection.');
    }

    this.initDirectClient();

    // Secondary live validation (unless we already know we are purely static)
    if (typeof window !== 'undefined' && !isStaticHost) {
      fetch('/api/health')
        .then(res => {
          if (!res.ok) {
            this.useProxyMode = false;
            console.warn('Sugule Database Manager: Express API health-check failed. Switched to Direct client-side Supabase.');
          }
        })
        .catch(() => {
          this.useProxyMode = false;
          console.warn('Sugule Database Manager: Express API unreachable. Switched to Direct client-side Supabase.');
        });
    }
  }

  private parseSupabaseUrl(url: string): string {
    if (!url) return '';
    url = url.trim();
    if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
      const match = url.match(/db\.([a-z0-9]+)\.supabase\.co/i);
      if (match && match[1]) {
        return `https://${match[1]}.supabase.co`;
      }
    }
    return url;
  }

  private activeUserId: string = '';

  public setActiveUserId(userId: string) {
    this.activeUserId = userId;
    console.log('[SUGULE DB] Active user ID updated:', userId);
  }

  public getActiveUserId(): string {
    if (this.activeUserId) return this.activeUserId;
    // Fallback to local anonymous ID so actions are always tracked with persistence
    let anonId = localStorage.getItem('sugule_anon_user_id');
    if (!anonId) {
      anonId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('sugule_anon_user_id', anonId);
    }
    return anonId;
  }

  public async getCurrentUser() {
    if (this.directSupabase) {
      try {
        const { data: { session }, error } = await this.directSupabase.auth.getSession();
        if (error) return null;
        return session?.user || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  public async signUp(email: string, password: string) {
    if (!this.directSupabase) throw new Error('Supabase client is not initialized.');
    return await this.directSupabase.auth.signUp({ email, password });
  }

  public async signIn(email: string, password: string) {
    if (!this.directSupabase) throw new Error('Supabase client is not initialized.');
    return await this.directSupabase.auth.signInWithPassword({ email, password });
  }

  public async signOut() {
    if (this.directSupabase) {
      await this.directSupabase.auth.signOut();
    }
  }

  public async resetPasswordForEmail(email: string) {
    if (!this.directSupabase) throw new Error('Supabase client is not initialized.');
    const redirectToUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { data, error } = await this.directSupabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectToUrl
    });
    if (error) throw error;
    return data;
  }

  public async updatePassword(password: string) {
    if (!this.directSupabase) throw new Error('Supabase client is not initialized.');
    const { data, error } = await this.directSupabase.auth.updateUser({ password });
    if (error) throw error;
    return data;
  }

  private initDirectClient() {
    const stripQuotes = (str: string) => {
      let s = str ? str.trim() : '';
      if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1).trim();
      if (s.startsWith("'") && s.endsWith("'")) s = s.slice(1, -1).trim();
      return s;
    };

    let url = this.parseSupabaseUrl(stripQuotes(this.rawUrl));
    let key = stripQuotes(this.rawKey);

    if (!url || url === 'undefined' || !/^https?:\/\//i.test(url)) {
      url = this.fallbackUrl;
    }
    if (!key || key === 'undefined') {
      key = this.fallbackKey;
    }

    try {
      this.directSupabase = createClient(url, key, {
        auth: { 
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      console.log('Direct Supabase client initialized and ready with persistent sessions.');
    } catch (err) {
      console.error('Failed to initialize direct Supabase client:', err);
    }
  }

  public getConfiguration() {
    return {
      isEnabled: this.isSupabaseEnabled,
      url: this.useProxyMode ? this.configUrl : (this.rawUrl || this.fallbackUrl),
      key: this.useProxyMode ? this.configKey : 'DIRECT-CLIENT-INTEGRATION'
    };
  }

  public saveConfiguration(url: string, key: string) {
    this.rawUrl = this.parseSupabaseUrl(url);
    this.rawKey = key;
    if (typeof window !== 'undefined') {
      if (url && key) {
        localStorage.setItem('sugule_custom_supabase_url', this.rawUrl);
        localStorage.setItem('sugule_custom_supabase_key', this.rawKey);
      } else {
        localStorage.removeItem('sugule_custom_supabase_url');
        localStorage.removeItem('sugule_custom_supabase_key');
      }
    }
    this.initDirectClient();
    return true;
  }

  public disconnectSupabase() {
    console.log('Database operation active.');
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

  private async ensureTagsExistDirect(tagNames: string[]) {
    if (!tagNames || tagNames.length === 0 || !this.directSupabase) return;
    try {
      const { data: existingTags, error: selectErr } = await this.directSupabase
        .from('tags')
        .select('name')
        .in('name', tagNames);
      
      if (selectErr) throw selectErr;

      const existingNames = (existingTags || []).map((t: any) => t.name.toLowerCase());
      const missingNames = tagNames.filter(name => !existingNames.includes(name.toLowerCase()));

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
        await this.directSupabase.from('tags').insert(newTags);
      }
    } catch (err) {
      console.error('Error ensuring tags exist directly on Supabase:', err);
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

  // --- ARTIFACT FILE UPLOAD ---
  public async uploadFile(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'png';
    const randomId = Math.random().toString(36).substring(2, 11);
    const fileName = `${Date.now()}_${randomId}.${fileExt}`;

    if (this.useProxyMode) {
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
        console.warn('Proxy upload failure, trying direct client-side fallback:', localErr);
        this.useProxyMode = false;
      }
    }

    // Direct client upload fallback
    if (this.directSupabase) {
      try {
        console.log('Uploading file directly to Supabase storage bucket from browser...');
        const { data, error } = await this.directSupabase.storage
          .from('media')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          });
        if (error) throw error;

        const { data: publicUrlData } = this.directSupabase.storage
          .from('media')
          .getPublicUrl(fileName);

        if (publicUrlData && publicUrlData.publicUrl) {
          console.log('Direct upload succeeded. Public URL:', publicUrlData.publicUrl);
          return publicUrlData.publicUrl;
        }
        throw new Error('No public URL returned after successful direct storage upload.');
      } catch (directErr: any) {
        console.error('Fatal direct upload failure:', directErr);
        throw new Error(`Ошибка сохранения: ${directErr.message || 'не удалось записать файл'}`);
      }
    }

    throw new Error('База данных недоступна. Загрузка в автономном режиме невозможна.');
  }

  // --- GETTERS ---
  
  public async getPosts(): Promise<Post[]> {
    if (this.useProxyMode) {
      try {
        const response = await fetch('/api/posts');
        if (!response.ok) throw new Error('API error');
        const posts = await response.json() as Post[];
        localStorage.setItem('SUGULE_LOCAL_POSTS', JSON.stringify(posts));
        return posts;
      } catch (e) {
        console.warn('Backend proxy fetch posts failed, trying direct fallback:', e);
        this.useProxyMode = false;
      }
    }

    // Direct mode
    if (this.directSupabase) {
      try {
        const { data, error } = await this.directSupabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        
        const posts = data || [];
        localStorage.setItem('SUGULE_LOCAL_POSTS', JSON.stringify(posts));
        return posts;
      } catch (directErr) {
        console.error('Direct getPosts failed, loading offline local posts:', directErr);
      }
    }

    // Local Storage cache fallback
    const local = localStorage.getItem('SUGULE_LOCAL_POSTS');
    if (local) {
      try { return JSON.parse(local); } catch { return INITIAL_POSTS; }
    }
    return INITIAL_POSTS;
  }

  public async getTags(): Promise<Tag[]> {
    if (this.useProxyMode) {
      try {
        const response = await fetch('/api/tags');
        if (!response.ok) throw new Error('API error');
        const tags = await response.json() as Tag[];
        localStorage.setItem('SUGULE_LOCAL_TAGS', JSON.stringify(tags));
        return tags;
      } catch (e) {
        console.warn('Backend proxy fetch tags failed, trying direct fallback:', e);
        this.useProxyMode = false;
      }
    }

    // Direct mode
    if (this.directSupabase) {
      try {
        const { data, error } = await this.directSupabase
          .from('tags')
          .select('*');
        if (error) throw error;

        const tags = data || [];
        localStorage.setItem('SUGULE_LOCAL_TAGS', JSON.stringify(tags));
        return tags;
      } catch (directErr) {
        console.error('Direct getTags failed, loading offline local tags:', directErr);
      }
    }

    // Local storage fallback
    const local = localStorage.getItem('SUGULE_LOCAL_TAGS');
    if (local) {
      try { return JSON.parse(local); } catch { return INITIAL_TAGS; }
    }
    return INITIAL_TAGS;
  }

  public async getComments(postId: string): Promise<Comment[]> {
    if (this.useProxyMode) {
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
        console.warn('Backend proxy fetch comments failed, trying direct fallback:', e);
        this.useProxyMode = false;
      }
    }

    // Direct mode
    if (this.directSupabase) {
      try {
        const { data, error } = await this.directSupabase
          .from('comments')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });
        if (error) throw error;

        const comments = data || [];
        
        // Sync cache
        const localComments = this.getLocalCommentsList();
        const filtered = localComments.filter(c => c.post_id !== postId);
        const merged = [...filtered, ...comments];
        localStorage.setItem('SUGULE_LOCAL_COMMENTS', JSON.stringify(merged));

        return comments;
      } catch (directErr) {
        console.error('Direct getComments failed, loading offline local comments:', directErr);
      }
    }

    // Offline state
    const localComments = this.getLocalCommentsList();
    return localComments.filter(c => c.post_id === postId);
  }

  public async getFavorites(): Promise<string[]> {
    const userId = this.getActiveUserId();
    
    if (this.useProxyMode) {
      try {
        const response = await fetch(`/api/favorites?userId=${encodeURIComponent(userId)}`);
        if (response.ok) {
          const postIds = await response.json() as string[];
          localStorage.setItem('SUGULE_FAVORITES', JSON.stringify(postIds));
          return postIds;
        }
      } catch (e) {
        console.warn('Backend proxy fetch favorites failed, trying direct:', e);
        this.useProxyMode = false;
      }
    }

    if (this.directSupabase) {
      try {
        const { data, error } = await this.directSupabase
          .from('favorites')
          .select('post_id')
          .eq('user_id', userId);
        if (!error && data) {
          const postIds = data.map((item: any) => item.post_id);
          localStorage.setItem('SUGULE_FAVORITES', JSON.stringify(postIds));
          return postIds;
        }
      } catch (err) {
        console.error('Direct getFavorites failed:', err);
      }
    }

    try {
      const favs = localStorage.getItem('SUGULE_FAVORITES');
      return favs ? JSON.parse(favs) : [];
    } catch {
      return [];
    }
  }

  public async toggleFavorite(postId: string): Promise<boolean> {
    const userId = this.getActiveUserId();
    const prev = await this.getFavorites();
    const index = prev.indexOf(postId);
    const isAdding = index === -1;
    
    if (isAdding) {
      prev.push(postId);
    } else {
      prev.splice(index, 1);
    }
    localStorage.setItem('SUGULE_FAVORITES', JSON.stringify(prev));

    if (this.useProxyMode) {
      try {
        const response = await fetch('/api/favorites/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, postId, isAdding })
        });
        if (response.ok) {
          return isAdding;
        }
      } catch (e) {
        console.warn('Backend proxy toggle favorite failed, trying direct:', e);
        this.useProxyMode = false;
      }
    }

    if (this.directSupabase) {
      try {
        if (isAdding) {
          await this.directSupabase
            .from('favorites')
            .insert([{ user_id: userId, post_id: postId }]);
        } else {
          await this.directSupabase
            .from('favorites')
            .delete()
            .eq('user_id', userId)
            .eq('post_id', postId);
        }
        return isAdding;
      } catch (err) {
        console.error('Direct toggleFavorite failed:', err);
      }
    }

    return isAdding;
  }

  // --- SETTERS ---

  public async createPost(post: Omit<Post, 'elo' | 'score'> & { score?: number; elo?: number }): Promise<Post> {
    const postToInsert = {
      ...post,
      score: post.score || 1,
      elo: post.elo || 1500
    };

    if (this.useProxyMode) {
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
        console.warn('Backend proxy create post failed, trying direct fallback:', e);
        this.useProxyMode = false;
      }
    }

    // Direct mode
    if (this.directSupabase) {
      try {
        const postToInsertClean = {
          id: post.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          title: post.title || 'Untitled',
          url: post.url,
          rating: post.rating || 'safe',
          score: post.score || 1,
          elo: post.elo || 1500,
          uploader: post.uploader || 'Администратор',
          source_url: post.source_url || null,
          description: post.description || null,
          tags: post.tags || []
        };

        await this.ensureTagsExistDirect(postToInsertClean.tags);

        const { data, error } = await this.directSupabase
          .from('posts')
          .insert([postToInsertClean])
          .select();
        
        if (error) throw error;
        const inserted = data && data[0] ? data[0] : postToInsertClean;
        this.addPostToLocal(inserted);
        return inserted;
      } catch (directErr) {
        console.error('Direct createPost failed, creating locally:', directErr);
      }
    }

    // Offline storage backup
    this.addPostToLocal(postToInsert as Post);
    this.ensureTagsExistLocally(post.tags);
    return postToInsert as Post;
  }

  public async createComment(comment: Comment): Promise<Comment> {
    if (this.useProxyMode) {
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
        console.warn('Backend proxy create comment failed, trying direct fallback:', e);
        this.useProxyMode = false;
      }
    }

    // Direct mode
    if (this.directSupabase) {
      try {
        const { data, error } = await this.directSupabase
          .from('comments')
          .insert([comment])
          .select();
        if (error) throw error;
        const inserted = data && data[0] ? data[0] : comment;
        this.addCommentToLocal(inserted);
        return inserted;
      } catch (directErr) {
        console.error('Direct createComment failed, creating locally:', directErr);
      }
    }

    // Offline storage backup
    this.addCommentToLocal(comment);
    return comment;
  }

  public async getUserVotes(): Promise<Record<string, 'up' | 'down'>> {
    const userId = this.getActiveUserId();
    
    if (this.useProxyMode) {
      try {
        const response = await fetch(`/api/votes?userId=${encodeURIComponent(userId)}`);
        if (response.ok) {
          const votes = await response.json() as Record<string, 'up' | 'down'>;
          localStorage.setItem('sugule_user_votes', JSON.stringify(votes));
          return votes;
        }
      } catch {}
    }

    if (this.directSupabase) {
      try {
        const { data, error } = await this.directSupabase
          .from('post_votes')
          .select('post_id, vote_type')
          .eq('user_id', userId);
        if (!error && data) {
          const votes: Record<string, 'up' | 'down'> = {};
          data.forEach((item: any) => {
            votes[item.post_id] = item.vote_type as 'up' | 'down';
          });
          localStorage.setItem('sugule_user_votes', JSON.stringify(votes));
          return votes;
        }
      } catch {}
    }

    try {
      const local = localStorage.getItem('sugule_user_votes');
      return local ? JSON.parse(local) : {};
    } catch {
      return {};
    }
  }

  public async incrementViews(postId: string): Promise<number> {
    if (this.useProxyMode) {
      try {
        const response = await fetch(`/api/posts/${postId}/view`, {
          method: 'POST'
        });
        if (response.ok) {
          const { views } = await response.json();
          this.updatePostViewsLocally(postId, views);
          return views;
        }
      } catch (e) {
        console.warn('Backend proxy increment views failed, trying direct:', e);
        this.useProxyMode = false;
      }
    }

    if (this.directSupabase) {
      try {
        const { data: current, error: fetchErr } = await this.directSupabase
          .from('posts')
          .select('views')
          .eq('id', postId)
          .single();
        
        let newViews = 1;
        if (!fetchErr && current) {
          newViews = (current.views || 0) + 1;
        }

        const { error: updateErr } = await this.directSupabase
          .from('posts')
          .update({ views: newViews })
          .eq('id', postId);
        
        if (!updateErr) {
          this.updatePostViewsLocally(postId, newViews);
          return newViews;
        }
      } catch (err) {
        console.error('Direct incrementViews failed:', err);
      }
    }

    const local = localStorage.getItem('SUGULE_LOCAL_POSTS');
    if (local) {
      try {
        const posts = JSON.parse(local) as Post[];
        const post = posts.find(p => p.id === postId);
        if (post) {
          post.views = (post.views || 0) + 1;
          localStorage.setItem('SUGULE_LOCAL_POSTS', JSON.stringify(posts));
          return post.views;
        }
      } catch {}
    }
    return 1;
  }

  private updatePostViewsLocally(postId: string, newViews: number) {
    const local = localStorage.getItem('SUGULE_LOCAL_POSTS');
    if (local) {
      try {
        const posts = JSON.parse(local) as Post[];
        const updated = posts.map(p => p.id === postId ? { ...p, views: newViews } : p);
        localStorage.setItem('SUGULE_LOCAL_POSTS', JSON.stringify(updated));
      } catch {}
    }
  }

  public async votePost(postId: string, scoreDelta: number, nextVote: 'up' | 'down' | null): Promise<number> {
    const userId = this.getActiveUserId();

    if (this.useProxyMode) {
      try {
        const response = await fetch(`/api/posts/${postId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scoreDelta, userId, voteType: nextVote })
        });
        if (!response.ok) throw new Error('API vote failed');
        const { score } = await response.json();
        this.updatePostScoreLocally(postId, score);
        return score;
      } catch (e) {
        console.warn('Backend proxy vote failed, trying direct fallback:', e);
        this.useProxyMode = false;
      }
    }

    if (this.directSupabase) {
      try {
        if (nextVote === null) {
          await this.directSupabase
            .from('post_votes')
            .delete()
            .eq('user_id', userId)
            .eq('post_id', postId);
        } else {
          const { error: upsertErr } = await this.directSupabase
            .from('post_votes')
            .upsert({ user_id: userId, post_id: postId, vote_type: nextVote }, { onConflict: 'user_id,post_id' });
          if (upsertErr) console.warn('Vote upsert warning:', upsertErr);
        }

        const { data: current, error: fetchErr } = await this.directSupabase
          .from('posts')
          .select('score')
          .eq('id', postId)
          .single();
        if (fetchErr) throw fetchErr;

        const newScore = (current?.score || 0) + scoreDelta;

        const { error: updateErr } = await this.directSupabase
          .from('posts')
          .update({ score: newScore })
          .eq('id', postId);
        if (updateErr) throw updateErr;

        this.updatePostScoreLocally(postId, newScore);
        return newScore;
      } catch (directErr) {
        console.error('Direct votePost failed, updating locally:', directErr);
      }
    }

    return this.updatePostScoreLocally(postId, scoreDelta, true);
  }

  public async updatePostTags(postId: string, tags: string[]): Promise<void> {
    if (this.useProxyMode) {
      try {
        const response = await fetch(`/api/posts/${postId}/tags`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags })
        });
        if (!response.ok) throw new Error('API tag update failed');
        this.updatePostTagsLocally(postId, tags);
        return;
      } catch (e) {
        console.warn('Backend proxy tag update failed, trying direct fallback:', e);
        this.useProxyMode = false;
      }
    }

    // Direct mode
    if (this.directSupabase) {
      try {
        await this.ensureTagsExistDirect(tags);
        const { error } = await this.directSupabase
          .from('posts')
          .update({ tags })
          .eq('id', postId);
        if (error) throw error;
        this.updatePostTagsLocally(postId, tags);
        return;
      } catch (directErr) {
        console.error('Direct updatePostTags failed, updating locally:', directErr);
      }
    }

    // Local fallback
    this.updatePostTagsLocally(postId, tags);
    this.ensureTagsExistLocally(tags);
  }

  public async updatePost(postId: string, fields: Partial<Post>): Promise<void> {
    if (this.useProxyMode) {
      try {
        const response = await fetch(`/api/posts/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields)
        });
        if (!response.ok) throw new Error('API post update failed');
        this.updatePostLocally(postId, fields);
        return;
      } catch (e) {
        console.warn('Backend proxy post update failed, trying direct fallback:', e);
        this.useProxyMode = false;
      }
    }

    // Direct mode
    if (this.directSupabase) {
      try {
        if (fields.tags) {
          await this.ensureTagsExistDirect(fields.tags);
        }
        const { error } = await this.directSupabase
          .from('posts')
          .update(fields)
          .eq('id', postId);
        if (error) throw error;
        this.updatePostLocally(postId, fields);
        return;
      } catch (directErr) {
        console.error('Direct updatePost failed, updating locally:', directErr);
      }
    }

    // Local fallback
    this.updatePostLocally(postId, fields);
    if (fields.tags) {
      this.ensureTagsExistLocally(fields.tags);
    }
  }

  public async saveTag(name: string, category: 'character' | 'copyright' | 'artist' | 'general' | 'meta'): Promise<Tag> {
    if (this.useProxyMode) {
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
        console.warn('Backend proxy saveTag failed, trying direct fallback:', e);
        this.useProxyMode = false;
      }
    }

    // Direct mode
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '_');
    const validCategory = ['character', 'copyright', 'artist', 'general', 'meta'].includes(category) ? category : 'general';

    if (this.directSupabase) {
      try {
        const { data: existing, error: selectErr } = await this.directSupabase
          .from('tags')
          .select('name, category')
          .eq('name', cleanName)
          .maybeSingle();
          
        if (selectErr) throw selectErr;

        let tagObj: Tag;
          
        if (existing) {
          const { data: updated, error: updateErr } = await this.directSupabase
            .from('tags')
            .update({ category: validCategory })
            .eq('name', cleanName)
            .select();
          if (updateErr) throw updateErr;
          tagObj = updated && updated[0] ? updated[0] : { name: cleanName, category: validCategory };
        } else {
          const { data: inserted, error: insertErr } = await this.directSupabase
            .from('tags')
            .insert([{ name: cleanName, category: validCategory, count: 1 }])
            .select();
          if (insertErr) throw insertErr;
          tagObj = inserted && inserted[0] ? inserted[0] : { name: cleanName, category: validCategory, count: 1 };
        }

        const local = localStorage.getItem('SUGULE_LOCAL_TAGS');
        let tags = INITIAL_TAGS;
        if (local) {
          try { tags = JSON.parse(local); } catch { tags = INITIAL_TAGS; }
        }
        const filtered = tags.filter(t => t.name.toLowerCase() !== tagObj.name.toLowerCase());
        const updated = [...filtered, tagObj];
        localStorage.setItem('SUGULE_LOCAL_TAGS', JSON.stringify(updated));
        return tagObj;
      } catch (directErr) {
        console.error('Direct saveTag failed:', directErr);
      }
    }

    // Offline fallback
    const tagObj: Tag = { name: cleanName, category: validCategory, count: 1 };
    
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

  public async deletePost(postId: string): Promise<void> {
    if (this.useProxyMode) {
      try {
        const response = await fetch(`/api/posts/${postId}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('API delete post failed');
      } catch (e) {
        console.warn('Backend proxy delete post failed, trying direct fallback:', e);
        this.useProxyMode = false;
      }
    }

    // Direct mode
    if (this.directSupabase && !this.useProxyMode) {
      try {
        await this.directSupabase.from('comments').delete().eq('post_id', postId);
        const { error } = await this.directSupabase
          .from('posts')
          .delete()
          .eq('id', postId);
        if (error) throw error;
      } catch (directErr) {
        console.error('Direct deletePost failed:', directErr);
      }
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
    return `-- Скрипт подготовки базы данных Supabase для работы с Sugule Booru
-- Выполните этот SQL-скрипт в панели SQL Editor вашего проекта Supabase

-- 1. Снятие политик RLS для публичного чтения и записи клиентами в браузере
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_votes DISABLE ROW LEVEL SECURITY;

-- 2. Обеспечение начальной структуры таблиц и индексов
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views INT4 DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS elo INT4 DEFAULT 1500;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS rating VARCHAR(10) DEFAULT 'general';
`;
  }
}

export const dbManager = new SuguleDatabaseManager();
