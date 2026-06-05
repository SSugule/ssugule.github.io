import { Post, Tag, Comment } from './types';

export const INITIAL_TAGS: Tag[] = [
  // Characters
  { name: 'hatsune_miku', category: 'character' },
  { name: 'cyber_girl_v', category: 'character' },
  { name: 'asuka_langley', category: 'character' },
  { name: 'zero_two', category: 'character' },
  { name: 'rem_maid', category: 'character' },
  { name: 'samurai_cyberpunk', category: 'character' },
  { name: 'celestial_guardian', category: 'character' },
  
  // Copyrights
  { name: 'vocaloid', category: 'copyright' },
  { name: 'cyberpunk_2077', category: 'copyright' },
  { name: 're_zero', category: 'copyright' },
  { name: 'darling_in_the_franxx', category: 'copyright' },
  { name: 'neon_genesis_evangelion', category: 'copyright' },
  { name: 'original', category: 'copyright' },
  { name: 'roblox', category: 'copyright' },
  { name: 'zenless_zone_zero', category: 'copyright' },
  { name: 'genshin_impact', category: 'copyright' },
  { name: 'brawl_stars', category: 'copyright' },
  { name: 'pokemon', category: 'copyright' },
  
  // Artists
  { name: 'shinkai_m', category: 'artist' },
  { name: 'kuvshinov_iya', category: 'artist' },
  { name: 'mihoyo_art', category: 'artist' },
  { name: 'gemini_ai', category: 'artist' },
  { name: 'wlop', category: 'artist' },
  { name: 'ghibli_crew', category: 'artist' },
  { name: 'maplestar', category: 'artist' },
  { name: 'd-art', category: 'artist' },
  { name: 'anna_anon', category: 'artist' },

  // General
  { name: '1girl', category: 'general' },
  { name: 'neon_lighting', category: 'general' },
  { name: 'cyberpunk', category: 'general' },
  { name: 'futuristic_city', category: 'general' },
  { name: 'blue_hair', category: 'general' },
  { name: 'glowing_eyes', category: 'general' },
  { name: 'cat_ears', category: 'general' },
  { name: 'scenic', category: 'general' },
  { name: 'cherry_blossoms', category: 'general' },
  { name: 'sword', category: 'general' },
  { name: 'rain', category: 'general' },
  { name: 'cozy', category: 'general' },
  { name: 'clouds', category: 'general' },
  { name: 'retro', category: 'general' },
  { name: 'video', category: 'general' },
  { name: 'femboy', category: 'general' },
  
  // Metadata
  { name: 'highres', category: 'meta' },
  { name: 'digital_art', category: 'meta' },
  { name: 'concept_art', category: 'meta' },
  { name: 'wallpaper', category: 'meta' }
];

export const INITIAL_POSTS: Post[] = [
  {
    id: 'p10',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800',
    rating: 'explicit',
    score: 412,
    elo: 1720,
    created_at: '2026-06-02T18:30:00Z',
    uploader: 'AnbyLover',
    tags: ['zenless_zone_zero', 'maplestar', 'video', '1girl', 'neon_lighting', 'highres', 'digital_art']
  },
  {
    id: 'p11',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=800',
    rating: 'questionable',
    score: 350,
    elo: 1655,
    created_at: '2026-06-01T22:15:00Z',
    uploader: 'TeyvatSailor',
    tags: ['genshin_impact', 'd-art', '1girl', 'cherry_blossoms', 'rain', 'highres', 'wallpaper']
  },
  {
    id: 'p12',
    url: 'https://images.unsplash.com/photo-1541512416146-3cf58d6b27cc?auto=format&fit=crop&q=80&w=800',
    rating: 'safe',
    score: 289,
    elo: 1540,
    created_at: '2026-06-02T10:00:00Z',
    uploader: 'RobloxianCoder',
    tags: ['roblox', 'femboy', 'anna_anon', 'neon_lighting', 'retro', 'concept_art']
  },
  {
    id: 'p13',
    url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800',
    rating: 'safe',
    score: 198,
    elo: 1480,
    created_at: '2026-05-31T09:30:00Z',
    uploader: 'BrawlChampion',
    tags: ['brawl_stars', 'd-art', 'video', 'cyberpunk', 'highres']
  },
  {
    id: 'p14',
    url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800',
    rating: 'safe',
    score: 520,
    elo: 1810,
    created_at: '2026-06-03T02:00:00Z',
    uploader: 'PikaFanatic',
    tags: ['pokemon', 'anna_anon', 'cyberpunk', 'neon_lighting', 'scenic', 'wallpaper']
  },
  {
    id: 'p1',
    url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800',
    rating: 'safe',
    score: 184,
    elo: 1530,
    created_at: '2026-05-28T12:00:00Z',
    uploader: 'SuguleKeeper',
    source_url: 'https://unsplash.com/photos/purple-and-blue-lighted-room-stage',
    tags: ['hatsune_miku', 'vocaloid', 'gemini_ai', '1girl', 'neon_lighting', 'cyberpunk', 'blue_hair', 'highres', 'digital_art']
  },
  {
    id: 'p2',
    url: 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?auto=format&fit=crop&q=80&w=800',
    rating: 'safe',
    score: 221,
    elo: 1610,
    created_at: '2026-05-27T15:30:00Z',
    uploader: 'NeoCollector',
    source_url: 'https://unsplash.com/photos/female-in-futuristic-suit',
    tags: ['samurai_cyberpunk', 'cyberpunk_2077', 'shinkai_m', '1girl', 'neon_lighting', 'cyberpunk', 'sword', 'rain', 'highres', 'concept_art']
  },
  {
    id: 'p3',
    url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800',
    rating: 'safe',
    score: 95,
    elo: 1420,
    created_at: '2026-05-29T08:15:00Z',
    uploader: 'GhibliLover',
    tags: ['original', 'ghibli_crew', 'cozy', 'scenic', 'clouds', 'retro', 'highres', 'wallpaper']
  },
  {
    id: 'p4',
    url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=800',
    rating: 'safe',
    score: 147,
    elo: 1495,
    created_at: '2026-05-26T20:45:00Z',
    uploader: 'StarWatcher',
    tags: ['celestial_guardian', 'original', 'wlop', '1girl', 'scenic', 'clouds', 'glowing_eyes', 'highres', 'digital_art']
  },
  {
    id: 'p5',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
    rating: 'safe',
    score: 312,
    elo: 1680,
    created_at: '2026-05-25T11:20:00Z',
    uploader: 'ThirdChild',
    tags: ['asuka_langley', 'neon_genesis_evangelion', 'kuvshinov_iya', 'cyberpunk', 'neon_lighting', 'digital_art', 'wallpaper']
  },
  {
    id: 'p6',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=800',
    rating: 'questionable',
    score: 189,
    elo: 1515,
    created_at: '2026-05-24T18:00:00Z',
    uploader: 'FranxxPilot',
    tags: ['zero_two', 'darling_in_the_franxx', 'mihoyo_art', '1girl', 'glowing_eyes', 'neon_lighting', 'concept_art', 'highres']
  },
  {
    id: 'p7',
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=800',
    rating: 'questionable',
    score: 135,
    elo: 1470,
    created_at: '2026-05-23T09:40:00Z',
    uploader: 'SubaruKun',
    tags: ['rem_maid', 're_zero', 'kuvshinov_iya', '1girl', 'blue_hair', 'cat_ears', 'scenic', 'digital_art']
  },
  {
    id: 'p8',
    url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&q=80&w=800',
    rating: 'safe',
    score: 104,
    elo: 1445,
    created_at: '2026-05-22T23:10:00Z',
    uploader: 'GlitchRunner',
    tags: ['cyber_girl_v', 'cyberpunk_2077', 'gemini_ai', '1girl', 'cat_ears', 'neon_lighting', 'cyberpunk', 'glowing_eyes', 'highres']
  },
  {
    id: 'p9',
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&q=80&w=800',
    rating: 'safe',
    score: 172,
    elo: 1520,
    created_at: '2026-05-21T14:50:00Z',
    uploader: 'MikuHype',
    tags: ['hatsune_miku', 'vocaloid', 'wlop', 'scenic', 'cherry_blossoms', 'rain', 'wallpaper', 'concept_art']
  }
];

export const INITIAL_COMMENTS: Comment[] = [
  {
    id: 'c1',
    post_id: 'p1',
    author: 'miku_fan_99',
    text: 'Oh my god, the neon lighting in this artwork is absolutely stunning! Fits her cyberdiva persona so well.',
    created_at: '2026-05-28T14:22:00Z',
    likes: 12
  },
  {
    id: 'c2',
    post_id: 'p1',
    author: 'VaporGaze',
    text: 'Is this gemini_ai? The hands are actually perfect. High-quality prompt engineering here.',
    created_at: '2026-05-28T15:05:00Z',
    likes: 4
  },
  {
    id: 'c3',
    post_id: 'p2',
    author: 'RoninZero',
    text: 'Amazing composition! The crimson highlights on the energy katana blade really draw the eyes in.',
    created_at: '2026-05-27T17:40:00Z',
    likes: 19
  },
  {
    id: 'c4',
    post_id: 'p5',
    author: 'ShinjiSitsOnChair',
    text: 'The geometric grid halos represent the mind struggles so accurately. Incredible design, instantly set as my home wallpaper.',
    created_at: '2026-05-25T13:10:00Z',
    likes: 25
  },
  {
    id: 'c5',
    post_id: 'p6',
    author: 'StreliziaX',
    text: 'Questions are rising... Is setting up a connection to the pilot mech rating acceptable here? Yes, 10/10.',
    created_at: '2026-05-24T19:25:00Z',
    likes: 8
  }
];
