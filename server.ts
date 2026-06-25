import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { INITIAL_POSTS, INITIAL_TAGS, INITIAL_COMMENTS } from './src/sampleData';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Setup portable filesystem database.json
const dbPath = path.resolve(process.cwd(), 'database.json');

interface LocalDb {
  posts: any[];
  tags: any[];
  comments: any[];
  users: any[];
}

function autoGitSync() {
  console.log('[GIT-AUTO-SYNC] Initiating workspace repository sync...');
  exec('git add database.json media/ && git commit -m "Auto-update database and media archives [skip ci]" && git push', (err, stdout, stderr) => {
    if (err) {
      console.warn('[GIT-AUTO-SYNC] Repo sync warning:', stderr?.trim() || err.message);
    } else {
      console.log('[GIT-AUTO-SYNC] Repo sync success:', stdout.trim());
    }
  });
}

function loadDb(): LocalDb {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      const db = JSON.parse(data);
      if (!db.users) db.users = [];
      const hasAdmin = db.users.some((u: any) => u.username.toLowerCase() === 'admin');
      if (!hasAdmin) {
        db.users.push({
          username: "admin",
          nickname: "Администратор",
          email: "admin@sugule.com",
          password: "admin",
          avatar_url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=200&h=200&fit=crop",
          cover_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&h=400&fit=crop",
          description: "Администратор архива Sugule.",
          role: "admin"
        });
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
      }
      return db;
    }
  } catch (err) {
    console.error('[JSON-DB] Error reading database.json:', err);
  }
  
  // Create default fallback schema matching SQLite structure on fly
  const initialDb: LocalDb = {
    posts: INITIAL_POSTS.map(p => ({
      id: p.id,
      title: p.title || 'Untitled',
      url: p.url,
      rating: p.rating,
      score: p.score || 1,
      elo: p.elo || 1500,
      uploader: p.uploader || 'Anonymous',
      source_url: p.source_url || null,
      description: p.description || null,
      tags: JSON.stringify(p.tags || []),
      cover_url: p.cover_url || null,
      is_game: p.is_game ? 1 : 0,
      version: p.version || null,
      screenshots: JSON.stringify(p.screenshots || []),
      download_pc: p.download_pc || null,
      download_mobile: p.download_mobile || null,
      device_compatibility: p.device_compatibility || null,
      created_at: p.created_at || new Date().toISOString()
    })),
    tags: INITIAL_TAGS.map(t => ({
      name: t.name.toLowerCase(),
      category: t.category,
      count: t.count || 1
    })),
    comments: INITIAL_COMMENTS.map(c => ({
      id: c.id,
      post_id: c.post_id,
      author: c.author,
      text: c.text,
      created_at: c.created_at,
      likes: c.likes || 0
    })),
    users: [
      {
        username: "admin",
        nickname: "Администратор",
        email: "admin@sugule.com",
        password: "admin",
        avatar_url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=200&h=200&fit=crop",
        cover_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&h=400&fit=crop",
        description: "Администратор архива Sugule.",
        role: "admin"
      }
    ]
  };
  saveDb(initialDb);
  return initialDb;
}

function saveDb(data: LocalDb) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    autoGitSync();
  } catch (err) {
    console.error('[JSON-DB] Error saving database.json:', err);
  }
}

// Wrap operations in promise flows to match existing Express endpoint handlers
async function runQuery(sql: string, params: any[] = []): Promise<any> {
  const db = loadDb();
  const normalizedSql = sql.replace(/\s+/g, ' ').trim().toUpperCase();

  // 1. DELETE FROM COMMENTS WHERE POST_ID = ?
  if (normalizedSql.startsWith('DELETE FROM COMMENTS WHERE POST_ID = ?')) {
    const [postId] = params;
    db.comments = db.comments.filter(c => c.post_id !== postId);
    saveDb(db);
    return { changes: 1 };
  }

  // 2. DELETE FROM POSTS WHERE ID = ?
  if (normalizedSql.startsWith('DELETE FROM POSTS WHERE ID = ?')) {
    const [postId] = params;
    db.posts = db.posts.filter(p => p.id !== postId);
    saveDb(db);
    return { changes: 1 };
  }

  // 3. UPDATE POSTS SET TAGS = ? WHERE ID = ?
  if (normalizedSql.startsWith('UPDATE POSTS SET TAGS = ? WHERE ID = ?')) {
    const [tagsJson, postId] = params;
    db.posts = db.posts.map(p => p.id === postId ? { ...p, tags: tagsJson } : p);
    saveDb(db);
    return { changes: 1 };
  }

  // 4. UPDATE POSTS SET SCORE = ? WHERE ID = ?
  if (normalizedSql.startsWith('UPDATE POSTS SET SCORE = ? WHERE ID = ?')) {
    const [score, postId] = params;
    db.posts = db.posts.map(p => p.id === postId ? { ...p, score } : p);
    saveDb(db);
    return { changes: 1 };
  }

  // 5. UPDATE TAGS SET COUNT = COUNT + 1 WHERE LOWER(NAME) = ?
  if (normalizedSql.startsWith('UPDATE TAGS SET COUNT = COUNT + 1 WHERE LOWER(NAME) = ?')) {
    const [lowerName] = params;
    db.tags = db.tags.map(t => t.name.toLowerCase() === lowerName.toLowerCase() ? { ...t, count: (t.count || 0) + 1 } : t);
    saveDb(db);
    return { changes: 1 };
  }

  // 6. UPDATE TAGS SET CATEGORY = ? WHERE LOWER(NAME) = ?
  if (normalizedSql.startsWith('UPDATE TAGS SET CATEGORY = ? WHERE LOWER(NAME) = ?')) {
    const [category, lowerName] = params;
    db.tags = db.tags.map(t => t.name.toLowerCase() === lowerName.toLowerCase() ? { ...t, category } : t);
    saveDb(db);
    return { changes: 1 };
  }

  // 7. INSERT OR IGNORE INTO TAGS (NAME, CATEGORY, COUNT) VALUES (?, ?, ?) / INSERT INTO TAGS
  if (normalizedSql.startsWith('INSERT OR IGNORE INTO TAGS') || normalizedSql.startsWith('INSERT INTO TAGS')) {
    const [name, category, count] = params;
    const exists = db.tags.some(t => t.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      db.tags.push({ name: name.toLowerCase(), category, count: count || 1 });
      saveDb(db);
    } else {
      db.tags = db.tags.map(t => t.name.toLowerCase() === name.toLowerCase() ? { ...t, count: (t.count || 0) + (count || 1) } : t);
      saveDb(db);
    }
    return { changes: 1 };
  }

  // 8. INSERT OR REPLACE INTO POSTS / INSERT INTO POSTS
  if (normalizedSql.startsWith('INSERT OR REPLACE INTO POSTS') || normalizedSql.startsWith('INSERT INTO POSTS')) {
    const [
      id, title, url, rating, score, elo, uploader, source_url, description,
      tags, cover_url, is_game, version, screenshots, download_pc, download_mobile,
      device_compatibility, created_at
    ] = params;

    const newPost = {
      id, title, url, rating, score, elo, uploader, source_url, description,
      tags, cover_url, is_game, version, screenshots, download_pc, download_mobile,
      device_compatibility, created_at
    };

    db.posts = db.posts.filter(p => p.id !== id);
    db.posts.push(newPost);
    saveDb(db);
    return { changes: 1 };
  }

  // 9. INSERT OR REPLACE INTO COMMENTS / INSERT INTO COMMENTS
  if (normalizedSql.startsWith('INSERT OR REPLACE INTO COMMENTS') || normalizedSql.startsWith('INSERT INTO COMMENTS')) {
    const [id, post_id, author, text, created_at, likes] = params;
    const newComment = { id, post_id, author, text, created_at, likes };

    db.comments = db.comments.filter(c => c.id !== id);
    db.comments.push(newComment);
    saveDb(db);
    return { changes: 1 };
  }

  // 10. UPDATE POSTS SET TITLE = COALESCE(?, TITLE), ... WHERE ID = ?
  if (normalizedSql.includes('UPDATE POSTS SET')) {
    const postId = params[params.length - 1];
    db.posts = db.posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          title: params[0] !== null ? params[0] : p.title,
          url: params[1] !== null ? params[1] : p.url,
          rating: params[2] !== null ? params[2] : p.rating,
          source_url: params[3] !== undefined ? params[3] : p.source_url,
          description: params[4] !== undefined ? params[4] : p.description,
          tags: params[5] !== null ? params[5] : p.tags,
          cover_url: params[6] !== undefined ? params[6] : p.cover_url
        };
      }
      return p;
    });
    saveDb(db);
    return { changes: 1 };
  }

  // 11. CREATE TABLE
  if (normalizedSql.startsWith('CREATE TABLE')) {
    return { changes: 0 };
  }

  console.warn('[JSON-DB] Unhandled runQuery SQL:', sql, 'Params:', params);
  return { changes: 0 };
}

async function getQuery(sql: string, params: any[] = []): Promise<any> {
  const db = loadDb();
  const normalizedSql = sql.replace(/\s+/g, ' ').trim().toUpperCase();

  // 1. SELECT COUNT(*) AS COUNT FROM POSTS
  if (normalizedSql.startsWith('SELECT COUNT(*) AS COUNT FROM POSTS')) {
    return { count: db.posts.length };
  }

  // 2. SELECT NAME FROM TAGS WHERE LOWER(NAME) = ?
  if (normalizedSql.startsWith('SELECT NAME FROM TAGS WHERE LOWER(NAME) = ?')) {
    const [lowerName] = params;
    const found = db.tags.find(t => t.name.toLowerCase() === lowerName.toLowerCase());
    return found ? { name: found.name } : null;
  }

  // 3. SELECT * FROM TAGS WHERE LOWER(NAME) = ?
  if (normalizedSql.startsWith('SELECT * FROM TAGS WHERE LOWER(NAME) = ?')) {
    const [lowerName] = params;
    const found = db.tags.find(t => t.name.toLowerCase() === lowerName.toLowerCase());
    return found || null;
  }

  // 4. SELECT SCORE FROM POSTS WHERE ID = ?
  if (normalizedSql.startsWith('SELECT SCORE FROM POSTS WHERE ID = ?')) {
    const [postId] = params;
    const found = db.posts.find(p => p.id === postId);
    return found ? { score: found.score } : null;
  }

  // 5. SELECT * FROM POSTS WHERE ID = ?
  if (normalizedSql.startsWith('SELECT * FROM POSTS WHERE ID = ?')) {
    const [postId] = params;
    const found = db.posts.find(p => p.id === postId);
    return found || null;
  }

  console.warn('[JSON-DB] Unhandled getQuery SQL:', sql, 'Params:', params);
  return null;
}

async function allQuery(sql: string, params: any[] = []): Promise<any[]> {
  const db = loadDb();
  const normalizedSql = sql.replace(/\s+/g, ' ').trim().toUpperCase();

  // 1. SELECT * FROM POSTS
  if (normalizedSql.startsWith('SELECT * FROM POSTS')) {
    return db.posts;
  }

  // 2. SELECT * FROM TAGS
  if (normalizedSql.startsWith('SELECT * FROM TAGS')) {
    return db.tags;
  }

  // 3. SELECT * FROM COMMENTS WHERE POST_ID = ?
  if (normalizedSql.startsWith('SELECT * FROM COMMENTS WHERE POST_ID = ?')) {
    const [postId] = params;
    return db.comments.filter(c => c.post_id === postId);
  }

  console.warn('[JSON-DB] Unhandled allQuery SQL:', sql, 'Params:', params);
  return [];
}

// Database initial bootstrapping
async function initDatabase() {
  loadDb();
  console.log('[JSON-DB] File-based database boot completed successfully.');
}

// Call db initializer
initDatabase().catch(err => {
  console.error('[JSON-DB] Database initialization failed:', err);
});

// Automatically ensure correct categories for added tags
async function ensureTagsExistOnServer(tagNames: string[]) {
  if (!tagNames || tagNames.length === 0) return;
  try {
    for (const name of tagNames) {
      const lowerName = name.toLowerCase();
      const existing = await getQuery('SELECT name FROM tags WHERE LOWER(name) = ?', [lowerName]);
      if (!existing) {
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
        await runQuery('INSERT OR IGNORE INTO tags (name, category, count) VALUES (?, ?, ?)', [name, category, 1]);
      } else {
        await runQuery('UPDATE tags SET count = count + 1 WHERE LOWER(name) = ?', [lowerName]);
      }
    }
  } catch (err: any) {
    console.error('[DATABASE] Error in ensureTagsExistOnServer:', err.message || err);
  }
}

// --- EXPRESS ENDPOINTS ---

// 1. GET ALL POSTS
app.get('/api/posts', async (req, res) => {
  try {
    const rows = await allQuery('SELECT * FROM posts');
    const posts = rows.map((p: any) => ({
      ...p,
      is_game: p.is_game === 1,
      tags: p.tags ? JSON.parse(p.tags) : [],
      screenshots: p.screenshots ? JSON.parse(p.screenshots) : []
    }));

    // Sorting posts on descending datetime order
    posts.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Separate standard posts: do not mix if custom posts exist
    const initialPostIds = new Set(INITIAL_POSTS.map(p => p.id));
    const customPosts = posts.filter((p: any) => p && p.id && !initialPostIds.has(p.id));
    if (customPosts.length > 0) {
      return res.json(customPosts);
    }

    return res.json(posts);
  } catch (err: any) {
    console.error('[DATABASE] Error fetching posts:', err.message || err);
    return res.json(INITIAL_POSTS);
  }
});

// 2. GET ALL TAGS
app.get('/api/tags', async (req, res) => {
  try {
    const tags = await allQuery('SELECT * FROM tags');
    return res.json(tags.length > 0 ? tags : INITIAL_TAGS);
  } catch (err: any) {
    console.error('[DATABASE] Error fetching tags:', err.message || err);
    return res.json(INITIAL_TAGS);
  }
});

// 3. GET COMMENTS FOR A SPECIFIC POST
app.get('/api/comments/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await allQuery('SELECT * FROM comments WHERE post_id = ?', [postId]);
    comments.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return res.json(comments);
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
      tags: post.tags || [],
      cover_url: post.cover_url || null,
      is_game: post.is_game || false,
      version: post.version || null,
      screenshots: post.screenshots || [],
      download_pc: post.download_pc || null,
      download_mobile: post.download_mobile || null,
      device_compatibility: post.device_compatibility || null,
      created_at: post.created_at || new Date().toISOString()
    };

    await ensureTagsExistOnServer(postToInsert.tags);

    await runQuery(
      `INSERT OR REPLACE INTO posts (
        id, title, url, rating, score, elo, uploader, source_url, description, 
        tags, cover_url, is_game, version, screenshots, download_pc, download_mobile, 
        device_compatibility, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        postToInsert.id,
        postToInsert.title,
        postToInsert.url,
        postToInsert.rating,
        postToInsert.score,
        postToInsert.elo,
        postToInsert.uploader,
        postToInsert.source_url,
        postToInsert.description,
        JSON.stringify(postToInsert.tags),
        postToInsert.cover_url,
        postToInsert.is_game ? 1 : 0,
        postToInsert.version,
        JSON.stringify(postToInsert.screenshots),
        postToInsert.download_pc,
        postToInsert.download_mobile,
        postToInsert.device_compatibility,
        postToInsert.created_at
      ]
    );

    return res.json(postToInsert);
  } catch (err: any) {
    console.error('[DATABASE] Error creating post:', err.message || err);
    return res.status(500).json({ error: err.message });
  }
});

// 5. CREATE NEW COMMENT
app.post('/api/comments', async (req, res) => {
  try {
    const comment = req.body;
    const commentToInsert = {
      id: comment.id || `c_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      post_id: comment.post_id,
      author: comment.author || 'Аноним',
      text: comment.text || '',
      created_at: comment.created_at || new Date().toISOString(),
      likes: comment.likes || 0
    };

    await runQuery(
      `INSERT OR REPLACE INTO comments (id, post_id, author, text, created_at, likes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        commentToInsert.id,
        commentToInsert.post_id,
        commentToInsert.author,
        commentToInsert.text,
        commentToInsert.created_at,
        commentToInsert.likes
      ]
    );

    return res.json(commentToInsert);
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

    await runQuery('UPDATE posts SET tags = ? WHERE id = ?', [JSON.stringify(tags || []), postId]);
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

    const current = await getQuery('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!current) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    await runQuery(
      `UPDATE posts SET 
        title = COALESCE(?, title),
        url = COALESCE(?, url),
        rating = COALESCE(?, rating),
        source_url = ?,
        description = ?,
        tags = COALESCE(?, tags),
        cover_url = ?
      WHERE id = ?`,
      [
        title || null,
        url || null,
        rating || null,
        source_url === undefined ? current.source_url : source_url,
        description === undefined ? current.description : description,
        tags ? JSON.stringify(tags) : null,
        cover_url === undefined ? current.cover_url : cover_url,
        postId
      ]
    );

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

    const tag = await getQuery('SELECT * FROM tags WHERE LOWER(name) = ?', [cleanName]);
    if (tag) {
      await runQuery('UPDATE tags SET category = ? WHERE LOWER(name) = ?', [validCategory, cleanName]);
      return res.json({ name: cleanName, category: validCategory, count: tag.count || 1 });
    } else {
      const newTag = { name: cleanName, category: validCategory, count: 1 };
      await runQuery('INSERT INTO tags (name, category, count) VALUES (?, ?, ?)', [newTag.name, newTag.category, newTag.count]);
      return res.json(newTag);
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

    const post = await getQuery('SELECT score FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const newScore = (post.score || 0) + scoreDelta;
    await runQuery('UPDATE posts SET score = ? WHERE id = ?', [newScore, postId]);
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

    // Delete associated comments from SQLite
    await runQuery('DELETE FROM comments WHERE post_id = ?', [postId]);
    // Delete post from SQLite
    await runQuery('DELETE FROM posts WHERE id = ?', [postId]);

    return res.json({ success: true });
  } catch (err: any) {
    console.error('[DATABASE] Error deleting post:', err.message || err);
    return res.status(500).json({ error: err.message });
  }
});

// Media storage location configurations in the workspace root
const mediaDir = path.resolve(process.cwd(), 'media');
const chunksBaseDir = path.resolve(process.cwd(), 'chunks');

if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}
if (!fs.existsSync(chunksBaseDir)) {
  fs.mkdirSync(chunksBaseDir, { recursive: true });
}

// Serve /media directly, falling back to GitHub raw content if the file doesn't exist locally
app.get('/media/:filename', (req, res) => {
  const filename = req.params.filename;
  const localPath = path.join(mediaDir, filename);

  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }

  // Fallback to GitHub raw files using default user repository
  const owner = process.env.SUGULE_GITHUB_OWNER || 'ssugule';
  const repo = process.env.SUGULE_GITHUB_REPO || 'ssugule.github.io';
  const branch = process.env.SUGULE_GITHUB_BRANCH || 'main';

  const githubRawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/media/${filename}`;
  console.log(`[MEDIA-FALLBACK] Local file '${filename}' not found, redirecting to GitHub Raw: ${githubRawUrl}`);
  return res.redirect(githubRawUrl);
});

// HIGH PERFORMANCE UNIFIED BACKEND UPLOAD AND COMPRESSION PIPELINE (LOCAL STORAGE ONLY)
async function handleUnifiedUploadAndCompression(
  fileBuffer: Buffer,
  safeName: string,
  ext: string,
  fileType: string
): Promise<{ url?: string; error?: string; message?: string }> {

  const isVideo = fileType.startsWith('video/') || ['mp4', 'webm', 'avi', 'mkv', 'mov'].includes(ext);
  const sizeMb = fileBuffer.length / (1024 * 1024);

  let bufferToSave = fileBuffer;
  let finalName = safeName;

  if (isVideo && fileBuffer.length > 50 * 1024 * 1024) {
    console.log(`[FFMPEG] Large video upload detected: ${sizeMb.toFixed(2)} MB. Initiating high-compression fallback...`);

    const tempInputPath = path.join(mediaDir, `temp_in_${Date.now()}_${safeName}`);
    const tempOutputPath = path.join(mediaDir, `compressed_${Date.now()}_${safeName}`);

    try {
      // Write original file to temp to execute ffmpeg commands offline on disk
      fs.writeFileSync(tempInputPath, fileBuffer);

      // Perform H.264 high efficiency video compression using the globally available ffmpeg binary
      const cmd = `ffmpeg -y -i "${tempInputPath}" -vcodec libx264 -crf 25 -preset fast -acodec aac -b:a 128k "${tempOutputPath}"`;

      await new Promise<void>((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
          if (err) {
            console.error('[FFMPEG] Compression process error:', err, stderr);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      if (fs.existsSync(tempOutputPath)) {
        const compressedStats = fs.statSync(tempOutputPath);
        const compressedSizeMb = compressedStats.size / (1024 * 1024);
        console.log(`[FFMPEG] Compression completed successfully! New size: ${compressedSizeMb.toFixed(2)} MB (Original: ${sizeMb.toFixed(2)} MB)`);

        if (compressedStats.size > 100 * 1024 * 1024) {
          console.warn(`[FFMPEG] Compressed video is still too large (${compressedSizeMb.toFixed(2)} MB). Rejecting...`);
          try {
            fs.unlinkSync(tempInputPath);
            fs.unlinkSync(tempOutputPath);
          } catch (delErr) { /* ignore */ }
          return {
            error: 'TooHeavy',
            message: `Даже после автоматического сжатия видео слишком тяжелое (${compressedSizeMb.toFixed(1)} МБ) и превышает лимит сервера (100 МБ). Пожалуйста, укоротите его или уменьшите разрешение.`
          };
        }

        // Read the compressed buffer to proceed
        bufferToSave = fs.readFileSync(tempOutputPath);
        // Clean up immediately
        try {
          fs.unlinkSync(tempInputPath);
          fs.unlinkSync(tempOutputPath);
        } catch (delErr) { /* ignore */ }
      } else {
        throw new Error('Compressed output file missing on disk.');
      }
    } catch (ffmpegErr: any) {
      console.warn('[FFMPEG] Compression failed or ffmpeg not in PATH. Proceeding with saving standard file.', ffmpegErr.message || ffmpegErr);
      try {
        if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
        if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
      } catch (delErr) { /* ignore */ }

      // If original video size exceeds 100MB limit, we must reject it
      if (sizeMb > 100) {
        return {
          error: 'TooHeavy',
          message: `Видео файл слишком тяжелый (${sizeMb.toFixed(1)} МБ) и превышает максимальный лимит сервера (100 МБ). Пожалуйста, оптимизируйте видео перед загрузкой.`
        };
      }

      console.log(`[FFMPEG] Gracefully proceeding store original video: ${sizeMb.toFixed(2)} MB`);
      bufferToSave = fileBuffer;
    }
  }

  try {
    const localFilePath = path.join(mediaDir, finalName);
    fs.writeFileSync(localFilePath, bufferToSave);

    const fileUrl = `/media/${finalName}`;
    console.log('[STORAGE] Saved uploaded media asset to:', fileUrl);
    return { url: fileUrl };
  } catch (err: any) {
    console.error('[STORAGE] Error writing upload file:', err);
    return { error: 'SaveErr', message: 'Не удалось сохранить файл на сервере.' };
  }
}

// 9A. CHUNKED UPLOAD HANDLERS
app.post('/api/upload-chunk', express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
  try {
    const chunkId = req.header('x-chunk-id') || '';
    const chunkIndexStr = req.header('x-chunk-index') || '';
    const chunkTotalStr = req.header('x-chunk-total') || '';
    const rawFileName = req.header('x-file-name') || '';

    if (!chunkId || chunkIndexStr === '' || !chunkTotalStr) {
      return res.status(400).json({ error: 'Missing chunk metadata headers.' });
    }

    const chunkIndex = parseInt(chunkIndexStr, 10);
    const chunkTotal = parseInt(chunkTotalStr, 10);
    const fileBuffer = req.body;

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: 'Empty chunk payload.' });
    }

    const originalName = decodeURIComponent(rawFileName) || `${Date.now()}_chunk.bin`;
    const safeName = originalName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

    const progressDir = path.join(chunksBaseDir, chunkId);
    if (!fs.existsSync(progressDir)) {
      fs.mkdirSync(progressDir, { recursive: true });
    }

    const chunkFilePath = path.join(progressDir, `${chunkIndex}`);
    fs.writeFileSync(chunkFilePath, fileBuffer);

    console.log(`[CHUNKS] Saved chunk ${chunkIndex + 1}/${chunkTotal} for ID: ${chunkId}`);
    return res.json({ status: 'ok', chunkIndex });
  } catch (err: any) {
    console.error('[CHUNKS] Error saving chunk:', err);
    return res.status(500).json({ error: err.message || err });
  }
});

app.post('/api/upload-complete', express.json(), async (req, res) => {
  try {
    const { chunkId, chunkTotal, fileName, fileType } = req.body;
    if (!chunkId || !chunkTotal || !fileName) {
      return res.status(400).json({ error: 'Missing completion parameters.' });
    }

    const total = parseInt(chunkTotal, 10);
    const progressDir = path.join(chunksBaseDir, chunkId);

    if (!fs.existsSync(progressDir)) {
      return res.status(404).json({ error: 'Chunk folder not found. Upload might have expired.' });
    }

    // Read and verify all chunks exist
    const buffers: Buffer[] = [];
    for (let i = 0; i < total; i++) {
      const chunkFile = path.join(progressDir, `${i}`);
      if (!fs.existsSync(chunkFile)) {
        return res.status(400).json({ error: `Missing chunk index ${i} of total ${total}.` });
      }
      buffers.push(fs.readFileSync(chunkFile));
    }

    // Merge buffers
    const mergedBuffer = Buffer.concat(buffers);
    console.log(`[CHUNKS] Successfully merged ${total} chunks for ${fileName}. Merged size: ${(mergedBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Clean up temporary chunk folder
    try {
      fs.rmSync(progressDir, { recursive: true, force: true });
    } catch (rmErr) {
      console.warn('[CHUNKS] Warning: Failed to clean up chunk directory:', rmErr);
    }

    const originalName = decodeURIComponent(fileName);
    const safeName = originalName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const ext = safeName.split('.').pop()?.toLowerCase() || '';

    // Delegate to the unified processing and compression pipeline
    const result = await handleUnifiedUploadAndCompression(mergedBuffer, safeName, ext, fileType);
    if (result.error === 'TooHeavy') {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err: any) {
    console.error('[CHUNKS] Complete error:', err);
    return res.status(500).json({ error: err.message || err });
  }
});

// 9. FILE UPLOAD HANDLER: SAVES LOCAL MEDIA DIR
app.post('/api/upload', express.raw({ type: '*/*', limit: '100mb' }), async (req, res) => {
  try {
    const rawFileName = req.header('x-file-name') || '';
    const originalName = decodeURIComponent(rawFileName) || `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;

    const safeName = originalName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const ext = safeName.split('.').pop()?.toLowerCase() || '';
    const fileBuffer = req.body;

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).send('Empty file buffer payloads.');
    }

    const fileType = req.header('content-type') || '';
    const result = await handleUnifiedUploadAndCompression(fileBuffer, safeName, ext, fileType);
    if (result.error === 'TooHeavy') {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err: any) {
    console.error('[STORAGE] Critical Express /api/upload error:', err);
    return res.status(500).json({
      error: `Critical server-side storage error: ${err.message || err}`
    });
  }
});

// 10. GET GIT STATUS AND DATABASE METRICS
app.get('/api/git-status', async (req, res) => {
  try {
    const mediaFiles = fs.existsSync(mediaDir) ? fs.readdirSync(mediaDir).filter(f => f !== 'chunks' && !f.startsWith('.')) : [];

    exec('git status --porcelain', (err, stdout, stderr) => {
      const gitOutput = stdout || 'Рабочая директория чиста или git не отслеживается.';
      const lines = gitOutput.split('\n').filter(l => l.trim() !== '');

      let dbSize = 0;
      try {
        if (fs.existsSync(dbPath)) {
          dbSize = fs.statSync(dbPath).size;
        }
      } catch (dbErr) { /* ignore */ }

      return res.json({
        initialized: !err,
        statusLines: lines,
        mediaFilesCount: mediaFiles.length,
        mediaFiles: mediaFiles.slice(0, 30),
        dbSize
      });
    });
  } catch (err: any) {
    return res.json({
      initialized: false,
      statusLines: [],
      mediaFilesCount: 0,
      mediaFiles: [],
      dbSize: 0,
      error: err.message
    });
  }
});

// --- DYNAMIC AUTH & USER STORAGE ROOT ENDPOINTS ---

app.get('/api/users', (req, res) => {
  try {
    const db = loadDb();
    return res.json(db.users || []);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', (req, res) => {
  try {
    const db = loadDb();
    if (!db.users) db.users = [];
    const { username, email, password, nickname } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Имя пользователя, Email и пароль обязательны.' });
    }

    const cleanUser = username.trim().toLowerCase().replace(/\s+/g, '_');
    const exists = db.users.some(u => u.username.toLowerCase() === cleanUser);
    if (exists) {
      return res.status(400).json({ error: 'Пользователь с таким системным именем уже зарегистрирован.' });
    }

    const newUser = {
      username: cleanUser,
      nickname: nickname || username,
      email: email.trim(),
      password: password,
      avatar_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=200&h=200&fit=crop',
      cover_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&h=400&fit=crop',
      description: 'Увлекаюсь booru-архивами и аниме искусством.',
      role: 'user'
    };

    db.users.push(newUser);
    saveDb(db);
    return res.json(newUser);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const db = loadDb();
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Введите имя пользователя/Email и пароль.' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const user = db.users.find(u => u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId);
    
    if (!user) {
      return res.status(400).json({ error: 'Пользователь с такими учетными данными не найден.' });
    }

    if (user.password !== password) {
      return res.status(400).json({ error: 'Неверный пароль. Попробуйте еще раз.' });
    }

    return res.json(user);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/update-profile', (req, res) => {
  try {
    const db = loadDb();
    const { username, fields } = req.body;
    
    const cleanUser = username.trim().toLowerCase();
    const idx = db.users.findIndex(u => u.username.toLowerCase() === cleanUser);
    
    if (idx === -1) {
      return res.status(404).json({ error: 'Пользователь не найден.' });
    }

    db.users[idx] = {
      ...db.users[idx],
      ...fields
    };

    saveDb(db);
    return res.json(db.users[idx]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/db-config', (req, res) => {
  res.json({
    isEnabled: true,
    url: 'SQLITE_PORTABLE',
    key: 'LOCAL_GIT_MEDIA'
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const row = await getQuery('SELECT COUNT(*) as count FROM posts');
    res.json({
      status: 'ok',
      database_host: `JSON file-backed database connected successfully. Current posts count: ${row.count}`
    });
  } catch (err: any) {
    res.json({
      status: 'error',
      message: err.message
    });
  }
});

// Setup dev server or static assets
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
