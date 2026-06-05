var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_path = __toESM(require("path"), 1);
var import_supabase_js = require("@supabase/supabase-js");

// src/sampleData.ts
var INITIAL_TAGS = [
  // Characters
  { name: "hatsune_miku", category: "character" },
  { name: "cyber_girl_v", category: "character" },
  { name: "asuka_langley", category: "character" },
  { name: "zero_two", category: "character" },
  { name: "rem_maid", category: "character" },
  { name: "samurai_cyberpunk", category: "character" },
  { name: "celestial_guardian", category: "character" },
  // Copyrights
  { name: "vocaloid", category: "copyright" },
  { name: "cyberpunk_2077", category: "copyright" },
  { name: "re_zero", category: "copyright" },
  { name: "darling_in_the_franxx", category: "copyright" },
  { name: "neon_genesis_evangelion", category: "copyright" },
  { name: "original", category: "copyright" },
  { name: "roblox", category: "copyright" },
  { name: "zenless_zone_zero", category: "copyright" },
  { name: "genshin_impact", category: "copyright" },
  { name: "brawl_stars", category: "copyright" },
  { name: "pokemon", category: "copyright" },
  // Artists
  { name: "shinkai_m", category: "artist" },
  { name: "kuvshinov_iya", category: "artist" },
  { name: "mihoyo_art", category: "artist" },
  { name: "gemini_ai", category: "artist" },
  { name: "wlop", category: "artist" },
  { name: "ghibli_crew", category: "artist" },
  { name: "maplestar", category: "artist" },
  { name: "d-art", category: "artist" },
  { name: "anna_anon", category: "artist" },
  // General
  { name: "1girl", category: "general" },
  { name: "neon_lighting", category: "general" },
  { name: "cyberpunk", category: "general" },
  { name: "futuristic_city", category: "general" },
  { name: "blue_hair", category: "general" },
  { name: "glowing_eyes", category: "general" },
  { name: "cat_ears", category: "general" },
  { name: "scenic", category: "general" },
  { name: "cherry_blossoms", category: "general" },
  { name: "sword", category: "general" },
  { name: "rain", category: "general" },
  { name: "cozy", category: "general" },
  { name: "clouds", category: "general" },
  { name: "retro", category: "general" },
  { name: "video", category: "general" },
  { name: "femboy", category: "general" },
  // Metadata
  { name: "highres", category: "meta" },
  { name: "digital_art", category: "meta" },
  { name: "concept_art", category: "meta" },
  { name: "wallpaper", category: "meta" }
];
var INITIAL_POSTS = [
  {
    id: "p10",
    url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800",
    rating: "explicit",
    score: 412,
    elo: 1720,
    created_at: "2026-06-02T18:30:00Z",
    uploader: "AnbyLover",
    tags: ["zenless_zone_zero", "maplestar", "video", "1girl", "neon_lighting", "highres", "digital_art"]
  },
  {
    id: "p11",
    url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=800",
    rating: "questionable",
    score: 350,
    elo: 1655,
    created_at: "2026-06-01T22:15:00Z",
    uploader: "TeyvatSailor",
    tags: ["genshin_impact", "d-art", "1girl", "cherry_blossoms", "rain", "highres", "wallpaper"]
  },
  {
    id: "p12",
    url: "https://images.unsplash.com/photo-1541512416146-3cf58d6b27cc?auto=format&fit=crop&q=80&w=800",
    rating: "safe",
    score: 289,
    elo: 1540,
    created_at: "2026-06-02T10:00:00Z",
    uploader: "RobloxianCoder",
    tags: ["roblox", "femboy", "anna_anon", "neon_lighting", "retro", "concept_art"]
  },
  {
    id: "p13",
    url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800",
    rating: "safe",
    score: 198,
    elo: 1480,
    created_at: "2026-05-31T09:30:00Z",
    uploader: "BrawlChampion",
    tags: ["brawl_stars", "d-art", "video", "cyberpunk", "highres"]
  },
  {
    id: "p14",
    url: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800",
    rating: "safe",
    score: 520,
    elo: 1810,
    created_at: "2026-06-03T02:00:00Z",
    uploader: "PikaFanatic",
    tags: ["pokemon", "anna_anon", "cyberpunk", "neon_lighting", "scenic", "wallpaper"]
  },
  {
    id: "p1",
    url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800",
    rating: "safe",
    score: 184,
    elo: 1530,
    created_at: "2026-05-28T12:00:00Z",
    uploader: "SuguleKeeper",
    source_url: "https://unsplash.com/photos/purple-and-blue-lighted-room-stage",
    tags: ["hatsune_miku", "vocaloid", "gemini_ai", "1girl", "neon_lighting", "cyberpunk", "blue_hair", "highres", "digital_art"]
  },
  {
    id: "p2",
    url: "https://images.unsplash.com/photo-1627856013091-fed6e4e30025?auto=format&fit=crop&q=80&w=800",
    rating: "safe",
    score: 221,
    elo: 1610,
    created_at: "2026-05-27T15:30:00Z",
    uploader: "NeoCollector",
    source_url: "https://unsplash.com/photos/female-in-futuristic-suit",
    tags: ["samurai_cyberpunk", "cyberpunk_2077", "shinkai_m", "1girl", "neon_lighting", "cyberpunk", "sword", "rain", "highres", "concept_art"]
  },
  {
    id: "p3",
    url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800",
    rating: "safe",
    score: 95,
    elo: 1420,
    created_at: "2026-05-29T08:15:00Z",
    uploader: "GhibliLover",
    tags: ["original", "ghibli_crew", "cozy", "scenic", "clouds", "retro", "highres", "wallpaper"]
  },
  {
    id: "p4",
    url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=800",
    rating: "safe",
    score: 147,
    elo: 1495,
    created_at: "2026-05-26T20:45:00Z",
    uploader: "StarWatcher",
    tags: ["celestial_guardian", "original", "wlop", "1girl", "scenic", "clouds", "glowing_eyes", "highres", "digital_art"]
  },
  {
    id: "p5",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800",
    rating: "safe",
    score: 312,
    elo: 1680,
    created_at: "2026-05-25T11:20:00Z",
    uploader: "ThirdChild",
    tags: ["asuka_langley", "neon_genesis_evangelion", "kuvshinov_iya", "cyberpunk", "neon_lighting", "digital_art", "wallpaper"]
  },
  {
    id: "p6",
    url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=800",
    rating: "questionable",
    score: 189,
    elo: 1515,
    created_at: "2026-05-24T18:00:00Z",
    uploader: "FranxxPilot",
    tags: ["zero_two", "darling_in_the_franxx", "mihoyo_art", "1girl", "glowing_eyes", "neon_lighting", "concept_art", "highres"]
  },
  {
    id: "p7",
    url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=800",
    rating: "questionable",
    score: 135,
    elo: 1470,
    created_at: "2026-05-23T09:40:00Z",
    uploader: "SubaruKun",
    tags: ["rem_maid", "re_zero", "kuvshinov_iya", "1girl", "blue_hair", "cat_ears", "scenic", "digital_art"]
  },
  {
    id: "p8",
    url: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&q=80&w=800",
    rating: "safe",
    score: 104,
    elo: 1445,
    created_at: "2026-05-22T23:10:00Z",
    uploader: "GlitchRunner",
    tags: ["cyber_girl_v", "cyberpunk_2077", "gemini_ai", "1girl", "cat_ears", "neon_lighting", "cyberpunk", "glowing_eyes", "highres"]
  },
  {
    id: "p9",
    url: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&q=80&w=800",
    rating: "safe",
    score: 172,
    elo: 1520,
    created_at: "2026-05-21T14:50:00Z",
    uploader: "MikuHype",
    tags: ["hatsune_miku", "vocaloid", "wlop", "scenic", "cherry_blossoms", "rain", "wallpaper", "concept_art"]
  },
  {
    id: "game_1",
    title: "Neon Odyssey RPG",
    url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800",
    rating: "safe",
    score: 180,
    elo: 1600,
    created_at: "2026-06-04T12:00:00Z",
    uploader: "CyberStudio",
    source_url: "https://github.com/example/neon-odyssey",
    description: "A 2D cyberpunk tactical RPG set in the glowing streets of Neo-Tokyo. Navigate through complex choices and deep grid fights.",
    tags: ["cyberpunk", "rpg", "game", "neon_lighting", "tactical"],
    is_game: true,
    version: "v1.4.2-beta",
    screenshots: [
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1541512416146-3cf58d6b27cc?auto=format&fit=crop&q=80&w=800"
    ],
    download_pc: "https://example.com/neon-odyssey-pc.zip",
    download_mobile: "https://example.com/neon-odyssey-mobile.apk",
    device_compatibility: "all"
  },
  {
    id: "game_2",
    title: "Fantasy Quest: Pixel World",
    url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=800",
    rating: "safe",
    score: 95,
    elo: 1480,
    created_at: "2026-06-03T10:30:00Z",
    uploader: "RemDev",
    description: "Charming retro pixel platformer compatible fully with mobile touch screens or physical gamepads. Explore deep mystical caves.",
    tags: ["retro", "pixels", "game", "platformer", "cozy"],
    is_game: true,
    version: "v0.9-alpha",
    screenshots: [
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800"
    ],
    download_pc: "https://example.com/fantasy-quest-pc.exe",
    device_compatibility: "pc"
  },
  {
    id: "game_3",
    title: "Starship Academy Touch",
    url: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&q=80&w=800",
    rating: "safe",
    score: 110,
    elo: 1510,
    created_at: "2026-06-02T15:45:00Z",
    uploader: "HelixStudio",
    description: "An interactive visual novel tailored specifically for smartphones with sleek adaptive swipe gestures and animated sci-fi character cards.",
    tags: ["novel", "interactive", "game", "cyberpunk", "1girl"],
    is_game: true,
    version: "",
    screenshots: [
      "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800"
    ],
    download_mobile: "https://example.com/starship-academy.apk",
    device_compatibility: "mobile"
  }
];
var INITIAL_COMMENTS = [
  {
    id: "c1",
    post_id: "p1",
    author: "miku_fan_99",
    text: "Oh my god, the neon lighting in this artwork is absolutely stunning! Fits her cyberdiva persona so well.",
    created_at: "2026-05-28T14:22:00Z",
    likes: 12
  },
  {
    id: "c2",
    post_id: "p1",
    author: "VaporGaze",
    text: "Is this gemini_ai? The hands are actually perfect. High-quality prompt engineering here.",
    created_at: "2026-05-28T15:05:00Z",
    likes: 4
  },
  {
    id: "c3",
    post_id: "p2",
    author: "RoninZero",
    text: "Amazing composition! The crimson highlights on the energy katana blade really draw the eyes in.",
    created_at: "2026-05-27T17:40:00Z",
    likes: 19
  },
  {
    id: "c4",
    post_id: "p5",
    author: "ShinjiSitsOnChair",
    text: "The geometric grid halos represent the mind struggles so accurately. Incredible design, instantly set as my home wallpaper.",
    created_at: "2026-05-25T13:10:00Z",
    likes: 25
  },
  {
    id: "c5",
    post_id: "p6",
    author: "StreliziaX",
    text: "Questions are rising... Is setting up a connection to the pilot mech rating acceptable here? Yes, 10/10.",
    created_at: "2026-05-24T19:25:00Z",
    likes: 8
  }
];

// server.ts
import_dotenv.default.config();
var app = (0, import_express.default)();
app.use(import_express.default.json());
var PORT = 3e3;
var stripQuotes = (str) => {
  let s = str ? str.trim() : "";
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1).trim();
  if (s.startsWith("'") && s.endsWith("'")) s = s.slice(1, -1).trim();
  return s;
};
var rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
var rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
var supabaseUrl = stripQuotes(rawUrl);
var supabaseKey = stripQuotes(rawKey);
var fallbackUrl = "https://erularobdstwkqtfemwh.supabase.co";
var fallbackKey = "sb_secret_2tC5crIRKxtTUAAkzXvZ7g_7LMHI0d-";
if (!supabaseUrl || supabaseUrl === "undefined" || !/^https?:\/\//i.test(supabaseUrl)) {
  console.warn('[SUPABASE] URL is empty, "undefined", or invalid. Using stable fallback URL.');
  supabaseUrl = fallbackUrl;
}
if (!supabaseKey || supabaseKey === "undefined") {
  console.warn('[SUPABASE] Key is empty or "undefined". Using stable fallback Key.');
  supabaseKey = fallbackKey;
}
console.log("[SUPABASE] Server-side initialization target URL:", supabaseUrl);
var supabase;
try {
  supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
} catch (clientErr) {
  console.error("[SUPABASE] Critical client instantiation failure. Re-initializing with stable default parameters:", clientErr.message || clientErr);
  supabase = (0, import_supabase_js.createClient)(fallbackUrl, fallbackKey, {
    auth: { persistSession: false }
  });
}
async function initStorageBucket() {
  try {
    const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
    if (listErr) {
      console.warn("[STORAGE] Could not list storage buckets:", listErr.message);
      return;
    }
    const mediaExists = buckets?.some((b) => b.name === "media");
    if (!mediaExists) {
      console.log('[STORAGE] Public bucket "media" not found. Creating automatic public "media" bucket...');
      const { error: makeBucketErr } = await supabase.storage.createBucket("media", {
        public: true,
        fileSizeLimit: 52428800
        // 50MB maximum asset size
      });
      if (makeBucketErr) {
        console.warn('[STORAGE] Failed to auto-create public bucket "media":', makeBucketErr.message);
      } else {
        console.log('[STORAGE] Successfully created and exposed "media" public storage bucket!');
      }
    } else {
      console.log('[STORAGE] Public bucket "media" already detected on Cloud Supabase.');
    }
  } catch (err) {
    console.error("[STORAGE] Storage initialization warning (likely unconfigured credentials):", err.message || err);
  }
}
initStorageBucket();
async function ensureTagsExistOnServer(tagNames) {
  if (!tagNames || tagNames.length === 0) return;
  try {
    const { data: existingTags, error: selectErr } = await supabase.from("tags").select("name").in("name", tagNames);
    if (selectErr) throw selectErr;
    const existingNames = (existingTags || []).map((t) => t.name.toLowerCase());
    const missingNames = tagNames.filter((name) => !existingNames.includes(name.toLowerCase()));
    if (missingNames.length > 0) {
      const newTags = missingNames.map((name) => {
        let category = "general";
        const lowerName = name.toLowerCase();
        if (lowerName.endsWith("_maid") || lowerName.includes("miku") || lowerName.includes("asuka") || lowerName.includes("girl")) {
          category = "character";
        } else if (lowerName.includes("vocaloid") || lowerName.includes("cyberpunk") || lowerName.includes("original")) {
          category = "copyright";
        } else if (lowerName.endsWith("_art") || lowerName.includes("shinkai") || lowerName.includes("wlop")) {
          category = "artist";
        } else if (lowerName.includes("highres") || lowerName.includes("wallpaper")) {
          category = "meta";
        }
        return { name, category, count: 1 };
      });
      await supabase.from("tags").insert(newTags);
    }
  } catch (err) {
    console.error("[DATABASE] Error in ensureTagsExistOnServer:", err.message || err);
  }
}
app.get("/api/posts", async (req, res) => {
  try {
    const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    let posts = data || [];
    if (posts.length === 0) {
      console.log("[DATABASE] Seeding detected: empty table. Populating fallback INITIAL_POSTS and tags...");
      try {
        if (INITIAL_TAGS.length > 0) {
          const formattedTags = INITIAL_TAGS.map((t) => ({ name: t.name, category: t.category }));
          try {
            await supabase.from("tags").insert(formattedTags);
          } catch (e) {
            console.warn("[DATABASE] Quiet tag seed insertion hint:", e);
          }
        }
        const postsToInsert = INITIAL_POSTS.map((p) => ({
          id: p.id,
          title: p.title || "",
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
        const { error: postsSeedErr, data: seededPosts } = await supabase.from("posts").insert(postsToInsert).select();
        if (postsSeedErr) throw postsSeedErr;
        if (seededPosts && seededPosts.length > 0) {
          posts = seededPosts;
          console.log(`[DATABASE] Seeding complete! Succesfully loaded ${seededPosts.length} posts.`);
          const commentsToInsert = INITIAL_COMMENTS.map((c) => ({
            id: c.id,
            post_id: c.post_id,
            author: c.author,
            text: c.text,
            created_at: c.created_at,
            likes: c.likes || 0
          }));
          try {
            await supabase.from("comments").insert(commentsToInsert);
          } catch (e) {
            console.warn("[DATABASE] Quiet comments seed insertion hint:", e);
          }
        }
      } catch (seedErr) {
        console.error("[DATABASE] Seeding routine failed:", seedErr.message || seedErr);
      }
    }
    return res.json(posts);
  } catch (err) {
    console.error("[DATABASE] Error fetching posts:", err.message || err);
    return res.json(INITIAL_POSTS);
  }
});
app.get("/api/tags", async (req, res) => {
  try {
    const { data, error } = await supabase.from("tags").select("*");
    if (error) throw error;
    return res.json(data || INITIAL_TAGS);
  } catch (err) {
    console.error("[DATABASE] Error fetching tags:", err.message || err);
    return res.json(INITIAL_TAGS);
  }
});
app.get("/api/comments/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const { data, error } = await supabase.from("comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error("[DATABASE] Error fetching comments:", err.message || err);
    return res.json([]);
  }
});
app.post("/api/posts", async (req, res) => {
  try {
    const post = req.body;
    const postToInsert = {
      id: post.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title: post.title || "Untitled",
      url: post.url,
      rating: post.rating || "safe",
      score: post.score || 1,
      elo: post.elo || 1500,
      uploader: post.uploader || "\u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440",
      source_url: post.source_url || null,
      description: post.description || null,
      tags: post.tags || []
    };
    await ensureTagsExistOnServer(postToInsert.tags);
    const { data, error } = await supabase.from("posts").insert([postToInsert]).select();
    if (error) throw error;
    return res.json(data && data[0] ? data[0] : postToInsert);
  } catch (err) {
    console.error("[DATABASE] Error creating post:", err.message || err);
    return res.status(500).json({ error: err.message });
  }
});
app.post("/api/comments", async (req, res) => {
  try {
    const comment = req.body;
    const { data, error } = await supabase.from("comments").insert([comment]).select();
    if (error) throw error;
    return res.json(data && data[0] ? data[0] : comment);
  } catch (err) {
    console.error("[DATABASE] Error creating comment:", err.message || err);
    return res.status(500).json({ error: err.message });
  }
});
app.put("/api/posts/:postId/tags", async (req, res) => {
  try {
    const { postId } = req.params;
    const { tags } = req.body;
    await ensureTagsExistOnServer(tags);
    const { error } = await supabase.from("posts").update({ tags }).eq("id", postId);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error("[DATABASE] Error updating post tags:", err.message || err);
    return res.status(500).json({ error: err.message });
  }
});
app.put("/api/posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, url, rating, source_url, description, tags, cover_url } = req.body;
    if (tags) {
      await ensureTagsExistOnServer(tags);
    }
    const { error } = await supabase.from("posts").update({
      title,
      url,
      rating,
      source_url,
      description,
      tags,
      cover_url
    }).eq("id", postId);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error("[DATABASE] Error updating post details:", err.message || err);
    return res.status(500).json({ error: err.message });
  }
});
app.post("/api/tags", async (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name) return res.status(400).json({ error: "Tag name is required." });
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, "_");
    const validCategory = ["character", "copyright", "artist", "general", "meta"].includes(category) ? category : "general";
    const { data: existing, error: selectErr } = await supabase.from("tags").select("name, category").eq("name", cleanName).maybeSingle();
    if (existing) {
      const { data: updated, error: updateErr } = await supabase.from("tags").update({ category: validCategory }).eq("name", cleanName).select();
      if (updateErr) throw updateErr;
      return res.json(updated && updated[0] ? updated[0] : { name: cleanName, category: validCategory });
    } else {
      const { data: inserted, error: insertErr } = await supabase.from("tags").insert([{ name: cleanName, category: validCategory, count: 1 }]).select();
      if (insertErr) throw insertErr;
      return res.json(inserted && inserted[0] ? inserted[0] : { name: cleanName, category: validCategory, count: 1 });
    }
  } catch (err) {
    console.error("[DATABASE] Error saving tag with custom category:", err.message || err);
    return res.status(500).json({ error: err.message || "Error saving tag." });
  }
});
app.post("/api/posts/:postId/vote", async (req, res) => {
  try {
    const { postId } = req.params;
    const { scoreDelta } = req.body;
    const { data: current, error: fetchErr } = await supabase.from("posts").select("score").eq("id", postId).single();
    if (fetchErr) throw fetchErr;
    const newScore = (current?.score || 0) + scoreDelta;
    const { error: updateErr } = await supabase.from("posts").update({ score: newScore }).eq("id", postId);
    if (updateErr) throw updateErr;
    return res.json({ score: newScore });
  } catch (err) {
    console.error("[DATABASE] Error voting on post:", err.message || err);
    return res.status(500).json({ error: err.message });
  }
});
app.delete("/api/posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    await supabase.from("comments").delete().eq("post_id", postId);
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error("[DATABASE] Error deleting post:", err.message || err);
    return res.status(500).json({ error: err.message });
  }
});
app.post("/api/upload", import_express.default.raw({ type: "*/*", limit: "50mb" }), async (req, res) => {
  try {
    const rawFileName = req.header("x-file-name") || "";
    const fileName = decodeURIComponent(rawFileName) || `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;
    const fileBuffer = req.body;
    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).send("Empty file buffer payloads.");
    }
    const ext = fileName.split(".").pop()?.toLowerCase();
    let contentType = "image/png";
    if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    else if (ext === "gif") contentType = "image/gif";
    else if (ext === "mp4") contentType = "video/mp4";
    else if (ext === "webm") contentType = "video/webm";
    else if (ext === "mp3") contentType = "audio/mpeg";
    else if (ext === "pdf") contentType = "application/pdf";
    console.log(`[STORAGE] Uploading file to clean Supabase media bucket path: ${fileName} (${contentType})`);
    const { data, error: uploadErr } = await supabase.storage.from("media").upload(fileName, fileBuffer, {
      contentType,
      cacheControl: "3600",
      upsert: true
    });
    if (uploadErr) {
      console.error("[STORAGE] Supabase upload failed:", uploadErr.message || uploadErr);
      return res.status(500).json({
        error: `Supabase Storage upload error: ${uploadErr.message || JSON.stringify(uploadErr)}. Ephemeral local disk upload fallback is disabled by administrative policy!`
      });
    }
    const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(fileName);
    if (publicUrlData && publicUrlData.publicUrl) {
      console.log("[STORAGE] Supabase Permanent Storage saved URL successfully:", publicUrlData.publicUrl);
      return res.json({ url: publicUrlData.publicUrl });
    }
    return res.status(500).json({
      error: "Failed to retrieve public URL from Supabase storage after successful write."
    });
  } catch (err) {
    console.error("[STORAGE] Critical Express /api/upload error:", err);
    return res.status(500).json({
      error: `Critical server-side storage error: ${err.message || err}. Ephemeral local disk upload fallback is completely disabled.`
    });
  }
});
app.get("/api/supabase-config", (req, res) => {
  res.json({
    url: supabaseUrl,
    key: "PUBLIC-PROXY-ACTIVE"
    // completely hidden sensitive keys from inspect consoles
  });
});
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database_host: "Express server connected to " + supabaseUrl
  });
});
async function startServer() {
  const isProd = process.env.NODE_ENV === "production" || process.argv[1] && (process.argv[1].includes("dist/server.cjs") || process.argv[1].includes("server.cjs"));
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Running full-stack Express server in DEVELOPMENT mode with Vite middleware.");
  } else {
    const distPath = import_path.default.resolve(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.resolve(distPath, "index.html"));
    });
    console.log("Running full-stack Express server in PRODUCTION mode with compiled assets.");
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on absolute port ${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Fatal startup failure:", err);
});
//# sourceMappingURL=server.cjs.map
