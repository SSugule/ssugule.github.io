import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { INITIAL_POSTS, INITIAL_TAGS, INITIAL_COMMENTS } from './src/sampleData';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Connect server-side Supabase client cleanly
const stripQuotes = (str: string) => {
  let s = str ? str.trim() : '';
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1).trim();
  if (s.startsWith("'") && s.endsWith("'")) s = s.slice(1, -1).trim();
  return s;
};

const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseUrl = stripQuotes(rawUrl);
let supabaseKey = stripQuotes(rawKey);

const fallbackUrl = 'https://erularobdstwkqtfemwh.supabase.co';
const fallbackKey = 'sb_secret_2tC5crIRKxtTUAAkzXvZ7g_7LMHI0d-';

// Validate URL has valid http/https scheme and is not empty or equal to "undefined" or placeholder
if (!supabaseUrl || supabaseUrl === 'undefined' || !/^https?:\/\//i.test(supabaseUrl)) {
  console.warn('[SUPABASE] URL is empty, "undefined", or invalid. Using stable fallback URL.');
  supabaseUrl = fallbackUrl;
}
if (!supabaseKey || supabaseKey === 'undefined') {
  console.warn('[SUPABASE] Key is empty or "undefined". Using stable fallback Key.');
  supabaseKey = fallbackKey;
}

console.log('[SUPABASE] Server-side initialization target URL:', supabaseUrl);
let supabase: any;
try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
} catch (clientErr: any) {
  console.error('[SUPABASE] Critical client instantiation failure. Re-initializing with stable default parameters:', clientErr.message || clientErr);
  supabase = createClient(fallbackUrl, fallbackKey, {
    auth: { persistSession: false }
  });
}

// Auto-create "media" public bucket if it does not already exist on Supabase Storage
async function initStorageBucket() {
  try {
    const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
    if (listErr) {
      console.warn('[STORAGE] Could not list storage buckets:', listErr.message);
      return;
    }
    const mediaExists = buckets?.some(b => b.name === 'media');
    if (!mediaExists) {
      console.log('[STORAGE] Public bucket "media" not found. Creating automatic public "media" bucket...');
      const { error: makeBucketErr } = await supabase.storage.createBucket('media', {
        public: true,
        fileSizeLimit: 52428800 // 50MB maximum asset size
      });
      if (makeBucketErr) {
        console.warn('[STORAGE] Failed to auto-create public bucket "media":', makeBucketErr.message);
      } else {
        console.log('[STORAGE] Successfully created and exposed "media" public storage bucket!');
      }
    } else {
      console.log('[STORAGE] Public bucket "media" already detected on Cloud Supabase.');
    }
  } catch (err: any) {
    console.error('[STORAGE] Storage initialization warning (likely unconfigured credentials):', err.message || err);
  }
}
initStorageBucket();

// Automatically ensure correct categories for added tags
async function ensureTagsExistOnServer(tagNames: string[]) {
  if (!tagNames || tagNames.length === 0) return;
  try {
    const { data: existingTags, error: selectErr } = await supabase
      .from('tags')
      .select('name')
      .in('name', tagNames);
    
    if (selectErr) throw selectErr;

    const existingNames = (existingTags || []).map(t => t.name.toLowerCase());
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
      await supabase.from('tags').insert(newTags);
    }
  } catch (err: any) {
    console.error('[DATABASE] Error in ensureTagsExistOnServer:', err.message || err);
  }
}

// --- EXPRESS ENDPOINTS / PROXY CHANNELS ---

// 1. GET ALL POSTS WITH AUTO-SEEDING
app.get('/api/posts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    let posts = data || [];

    // AUTO-SEEDING: Populate fresh DB if 0 posts exist
    if (posts.length === 0) {
      console.log('[DATABASE] Seeding detected: empty table. Populating fallback INITIAL_POSTS and tags...');
      try {
        // Safe tags insertion
        if (INITIAL_TAGS.length > 0) {
          const formattedTags = INITIAL_TAGS.map(t => ({ name: t.name, category: t.category }));
          try {
            await supabase.from('tags').insert(formattedTags);
          } catch (e) {
            console.warn('[DATABASE] Quiet tag seed insertion hint:', e);
          }
        }

        // Clean posts insert
        const postsToInsert = INITIAL_POSTS.map(p => ({
          id: p.id,
          title: p.title || '',
          url: p.url,
          rating: p.rating,
          score: p.score || 1,
          elo: p.elo || 1500,
          created_at: p.created_at,
          uploader: p.uploader,
          source_url: p.source_url || null,
          description: p.description || null,
          tags: p.tags
        }));

        const { error: postsSeedErr, data: seededPosts } = await supabase
          .from('posts')
          .insert(postsToInsert)
          .select();

        if (postsSeedErr) throw postsSeedErr;
        if (seededPosts && seededPosts.length > 0) {
          posts = seededPosts;
          console.log(`[DATABASE] Seeding complete! Succesfully loaded ${seededPosts.length} posts.`);

          // Seed comments
          const commentsToInsert = INITIAL_COMMENTS.map(c => ({
            id: c.id,
            post_id: c.post_id,
            author: c.author,
            text: c.text,
            created_at: c.created_at,
            likes: c.likes || 0
          }));
          try {
            await supabase.from('comments').insert(commentsToInsert);
          } catch (e) {
            console.warn('[DATABASE] Quiet comments seed insertion hint:', e);
          }
        }
      } catch (seedErr: any) {
        console.error('[DATABASE] Seeding routine failed:', seedErr.message || seedErr);
      }
    }

    return res.json(posts);
  } catch (err: any) {
    console.error('[DATABASE] Error fetching posts:', err.message || err);
    return res.json(INITIAL_POSTS); // Fallback to avoid empty frontend load
  }
});

// 2. GET ALL TAGS
app.get('/api/tags', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*');
    if (error) throw error;
    return res.json(data || INITIAL_TAGS);
  } catch (err: any) {
    console.error('[DATABASE] Error fetching tags:', err.message || err);
    return res.json(INITIAL_TAGS);
  }
});

// 3. GET COMMENTS FOR A SPECIFIC POST
app.get('/api/comments/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return res.json(data || []);
  } catch (err: any) {
    console.error('[DATABASE] Error fetching comments:', err.message || err);
    return res.json([]);
  }
});

// 4. CREATE NEW POST WITH AUTOMATIC TAGS REGISTRATION
app.post('/api/posts', async (req, res) => {
  try {
    const post = req.body;
    const postToInsert = {
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

    // Ensure all tags exist
    await ensureTagsExistOnServer(postToInsert.tags);

    const { data, error } = await supabase
      .from('posts')
      .insert([postToInsert])
      .select();

    if (error) throw error;
    return res.json(data && data[0] ? data[0] : postToInsert);
  } catch (err: any) {
    console.error('[DATABASE] Error creating post:', err.message || err);
    return res.status(500).json({ error: err.message });
  }
});

// 5. CREATE NEW COMMENT
app.post('/api/comments', async (req, res) => {
  try {
    const comment = req.body;
    const { data, error } = await supabase
      .from('comments')
      .insert([comment])
      .select();

    if (error) throw error;
    return res.json(data && data[0] ? data[0] : comment);
  } catch (err: any) {
    console.error('[DATABASE] Error creating comment:', err.message || err);
    return res.status(500).json({ error: err.message });
  }
});

// 6. UPDATE POST ASSOCIATED TAGS
app.put('/api/posts/:postId/tags', async (req, res) => {
  try {
    const { postId } = req.params;
    const { tags } = req.body;

    await ensureTagsExistOnServer(tags);

    const { error } = await supabase
      .from('posts')
      .update({ tags })
      .eq('id', postId);

    if (error) throw error;
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[DATABASE] Error updating post tags:', err.message || err);
    return res.status(500).json({ error: err.message });
  }
});

// 6a. UPDATE POST ALL GENERAL DETAILS & MEDIA
app.put('/api/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, url, rating, source_url, description, tags, cover_url } = req.body;

    if (tags) {
      await ensureTagsExistOnServer(tags);
    }

    const { error } = await supabase
      .from('posts')
      .update({
        title,
        url,
        rating,
        source_url,
        description,
        tags,
        cover_url
      })
      .eq('id', postId);

    if (error) throw error;
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[DATABASE] Error updating post details:', err.message || err);
    return res.status(500).json({ error: err.message });
  }
});

// 6b. EXPLICITLY CREATE/UPDATE TAG TYPE & CATEGORY
app.post('/api/tags', async (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name) return res.status(400).json({ error: 'Tag name is required.' });
    
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '_');
    const validCategory = ['character', 'copyright', 'artist', 'general', 'meta'].includes(category) ? category : 'general';
    
    // Check if tag already exists in Supabase
    const { data: existing, error: selectErr } = await supabase
      .from('tags')
      .select('name, category')
      .eq('name', cleanName)
      .maybeSingle();
      
    if (existing) {
      // Update existing tag category
      const { data: updated, error: updateErr } = await supabase
        .from('tags')
        .update({ category: validCategory })
        .eq('name', cleanName)
        .select();
      if (updateErr) throw updateErr;
      return res.json(updated && updated[0] ? updated[0] : { name: cleanName, category: validCategory });
    } else {
      // Create a new tag with custom category
      const { data: inserted, error: insertErr } = await supabase
        .from('tags')
        .insert([{ name: cleanName, category: validCategory, count: 1 }])
        .select();
      if (insertErr) throw insertErr;
      return res.json(inserted && inserted[0] ? inserted[0] : { name: cleanName, category: validCategory, count: 1 });
    }
  } catch (err: any) {
    console.error('[DATABASE] Error saving tag with custom category:', err.message || err);
    return res.status(500).json({ error: err.message || 'Error saving tag.' });
  }
});

// 7. VOTE ON A POST
app.post('/api/posts/:postId/vote', async (req, res) => {
  try {
    const { postId } = req.params;
    const { scoreDelta } = req.body;

    const { data: current, error: fetchErr } = await supabase
      .from('posts')
      .select('score')
      .eq('id', postId)
      .single();

    if (fetchErr) throw fetchErr;

    const newScore = (current?.score || 0) + scoreDelta;

    const { error: updateErr } = await supabase
      .from('posts')
      .update({ score: newScore })
      .eq('id', postId);

    if (updateErr) throw updateErr;
    return res.json({ score: newScore });
  } catch (err: any) {
    console.error('[DATABASE] Error voting on post:', err.message || err);
    return res.status(500).json({ error: err.message });
  }
});

// 8. DELETE A POST
app.delete('/api/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    // Delete associated comments manually to satisfy any direct database constraints
    await supabase.from('comments').delete().eq('post_id', postId);

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[DATABASE] Error deleting post:', err.message || err);
    return res.status(500).json({ error: err.message });
  }
});

// 9. FILE UPLOAD HANDLER: SAVES PERMANENTLY TO SUPABASE STORAGE BUCKET 'MEDIA' ONLY
app.post('/api/upload', express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
  try {
    const rawFileName = req.header('x-file-name') || '';
    const fileName = decodeURIComponent(rawFileName) || `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;
    const fileBuffer = req.body;

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).send('Empty file buffer payloads.');
    }

    const ext = fileName.split('.').pop()?.toLowerCase();
    let contentType = 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    else if (ext === 'gif') contentType = 'image/gif';
    else if (ext === 'mp4') contentType = 'video/mp4';
    else if (ext === 'webm') contentType = 'video/webm';
    else if (ext === 'mp3') contentType = 'audio/mpeg';
    else if (ext === 'pdf') contentType = 'application/pdf';

    console.log(`[STORAGE] Uploading file to clean Supabase media bucket path: ${fileName} (${contentType})`);
    
    const { data, error: uploadErr } = await supabase.storage
      .from('media')
      .upload(fileName, fileBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadErr) {
      console.error('[STORAGE] Supabase upload failed:', uploadErr.message || uploadErr);
      return res.status(500).json({
        error: `Supabase Storage upload error: ${uploadErr.message || JSON.stringify(uploadErr)}. Ephemeral local disk upload fallback is disabled by administrative policy!`
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(fileName);

    if (publicUrlData && publicUrlData.publicUrl) {
      console.log('[STORAGE] Supabase Permanent Storage saved URL successfully:', publicUrlData.publicUrl);
      return res.json({ url: publicUrlData.publicUrl });
    }

    return res.status(500).json({
      error: 'Failed to retrieve public URL from Supabase storage after successful write.'
    });
  } catch (err: any) {
    console.error('[STORAGE] Critical Express /api/upload error:', err);
    return res.status(500).json({
      error: `Critical server-side storage error: ${err.message || err}. Ephemeral local disk upload fallback is completely disabled.`
    });
  }
});

app.get('/api/supabase-config', (req, res) => {
  res.json({
    url: supabaseUrl,
    key: 'PUBLIC-PROXY-ACTIVE' // completely hidden sensitive keys from inspect consoles
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database_host: 'Express server connected to ' + supabaseUrl
  });
});

// Setup dev server or static static assets
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || 
                 (process.argv[1] && (process.argv[1].includes('dist/server.cjs') || process.argv[1].includes('server.cjs')));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.log('Running full-stack Express server in DEVELOPMENT mode with Vite middleware.');
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log('Running full-stack Express server in PRODUCTION mode with compiled assets.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on absolute port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal startup failure:', err);
});
