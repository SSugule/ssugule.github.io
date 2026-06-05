import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Upload, 
  Maximize2, 
  ThumbsUp, 
  ThumbsDown, 
  Star, 
  MessageSquare, 
  SlidersHorizontal, 
  Database, 
  Plus, 
  X, 
  Info, 
  Check, 
  RefreshCw, 
  Copy, 
  Link2, 
  Download,
  FolderDown,
  CornerDownRight, 
  Settings, 
  AlertTriangle, 
  User, 
  Calendar, 
  Grid,
  Lock,
  Eye,
  Video,
  FileImage,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Trash2,
  Edit3,
  GripVertical,
  BookOpen,
  Music,
  FileText,
  Sparkles,
  ArrowLeft,
  Heart,
  Send,
  Menu,
  TrendingUp,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { Post, Tag, Comment, Playlist } from './types';
import { dbManager } from './supabaseClient';
import { INITIAL_POSTS, INITIAL_TAGS } from './sampleData';
import { motion } from 'motion/react';
import { UserProfile } from './components/UserProfile';
import { GamesView } from './components/GamesView';

// Helper to determine if a URL represents a video file
const isUrlVideo = (url: string) => {
  if (!url) return false;
  const cleaned = url.split('?')[0].toLowerCase();
  return cleaned.endsWith('.mp4') || cleaned.endsWith('.webm') || cleaned.endsWith('.mov') || cleaned.endsWith('#video');
};

// Helper to determine if a URL represents a downloadable install/exec/archive file
const isUrlDownloadable = (url: string) => {
  if (!url) return false;
  const cleaned = url.split('?')[0].toLowerCase();
  return (
    cleaned.endsWith('.exe') || 
    cleaned.endsWith('.msi') || 
    cleaned.endsWith('.zip') || 
    cleaned.endsWith('.rar') || 
    cleaned.endsWith('.7z') || 
    cleaned.endsWith('.tar') || 
    cleaned.endsWith('.gz') || 
    cleaned.endsWith('.apk') || 
    cleaned.endsWith('.dmg') || 
    cleaned.endsWith('.pkg') ||
    cleaned.endsWith('.bin') ||
    cleaned.endsWith('#installer')
  );
};

export default function App() {
  // Passcode verification state
  const [passcode, setPasscode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [passcodeError, setPasscodeError] = useState('');

  // Main application data states
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [tags, setTagsState] = useState<Tag[]>(() => {
    const seen = new Set<string>();
    return INITIAL_TAGS.filter(t => {
      const nameLower = t.name.toLowerCase().trim();
      if (!nameLower || seen.has(nameLower)) return false;
      seen.add(nameLower);
      return true;
    });
  });

  const setTags = (value: Tag[] | ((prev: Tag[]) => Tag[])) => {
    const deduplicateTags = (list: Tag[]): Tag[] => {
      if (!list) return [];
      const seen = new Set<string>();
      return list.filter(t => {
        const nameLower = t.name.toLowerCase().trim();
        if (!nameLower || seen.has(nameLower)) return false;
        seen.add(nameLower);
        return true;
      });
    };

    if (typeof value === 'function') {
      setTagsState(prev => deduplicateTags(value(prev)));
    } else {
      setTagsState(deduplicateTags(value));
    }
  };

  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeTab, setActiveTab ] = useState<'gallery' | 'upload' | 'profile' | 'games'>('gallery');
  const [middleFilterTab, setMiddleFilterTab] = useState<'all' | 'arts' | 'videos' | 'comics' | 'games'>('all');
  const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down'>>(() => {
    try {
      return JSON.parse(localStorage.getItem('sugule_user_votes') || '{}');
    } catch {
      return {};
    }
  });
  
  // Search & Filtering
  const [selectedTags, setSelectedTagsState] = useState<string[]>([]);
  const setSelectedTags = (value: string[] | ((prev: string[]) => string[])) => {
    const deduplicate = (list: string[]): string[] => {
      if (!list) return [];
      return Array.from(new Set(list));
    };
    if (typeof value === 'function') {
      setSelectedTagsState(prev => deduplicate(value(prev)));
    } else {
      setSelectedTagsState(deduplicate(value));
    }
  };
  const [tagInputText, setTagInputText] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // High polish layout options (all content is visible directly)
  const showSafe = true;
  const showQuestionable = true;
  const showExplicit = true;
  
  // Sorting parameter
  const [sortBy, setSortBy] = useState<'newest' | 'score' | 'views'>('newest');
  
  // New state variables for Rule34-aesthetic sidebar & menus
  const [filterAiPosts, setFilterAiPosts] = useState(false);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'images' | 'videos'>('all');
  const [gridLayout, setGridLayout] = useState<'grid' | 'masonry'>('grid');
  const [infiniteScroll, setInfiniteScroll] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [blacklist, setBlacklist] = useState<string[]>(() => {
    const saved = localStorage.getItem('sugule_blacklist');
    return saved ? JSON.parse(saved) : [];
  });
  const [showBlacklistDialog, setShowBlacklistDialog] = useState(false);
  const [newBlacklistTag, setNewBlacklistTag] = useState('');
  
  // Drawer & Sidebar states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [showMoreHotTags, setShowMoreHotTags] = useState(false);
  
  // Popups/Modals
  const [showPlaylistsDialog, setShowPlaylistsDialog] = useState(false);
  const [showTrendsDialog, setShowTrendsDialog] = useState(false);
  const [showCommentsDialog, setShowCommentsDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [isPremium, setIsPremium] = useState(() => localStorage.getItem('sugule_is_premium') === 'true');
  const [showSigninDialog, setShowSigninDialog] = useState(false);
  const [showSignupDialog, setShowSignupDialog] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(() => localStorage.getItem('sugule_username') !== null);
  const [username, setUsername] = useState(() => localStorage.getItem('sugule_username') || '');
  
  // Detail Modal view & Navigation
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [currentComicPage, setCurrentComicPage] = useState(0);
  const [sidebarTagQuery, setSidebarTagQuery] = useState('');
  const [followedTags, setFollowedTags] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('followed_tags') || '[]');
    } catch {
      return [];
    }
  });
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentAuthor, setNewCommentAuthor] = useState('');
  const [detailTagInput, setDetailTagInput] = useState('');
  const [isEditingBulkTags, setIsEditingBulkTags] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editRating, setEditRating] = useState<'safe' | 'questionable' | 'explicit'>('safe');
  const [editUrl, setEditUrl] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTags, setEditTags] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<Post[]>([]);
  const [mediaDetails, setMediaDetails] = useState({ dimensions: '1280x720', size: '1.2 MB' });

  // Upload Form fields
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadArtist, setUploadArtist] = useState('');
  const [uploadRating, setUploadRating] = useState<'safe' | 'questionable' | 'explicit'>('safe');
  const [uploadSource, setUploadSource] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadTagsString, setUploadTagsString] = useState('');
  const [uploadType, setUploadType] = useState<'image' | 'video' | 'gif' | 'comic' | 'audio' | 'document' | 'installer' | 'game'>('image');

  // Game upload states
  const [gameVersion, setGameVersion] = useState('');
  const [gameScreenshots, setGameScreenshots] = useState(''); // Comma-separated screenshots/video URLs
  const [gameDownloadPc, setGameDownloadPc] = useState('');
  const [gameDownloadMobile, setGameDownloadMobile] = useState('');
  const [gameDeviceCompatibility, setGameDeviceCompatibility] = useState<'all' | 'pc' | 'mobile'>('all');
  
  // Autocomplete suggestions
  const [mainTagSuggestions, setMainTagSuggestions] = useState<string[]>([]);
  const [customTagSuggestions, setCustomTagSuggestions] = useState<string[]>([]);
  const [focusedInput, setFocusedInput] = useState<'mainTags' | 'customTag' | null>(null);

  // Comic cover upload states
  const [comicCoverUrl, setComicCoverUrl] = useState('');
  const [comicCoverFileState, setComicCoverFileState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [comicCoverFileName, setComicCoverFileName] = useState('');

  // Page transitioning direction and tag specifying fields
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');
  const [newCustomTagName, setNewCustomTagName] = useState('');
  const [newCustomTagCategory, setNewCustomTagCategory] = useState<'character' | 'copyright' | 'artist' | 'general' | 'meta'>('general');
  const [tagRegSuccessMsg, setTagRegSuccessMsg] = useState('');

  // Sync Custom playlists inside App state to handle quick add from Detail view
  const [customPlaylistsState, setCustomPlaylistsState] = useState<Playlist[]>([]);
  useEffect(() => {
    const syncPlaylists = () => {
      try {
        const saved = localStorage.getItem('SUGULE_PLAYLISTS');
        if (saved) {
          setCustomPlaylistsState(JSON.parse(saved));
        } else {
          setCustomPlaylistsState([]);
        }
      } catch (e) {
        setCustomPlaylistsState([]);
      }
    };
    syncPlaylists();
    
    window.addEventListener('storage', syncPlaylists);
    const interval = setInterval(syncPlaylists, 1500);
    return () => {
      window.removeEventListener('storage', syncPlaylists);
      clearInterval(interval);
    };
  }, [selectedPost]);

  // Autocomplete effect for mainTags in upload
  useEffect(() => {
    const rawParts = uploadTagsString.split(/[\s,]+/);
    const lastWord = rawParts[rawParts.length - 1] || '';
    const activeWordClean = lastWord.trim().toLowerCase();
    if (activeWordClean.length >= 1) {
      const currentTagsSelected = rawParts.slice(0, -1).map(s => s.trim().toLowerCase());
      const matches = tags
        .filter(t => t.name.toLowerCase().includes(activeWordClean) && !currentTagsSelected.includes(t.name.toLowerCase()))
        .map(t => t.name);
      setMainTagSuggestions(matches.slice(0, 10));
    } else {
      setMainTagSuggestions([]);
    }
  }, [uploadTagsString, tags]);

  // Autocomplete effect for custom tag registration name
  useEffect(() => {
    const cleanNewTagName = newCustomTagName.trim().toLowerCase();
    if (cleanNewTagName.length >= 1) {
      const matches = tags
        .filter(t => t.name.toLowerCase().includes(cleanNewTagName))
        .map(t => t.name);
      setCustomTagSuggestions(matches.slice(0, 10));
    } else {
      setCustomTagSuggestions([]);
    }
  }, [newCustomTagName, tags]);

  const handleSelectMainTag = (suggestedTag: string) => {
    const parts = uploadTagsString.trimEnd().split(/[\s,]+/);
    if (parts.length > 0) {
      parts[parts.length - 1] = suggestedTag;
      setUploadTagsString(parts.join(' ') + ' ');
    } else {
      setUploadTagsString(suggestedTag + ' ');
    }
    setMainTagSuggestions([]);
  };

  const handleSelectCustomTag = (suggestedTag: string) => {
    setNewCustomTagName(suggestedTag);
    setCustomTagSuggestions([]);
  };

  const handleComicCoverInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setComicCoverFileName(file.name);
      setComicCoverFileState('uploading');
      try {
         const publicUrl = await dbManager.uploadFile(file);
         setComicCoverUrl(publicUrl);
         setComicCoverFileState('success');
      } catch (err: any) {
         setComicCoverFileState('error');
         alert('Ошибка загрузки обложки: ' + err.message);
      }
    }
  };

  // Comic specific upload file items
  const [comicFiles, setComicFiles] = useState<{ name: string; state: 'idle' | 'uploading' | 'success' | 'error'; url?: string; size?: string; thumbnail?: string }[]>([]);

  // File upload state for Supabase storage
  const [dragActive, setDragActive] = useState(false);
  const [uploadFileState, setUploadFileState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadFileName, setUploadFileName] = useState('');

  const [isSavingPost, setIsSavingPost] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');
  const [uploadErrorMsg, setUploadErrorMsg] = useState('');

  // Supabase administration state
  const [supabaseConfig, setSupabaseConfig] = useState({
    isEnabled: false,
    url: '',
    key: ''
  });
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  // Authenticate and load configs on mounts
  useEffect(() => {
    const autoConfigureDb = async () => {
      try {
        const resp = await fetch('/api/supabase-config');
        if (resp.ok) {
          const data = await resp.json();
          if (data.url && data.key) {
            // Save configuration & reinitialize client
            dbManager.saveConfiguration(data.url, data.key);
          }
        }
      } catch (err) {
        console.error('Failed to auto-configure Supabase credentials on load:', err);
      }

      // Load Supabase specs
      const conf = dbManager.getConfiguration();
      setSupabaseConfig(conf);

      const savedViews = localStorage.getItem('sugule_recent_views');
      if (savedViews) {
        try {
          setRecentlyViewed(JSON.parse(savedViews));
        } catch (e) {
          // Ignored
        }
      }

      if (isAuthorized) {
        loadDatabase();
      }
    };

    autoConfigureDb();
  }, [isAuthorized]);

  // Periodic polling to auto-update posts silently in the background
  useEffect(() => {
    if (!isAuthorized) return;
    
    // Check and refresh database every 8 seconds silently for real-time consistency
    const pollInterval = setInterval(() => {
      loadDatabase(true);
    }, 8000);

    return () => clearInterval(pollInterval);
  }, [isAuthorized]);

  const loadDatabase = async (silent = false) => {
    if (!silent) setIsLoadingDb(true);
    try {
      const fetchedPosts = await dbManager.getPosts();
      const fetchedTags = await dbManager.getTags();
      const fetchedFavs = await dbManager.getFavorites();
      
      const sanitizePosts = (items: Post[] | null): Post[] => {
        if (!items) return [];
        return items.map(p => ({
          ...p,
          title: '',
          description: ''
        }));
      };

      const config = dbManager.getConfiguration();
      if (config.isEnabled) {
        setPosts(sanitizePosts(fetchedPosts));
        setTags(fetchedTags || []);
      } else {
        setPosts(fetchedPosts && fetchedPosts.length > 0 ? sanitizePosts(fetchedPosts) : sanitizePosts(INITIAL_POSTS));
        setTags(fetchedTags && fetchedTags.length > 0 ? fetchedTags : INITIAL_TAGS);
      }
      setFavorites(fetchedFavs || []);
    } catch (e) {
      console.error('Error fetching data from Supabase:', e);
      if (!silent) {
        const sanitizePosts = (items: Post[]): Post[] => {
          return items.map(p => ({ ...p, title: '', description: '' }));
        };
        setPosts(sanitizePosts(INITIAL_POSTS));
        setTags(INITIAL_TAGS);
      }
    } finally {
      if (!silent) setIsLoadingDb(false);
    }
  };

  // Authorization submit
  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === 'sugule') {
      setIsAuthorized(true);
      setPasscodeError('');
      localStorage.setItem('sugule_authorized', 'true');
    } else {
      setPasscodeError('Неверный пароль доступа.');
    }
  };

  const handleLogout = () => {
    setIsAuthorized(false);
    setPasscode('');
    localStorage.removeItem('sugule_authorized');
  };

  // Load more items triggers inside scroll when infinite pagination option gets toggled
  useEffect(() => {
    if (!infiniteScroll) {
      setVisibleCount(1000); // effectively show all if infinite scroll is turned off
      return;
    }
    setVisibleCount(12); // standard initial count
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrolled = window.scrollY;
      
      if (scrolled + clientHeight >= scrollHeight - 350) {
        setVisibleCount(prev => prev + 6);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [infiniteScroll]);

  const handleResetFilters = () => {
    setSelectedTags([]);
    setFavorites([]);
  };

  // Grouping tags dynamically from active rows
  const getCategorizedTags = () => {
    const character: Tag[] = [];
    const copyright: Tag[] = [];
    const artist: Tag[] = [];
    const general: Tag[] = [];
    const meta: Tag[] = [];

    const seenNames = new Set<string>();

    tags.forEach(t => {
      const lowerName = t.name.toLowerCase().trim();
      if (!lowerName || seenNames.has(lowerName)) return;
      seenNames.add(lowerName);

      const count = posts.filter(p => 
        p.tags.some(pt => pt.toLowerCase().trim() === lowerName)
      ).length;

      const tagWithCount = { ...t, name: lowerName, count };
      
      switch (t.category) {
        case 'character': character.push(tagWithCount); break;
        case 'copyright': copyright.push(tagWithCount); break;
        case 'artist': artist.push(tagWithCount); break;
        case 'general': general.push(tagWithCount); break;
        case 'meta': meta.push(tagWithCount); break;
      }
    });

    const sorter = (a: Tag, b: Tag) => (b.count || 0) - (a.count || 0);
    return {
      character: character.sort(sorter),
      copyright: copyright.sort(sorter),
      artist: artist.sort(sorter),
      general: general.sort(sorter),
      meta: meta.sort(sorter),
    };
  };

  // Find current word being typed (last word in the input)
  const getCurrentWordBeingTyped = () => {
    if (!tagInputText) return '';
    const terms = tagInputText.split(/\s+/);
    return terms[terms.length - 1] || '';
  };

  const sortedTags = useMemo(() => {
    const counts: Record<string, number> = {};
    
    tags.forEach(t => {
      counts[t.name.trim().toLowerCase()] = 0;
    });

    posts.forEach(p => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach(tName => {
          const clean = tName.trim().toLowerCase();
          if (clean) {
            counts[clean] = (counts[clean] || 0) + 1;
          }
        });
      }
    });

    return [...tags].sort((a, b) => {
      const countA = counts[a.name.trim().toLowerCase()] || 0;
      const countB = counts[b.name.trim().toLowerCase()] || 0;
      if (countB !== countA) {
        return countB - countA;
      }
      return a.name.localeCompare(b.name);
    });
  }, [tags, posts]);

  // Tag search query suggestions mapping matching the current word typed
  const filteredSuggestions = useMemo(() => {
    const word = getCurrentWordBeingTyped().toLowerCase();
    if (!word) return [];

    const cleanWord = word.startsWith('-') ? word.slice(1) : word;
    if (!cleanWord) return [];

    const currentTerms = tagInputText.toLowerCase().split(/\s+/).filter(Boolean).map(t => t.startsWith('-') ? t.slice(1) : t);

    return tags.filter(t => {
      const isAlreadyInQuery = currentTerms.includes(t.name.toLowerCase());
      const matchesInput = t.name.toLowerCase().includes(cleanWord);
      return matchesInput && !isAlreadyInQuery;
    }).slice(0, 15);
  }, [tagInputText, tags]);

  // Helper to calculate mock views based on post properties
  const getPostViews = (post: Post) => {
    const titleText = post.title || post.id || '';
    const codeSum = titleText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (post.score * 15) + (codeSum % 900) + 120;
  };

  // Helper to determine styling for hot tags based on their category
  const getHotTagColor = (tagId: string) => {
    const tagObj = tags.find(t => t.name.toLowerCase() === tagId.toLowerCase());
    const category = tagObj ? tagObj.category : 'general';

    if (category === 'copyright') {
      return 'bg-purple-950/45 text-purple-300 hover:bg-purple-950/65 border border-purple-800/30';
    } else if (category === 'artist') {
      return 'bg-rose-950/45 text-rose-300 hover:bg-rose-950/65 border border-rose-900/30';
    } else if (category === 'character') {
      return 'bg-emerald-950/45 text-emerald-300 hover:bg-emerald-950/65 border border-emerald-900/30';
    } else if (category === 'meta') {
      return 'bg-zinc-800/45 text-zinc-300 hover:bg-zinc-800/65 border border-zinc-700/30';
    }
    // Default/general tags
    return 'bg-[#292a30] text-zinc-300 hover:bg-[#34363d] border border-transparent';
  };

  // Helper to get text color of a tag based on category
  const getTagTextColor = (tagName: string) => {
    const tagObj = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase().trim());
    const category = tagObj ? tagObj.category : 'general';
    if (category === 'copyright') return 'text-[#be92ff] hover:text-[#d2b4ff]';
    if (category === 'artist') return 'text-[#ff8fa3] hover:text-[#ffb3c1]';
    if (category === 'character') return 'text-[#52b788] hover:text-[#74c69d]';
    if (category === 'meta') return 'text-[#a3e635] hover:text-[#bef264]';
    // default/general
    return 'text-[#38bdf8] hover:text-[#7dd3fc]';
  };

  // Helper to determine category colors for tags in sidebar and detailed post view
  const getCategoryColor = (category: string) => {
    if (category === 'copyright') {
      return {
        badge: 'bg-purple-950/45 text-purple-300 hover:bg-purple-950/65 border-purple-800/30',
        text: 'text-[#be92ff]',
        headerText: 'text-purple-400'
      };
    } else if (category === 'artist') {
      return {
        badge: 'bg-rose-950/45 text-rose-300 hover:bg-rose-950/65 border-rose-900/30',
        text: 'text-[#ff8fa3]',
        headerText: 'text-rose-400'
      };
    } else if (category === 'character') {
      return {
        badge: 'bg-emerald-950/45 text-emerald-300 hover:bg-emerald-950/65 border-emerald-900/30',
        text: 'text-[#52b788]',
        headerText: 'text-emerald-400'
      };
    } else if (category === 'meta') {
      return {
        badge: 'bg-zinc-800/45 text-zinc-300 hover:bg-zinc-800/65 border-zinc-700/30',
        text: 'text-[#a3e635]',
        headerText: 'text-lime-400'
      };
    }
    return {
      badge: 'bg-[#292a30] text-zinc-300 hover:bg-[#34363d] border-transparent',
      text: 'text-[#38bdf8]',
      headerText: 'text-sky-400'
    };
  };

  // Helper to count the number of posts with a specific tag
  const getTagCount = (tagName: string) => {
    return posts.filter(p => p.tags.includes(tagName)).length;
  };

  // Manage followed tags list with localStorage persistence or React state
  const handleToggleFollowTag = (tagName: string) => {
    setFollowedTags(prev => {
      let updated;
      if (prev.includes(tagName)) {
        updated = prev.filter(t => t !== tagName);
      } else {
        updated = [...prev, tagName];
      }
      localStorage.setItem('followed_tags', JSON.stringify(updated));
      return updated;
    });
  };

  // Filter and sort mechanism (supports positive and exclude negative tags, blacklist, media types, AI toggles)
  const getFilteredPosts = () => {
    return posts.filter(p => {
      // Exclude game posts from standard gallery display
      if (p.is_game) return false;

      // Blacklist filter
      if (blacklist.length > 0) {
        const hasBlacklisted = p.tags.some(t => blacklist.map(b => b.toLowerCase().trim()).includes(t.toLowerCase().trim()));
        if (hasBlacklisted) return false;
      }

      // Filter AI posts toggle
      if (filterAiPosts) {
        const isAi = p.tags.some(t => ['gemini_ai', 'ai', 'ai_generated', 'ai-generated', 'ai_art'].includes(t.toLowerCase())) 
                     || p.uploader.toLowerCase().includes('ai') 
                     || p.description?.toLowerCase().includes('model') 
                     || p.description?.toLowerCase().includes('generat');
        if (isAi) return false;
      }

      // Media type filter
      const isVideo = isUrlVideo(p.url);
      if (mediaTypeFilter === 'images' && isVideo) return false;
      if (mediaTypeFilter === 'videos' && !isVideo) return false;

      // Middle filter tab logic
      if (middleFilterTab === 'arts') {
        if (isVideo || isPostComic(p)) return false;
      } else if (middleFilterTab === 'videos') {
        if (!isVideo) return false;
      } else if (middleFilterTab === 'comics') {
        if (!isPostComic(p)) return false;
      } else if (middleFilterTab === 'games') {
        const hasGameTag = p.tags.some(t => {
          const lower = t.toLowerCase();
          return lower.includes('game') || lower.includes('rpg') || lower.includes('quest') || lower.includes('novel') || lower.includes('interactive');
        });
        if (!hasGameTag) return false;
      }

      // Tags filter (must match all chosen tags, excluding negated ones)
      if (selectedTags.length > 0) {
        const includeTags = selectedTags.filter(t => !t.startsWith('-'));
        const excludeTags = selectedTags.filter(t => t.startsWith('-')).map(t => t.slice(1));

        if (includeTags.length > 0) {
          const matchesAll = includeTags.every(t => p.tags.includes(t));
          if (!matchesAll) return false;
        }

        if (excludeTags.length > 0) {
          const matchesAnyExclude = excludeTags.some(t => p.tags.includes(t));
          if (matchesAnyExclude) return false;
        }
      }

      // Ratings visibility
      if (p.rating === 'safe' && !showSafe) return false;
      if (p.rating === 'questionable' && !showQuestionable) return false;
      if (p.rating === 'explicit' && !showExplicit) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'score') {
        return b.score - a.score;
      } else if (sortBy === 'views') {
        return getPostViews(b) - getPostViews(a);
      }
      // Default newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  // Replace last typed word with full tag name from dropdown
  const handleAddSearchTag = (tagName: string) => {
    const sanitized = tagName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!sanitized) return;

    const terms = tagInputText.split(/\s+/);
    if (terms.length > 0) {
      // Check if it was prefixed with '-' or not
      const last = terms[terms.length - 1];
      const prefix = last.startsWith('-') ? '-' : '';
      terms[terms.length - 1] = prefix + sanitized;
    } else {
      terms.push(sanitized);
    }

    const completedText = terms.join(' ') + ' ';
    setTagInputText(completedText);
    setSelectedTags(terms.filter(Boolean));
    setShowTagSuggestions(false);
  };

  // Remove tag completely from search input
  const handleRemoveSearchTag = (tagName: string) => {
    const sanitized = tagName.trim().toLowerCase();
    const currentTerms = tagInputText.toLowerCase().split(/\s+/).filter(Boolean);
    
    // Remove if it's the normal tag or negated tag
    const filteredTerms = currentTerms.filter(t => t !== sanitized && t !== '-' + sanitized);
    
    const completedText = filteredTerms.join(' ') + (filteredTerms.length > 0 ? ' ' : '');
    setTagInputText(completedText);
    setSelectedTags(filteredTerms);
  };

  // Exclusive search for only this tag
  const handleQueryOnlyTag = (tagName: string) => {
    const sanitized = tagName.trim().toLowerCase().replace(/\s+/g, '_') + ' ';
    setTagInputText(sanitized);
    setSelectedTags([tagName.trim().toLowerCase()]);
    setShowTagSuggestions(false);
  };

  // Append a tag to current search space
  const handleQueryAddTag = (tagName: string) => {
    const sanitized = tagName.trim().toLowerCase().replace(/\s+/g, '_');
    const currentTerms = tagInputText.toLowerCase().split(/\s+/).filter(Boolean);
    
    // Remove if it was negated to replace with inclusive
    const withExcludedRemoved = currentTerms.filter(t => t !== '-' + sanitized);
    if (!withExcludedRemoved.includes(sanitized)) {
      withExcludedRemoved.push(sanitized);
    }

    const completedText = withExcludedRemoved.join(' ') + ' ';
    setTagInputText(completedText);
    setSelectedTags(withExcludedRemoved);
    setShowTagSuggestions(false);
  };

  // Exclude tag from search space
  const handleQueryExcludeTag = (tagName: string) => {
    const sanitized = tagName.trim().toLowerCase().replace(/\s+/g, '_');
    const currentTerms = tagInputText.toLowerCase().split(/\s+/).filter(Boolean);
    const neg = '-' + sanitized;

    const withPositiveRemoved = currentTerms.filter(t => t !== sanitized);
    if (!withPositiveRemoved.includes(neg)) {
      withPositiveRemoved.push(neg);
    }

    const completedText = withPositiveRemoved.join(' ') + ' ';
    setTagInputText(completedText);
    setSelectedTags(withPositiveRemoved);
    setShowTagSuggestions(false);
  };

  // Toggle a hot tag in the search field
  const handleToggleHotTag = (tagId: string) => {
    const sanitized = tagId.trim().toLowerCase().replace(/\s+/g, '_');
    const currentTerms = tagInputText.toLowerCase().split(/\s+/).filter(Boolean);
    const hasTag = currentTerms.includes(sanitized) || currentTerms.includes('-' + sanitized);
    
    if (hasTag) {
      handleRemoveSearchTag(sanitized);
    } else {
      handleQueryAddTag(sanitized);
    }
  };

  // Selected item modal detail load comments
  const handleViewPost = async (post: Post) => {
    setSelectedPost(post);
    setCurrentComicPage(0);
    setIsZoomed(false);
    try {
      const fetchedComments = await dbManager.getComments(post.id);
      setComments(fetchedComments);
    } catch {
      setComments([]);
    }
    setDetailTagInput('');
    setIsEditingBulkTags(false);
    setBulkTagInput(post.tags.join(' '));
    setShowDeleteConfirm(false);

    // Update recently viewed list locally
    setRecentlyViewed(prev => {
      const filtered = prev.filter(p => p.id !== post.id);
      const updated = [post, ...filtered].slice(0, 4);
      localStorage.setItem('sugule_recent_views', JSON.stringify(updated));
      return updated;
    });

    // Populate dynamic media dimensions/size details
    const charCodeSum = post.id.split('').reduce((acc, current) => acc + current.charCodeAt(0), 0);
    const postSizeNum = (charCodeSum % 14) * 0.1 + 0.3;
    const initialSizeStr = postSizeNum.toFixed(1) + ' MB';
    
    setMediaDetails({ dimensions: '1280x720', size: initialSizeStr });

    if (post.url && !post.url.startsWith('[')) {
      const img = new Image();
      img.onload = () => {
        setMediaDetails({
          dimensions: `${img.naturalWidth}x${img.naturalHeight}`,
          size: initialSizeStr
        });
      };
      img.src = post.url;
    }
  };

  // Comic helpers & Swipe/Flip Navigation logic
  const isPostComic = (post: Post | null): boolean => {
    if (!post || !post.url) return false;
    const trimmed = post.url.trim();
    return trimmed.startsWith('[') && trimmed.endsWith(']');
  };

  const getComicPages = (post: Post | null): string[] => {
    if (!post) return [];
    if (!isPostComic(post)) return [post.url];
    try {
      return JSON.parse(post.url);
    } catch {
      return [post.url];
    }
  };

  const getPostDisplayUrl = (post: Post | null): string => {
    if (!post) return '';
    if (isPostComic(post)) {
      if (post.cover_url) return post.cover_url;
      const pages = getComicPages(post);
      return pages[0] || '';
    }
    return post.url;
  };

  const handlePrevPost = () => {
    const filtered = getFilteredPosts();
    if (!selectedPost || filtered.length === 0) return;
    const currentIndex = filtered.findIndex(p => p.id === selectedPost.id);
    if (currentIndex > 0) {
      handleViewPost(filtered[currentIndex - 1]);
    } else {
      handleViewPost(filtered[filtered.length - 1]);
    }
  };

  const handleNextPost = () => {
    const filtered = getFilteredPosts();
    if (!selectedPost || filtered.length === 0) return;
    const currentIndex = filtered.findIndex(p => p.id === selectedPost.id);
    if (currentIndex < filtered.length - 1) {
      handleViewPost(filtered[currentIndex + 1]);
    } else {
      handleViewPost(filtered[0]);
    }
  };

  const changeComicPage = (newPage: number) => {
    if (newPage > currentComicPage) {
      setSlideDirection('forward');
    } else {
      setSlideDirection('backward');
    }
    setCurrentComicPage(newPage);
  };

  // Keyboard layout keydown bindings for gallery and comics page flip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPost) return;
      
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (isPostComic(selectedPost)) {
          if (currentComicPage > 0) {
            changeComicPage(currentComicPage - 1);
          } else {
            handlePrevPost();
          }
        } else {
          handlePrevPost();
        }
      } else if (e.key === 'ArrowRight') {
        if (isPostComic(selectedPost)) {
          const pages = getComicPages(selectedPost);
          if (currentComicPage < pages.length - 1) {
            changeComicPage(currentComicPage + 1);
          } else {
            handleNextPost();
          }
        } else {
          handleNextPost();
        }
      } else if (e.key === 'Escape') {
        setSelectedPost(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPost, currentComicPage, posts, selectedTags, slideDirection]);

  const handleNextAction = () => {
    if (!selectedPost) return;
    if (isPostComic(selectedPost)) {
      const pages = getComicPages(selectedPost);
      if (currentComicPage < pages.length - 1) {
        changeComicPage(currentComicPage + 1);
      } else {
        handleNextPost();
      }
    } else {
      handleNextPost();
    }
  };

  const handlePrevAction = () => {
    if (!selectedPost) return;
    if (isPostComic(selectedPost)) {
      if (currentComicPage > 0) {
        changeComicPage(currentComicPage - 1);
      } else {
        handlePrevPost();
      }
    } else {
      handlePrevPost();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNextAction();
      } else {
        handlePrevAction();
      }
    }
    setTouchStartX(null);
  };

  const handleMoveFileUp = (idx: number) => {
    if (idx === 0) return;
    setComicFiles(prev => {
      const updated = [...prev];
      const temp = updated[idx];
      updated[idx] = updated[idx - 1];
      updated[idx - 1] = temp;
      
      const successfulUrls = updated.filter(f => f.state === 'success' && f.url).map(f => f.url!);
      if (successfulUrls.length > 0) {
        setUploadUrl(JSON.stringify(successfulUrls));
      }
      return updated;
    });
  };

  const handleMoveFileDown = (idx: number) => {
    setComicFiles(prev => {
      if (idx === prev.length - 1) return prev;
      const updated = [...prev];
      const temp = updated[idx];
      updated[idx] = updated[idx + 1];
      updated[idx + 1] = temp;
      
      const successfulUrls = updated.filter(f => f.state === 'success' && f.url).map(f => f.url!);
      if (successfulUrls.length > 0) {
        setUploadUrl(JSON.stringify(successfulUrls));
      }
      return updated;
    });
  };

  const handleRegisterCustomTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCustomTagName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!name) return;

    try {
      await dbManager.saveTag(name, newCustomTagCategory);
      
      const newTagObj: Tag = { name, category: newCustomTagCategory, count: 1 };
      setTags(prev => {
        const filtered = prev.filter(t => t.name.toLowerCase() !== name.toLowerCase());
        return [...filtered, newTagObj];
      });

      setUploadTagsString(prev => {
        const cleanPrev = prev.trim();
        const currentTerms = cleanPrev.split(/[\s,]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
        if (currentTerms.includes(name)) return prev;
        return cleanPrev ? `${cleanPrev} ${name}` : name;
      });

      setTagRegSuccessMsg(`Тег "${name}" успешно создан как ${newCustomTagCategory}!`);
      setNewCustomTagName('');
      setTimeout(() => setTagRegSuccessMsg(''), 3500);
    } catch (err: any) {
      console.error('Failed to register custom tag:', err);
    }
  };

  const handleToggleFavorite = async (postId: string) => {
    const added = await dbManager.toggleFavorite(postId);
    if (added) {
      setFavorites([...favorites, postId]);
    } else {
      setFavorites(favorites.filter(id => id !== postId));
    }
  };

  const handleTogglePostPlaylist = (playlistId: string, postId: string) => {
    try {
      const saved = localStorage.getItem('SUGULE_PLAYLISTS');
      let lists: Playlist[] = saved ? JSON.parse(saved) : [];
      lists = lists.map(pl => {
        if (pl.id === playlistId) {
          const exists = pl.postIds.includes(postId);
          if (exists) {
            return { ...pl, postIds: pl.postIds.filter(id => id !== postId) };
          } else {
            return { ...pl, postIds: [...pl.postIds, postId] };
          }
        }
        return pl;
      });
      localStorage.setItem('SUGULE_PLAYLISTS', JSON.stringify(lists));
      setCustomPlaylistsState(lists);
    } catch (e) {
      console.error(e);
    }
  };

  // Cast upvote/downvote (Exactly 1 like or dislike per person, with toggle/correction)
  const handleVotePost = async (postId: string, dir: 'up' | 'down') => {
    const currentVote = userVotes[postId];
    let delta = 0;
    let nextVote: 'up' | 'down' | null = null;

    if (dir === 'up') {
      if (currentVote === 'up') {
        delta = -1;
        nextVote = null;
      } else if (currentVote === 'down') {
        delta = 2; // converts a dislike to a like: -1 to +1
        nextVote = 'up';
      } else {
        delta = 1;
        nextVote = 'up';
      }
    } else {
      if (currentVote === 'down') {
        delta = 1;
        nextVote = null;
      } else if (currentVote === 'up') {
        delta = -2; // converts a like to a dislike: +1 to -1
        nextVote = 'down';
      } else {
        delta = -1;
        nextVote = 'down';
      }
    }

    try {
      const newScore = await dbManager.votePost(postId, delta);
      
      setUserVotes(prev => {
        const updated = { ...prev };
        if (nextVote === null) {
          delete updated[postId];
        } else {
          updated[postId] = nextVote;
        }
        localStorage.setItem('sugule_user_votes', JSON.stringify(updated));
        return updated;
      });

      setPosts(prev => prev.map(p => p.id === postId ? { ...p, score: newScore } : p));
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(prev => prev ? { ...prev, score: newScore } : null);
      }
      
      // Sync liked posts list for profile view highlights
      try {
        const liked = JSON.parse(localStorage.getItem('sugule_liked') || '[]');
        let updatedLiked = liked;
        if (nextVote === 'up') {
          if (!liked.includes(postId)) {
            updatedLiked = [...liked, postId];
          }
        } else {
          updatedLiked = liked.filter((id: string) => id !== postId);
        }
        localStorage.setItem('sugule_liked', JSON.stringify(updatedLiked));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {}

    } catch (err: any) {
      alert('Ошибка при голосовании: ' + err.message);
    }
  };

  // Comments write
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedPost) return;

    const comment: Comment = {
      id: 'comment_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      post_id: selectedPost.id,
      author: newCommentAuthor.trim() || 'Гость',
      text: newCommentText.trim(),
      created_at: new Date().toISOString(),
      likes: 0
    };

    try {
      const created = await dbManager.createComment(comment);
      setComments([...comments, created]);
      setNewCommentText('');
    } catch (err: any) {
      alert('Не удалось отправить комментарий: ' + err.message);
    }
  };

  // Add individual tag on post Details
  const handleAddTagToPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailTagInput.trim() || !selectedPost) return;

    const sanitized = detailTagInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (!selectedPost.tags.includes(sanitized)) {
      const updatedTags = [...selectedPost.tags, sanitized];
      try {
        await dbManager.updatePostTags(selectedPost.id, updatedTags);
        const updatedPost = { ...selectedPost, tags: updatedTags };
        setSelectedPost(updatedPost);
        setPosts(prev => prev.map(p => p.id === selectedPost.id ? updatedPost : p));
        
        // Refresh global tags list
        const freshTags = await dbManager.getTags();
        setTags(freshTags);
      } catch (err: any) {
        alert('Ошибка добавления тега: ' + err.message);
      }
    }
    setDetailTagInput('');
  };

  const handleRemoveTagFromPost = async (tagName: string) => {
    if (!selectedPost) return;

    const updatedTags = selectedPost.tags.filter(t => t !== tagName);
    try {
      await dbManager.updatePostTags(selectedPost.id, updatedTags);
      const updatedPost = { ...selectedPost, tags: updatedTags };
      setSelectedPost(updatedPost);
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? updatedPost : p));
      
      const freshTags = await dbManager.getTags();
      setTags(freshTags);
      // Synchronize bulk tag input
      setBulkTagInput(updatedTags.join(' '));
    } catch (err: any) {
      alert('Ошибка удаления тега: ' + err.message);
    }
  };

  const handleOpenEditPost = () => {
    if (!selectedPost) return;
    setEditTitle(selectedPost.title || '');
    setEditRating(selectedPost.rating || 'safe');
    setEditUrl(selectedPost.url || '');
    setEditCoverUrl(selectedPost.cover_url || '');
    setEditSource(selectedPost.source_url || '');
    setEditDesc(selectedPost.description || '');
    setEditTags(selectedPost.tags.join(' '));
    setIsEditingBulkTags(true);
  };

  const handleSaveBulkTags = async () => {
    if (!selectedPost) return;
    try {
      const sanitized = bulkTagInput.trim().replace(/\s+/g, ' ');
      const list = sanitized.split(' ').filter(Boolean);
      await dbManager.updatePostTags(selectedPost.id, list);
      const updatedPost = { ...selectedPost, tags: list };
      setSelectedPost(updatedPost);
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? updatedPost : p));
      setIsEditingBulkTags(false);
      // reload tags
      const freshTags = await dbManager.getTags();
      setTags(freshTags);
    } catch (err: any) {
      alert('Ошибка при сохранении тегов: ' + err.message);
    }
  };

  const handleUploadEditFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSavingEdit(true);
    try {
      const publicUrl = await dbManager.uploadFile(file);
      setEditUrl(publicUrl);
    } catch (err: any) {
      alert('Ошибка при загрузке файла: ' + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleUploadEditCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSavingEdit(true);
    try {
      const publicUrl = await dbManager.uploadFile(file);
      setEditCoverUrl(publicUrl);
    } catch (err: any) {
      alert('Ошибка при загрузке обложки: ' + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSavePostDetails = async () => {
    if (!selectedPost) return;
    setIsSavingEdit(true);
    const cleanTags = editTags
      .split(/[\s,]+/)
      .map(t => t.trim().toLowerCase().replace(/\s+/g, '_'))
      .filter(t => t.length > 0);

    const fieldsToUpdate = {
      title: editTitle.trim() || undefined,
      rating: editRating,
      url: editUrl.trim() || selectedPost.url,
      cover_url: editCoverUrl.trim() || undefined,
      source_url: editSource.trim() || undefined,
      description: editDesc.trim(),
      tags: cleanTags
    };

    try {
      await dbManager.updatePost(selectedPost.id, fieldsToUpdate);
      const updatedPost = { ...selectedPost, ...fieldsToUpdate };
      setSelectedPost(updatedPost);
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? updatedPost : p));
      
      const freshTags = await dbManager.getTags();
      setTags(freshTags);
      setIsEditingBulkTags(false);
    } catch (err: any) {
      alert('Ошибка при сохранении изменений: ' + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    try {
      await dbManager.deletePost(selectedPost.id);
      setPosts(prev => prev.filter(p => p.id !== selectedPost.id));
      setSelectedPost(null);
      setShowDeleteConfirm(false);
      
      const freshTags = await dbManager.getTags();
      setTags(freshTags);
    } catch (err: any) {
      alert('Ошибка удаления публикации: ' + err.message);
    }
  };

  // --- ARTIFACT FILE HARVESTER & UPLOADER ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (uploadType === 'comic') {
        await processComicFiles(e.dataTransfer.files);
      } else {
        await processSelectedFile(e.dataTransfer.files[0]);
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (uploadType === 'comic') {
        await processComicFiles(e.target.files);
      } else {
        await processSelectedFile(e.target.files[0]);
      }
    }
  };

  const processComicFiles = async (files: FileList) => {
    setUploadFileState('uploading');
    setUploadErrorMsg('');
    const sortedFiles = Array.from(files).sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    const newFilesList = sortedFiles.map((f) => ({
      name: f.name,
      state: 'uploading' as 'idle' | 'uploading' | 'success' | 'error',
      url: undefined as string | undefined,
      size: (f.size / 1024).toFixed(0) + ' KB',
      thumbnail: f.type.startsWith('image/') ? URL.createObjectURL(f) : ''
    }));
    setComicFiles(newFilesList);

    const uploadedUrls: string[] = [];
    const updatedFilesList = [...newFilesList];

    for (let i = 0; i < sortedFiles.length; i++) {
      const file = sortedFiles[i];
      try {
        const publicUrl = await dbManager.uploadFile(file);
        uploadedUrls.push(publicUrl);
        updatedFilesList[i] = { ...updatedFilesList[i], state: 'success', url: publicUrl };
      } catch (err: any) {
        updatedFilesList[i] = { ...updatedFilesList[i], state: 'error', url: undefined };
      }
      setComicFiles([...updatedFilesList]);
    }

    const successfulUrls = updatedFilesList.filter(f => f.state === 'success' && f.url).map(f => f.url!);
    if (successfulUrls.length > 0) {
      setUploadUrl(JSON.stringify(successfulUrls));
      setUploadFileState('success');
      setUploadFileName(`Комикс: ${successfulUrls.length} стр. загружено`);
    } else {
      setUploadFileState('error');
      setUploadErrorMsg('Не удалось загрузить ни одного изображения для комикса.');
    }
  };

  const processSelectedFile = async (file: File) => {
    setUploadFileName(file.name);
    setUploadFileState('uploading');
    setUploadErrorMsg('');

    const sizeFormatted = (file.size / 1024).toFixed(0) + ' KB';
    const thumbUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
    setComicFiles([{ name: file.name, state: 'uploading', url: undefined, size: sizeFormatted, thumbnail: thumbUrl }]);

    try {
      const publicUrl = await dbManager.uploadFile(file);
      setUploadUrl(publicUrl);
      setUploadFileState('success');
      setComicFiles([{ name: file.name, state: 'success', url: publicUrl, size: sizeFormatted, thumbnail: thumbUrl }]);
    } catch (err: any) {
      setUploadFileState('error');
      setUploadErrorMsg(err.message || 'Возникла непредвиденная ошибка при загрузке.');
      setComicFiles([{ name: file.name, state: 'error', url: undefined, size: sizeFormatted, thumbnail: thumbUrl }]);
    }
  };

  // Manual record submit to DB
  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl.trim()) {
      alert('Медиафайл не загружен на Supabase! Пожалуйста, выберите файл во фрейме слева.');
      return;
    }

    setIsSavingPost(true);
    setUploadErrorMsg('');

    const finalArtist = uploadArtist.trim() || 'anon';
    const finalTagsString = uploadTagsString.trim() || 'tagme';

    const tagArray = finalTagsString
      .split(/[\s,]+/)
      .map(t => t.trim().toLowerCase().replace(/\s+/g, '_'))
      .filter(t => t.length > 0);

    // Keep tags categorizable
    if (finalArtist) {
      const artistTag = finalArtist.toLowerCase().replace(/\s+/g, '_') + '_art';
      if (!tagArray.includes(artistTag)) {
        tagArray.push(artistTag);
      }
    }

    const parseScreenshots = (str: string): string[] => {
      if (!str.trim()) return [];
      return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
    };

    const newPost: Post = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: uploadTitle.trim() || undefined,
      url: uploadUrl.trim(),
      rating: uploadRating,
      score: 1,
      elo: 1500,
      created_at: new Date().toISOString(),
      uploader: 'Администратор',
      source_url: uploadSource.trim() || undefined,
      description: uploadDesc.trim() || '',
      tags: tagArray,
      cover_url: uploadType === 'comic' ? (comicCoverUrl.trim() || undefined) : undefined,
      is_game: uploadType === 'game',
      version: uploadType === 'game' ? (gameVersion.trim() || 'Last') : undefined,
      screenshots: uploadType === 'game' ? parseScreenshots(gameScreenshots) : undefined,
      download_pc: uploadType === 'game' ? (gameDownloadPc.trim() || undefined) : undefined,
      download_mobile: uploadType === 'game' ? (gameDownloadMobile.trim() || undefined) : undefined,
      device_compatibility: uploadType === 'game' ? gameDeviceCompatibility : undefined
    };

    try {
      await dbManager.createPost(newPost);
      setUploadSuccessMsg(`Панель подтвердила: Работа успешно сохранена в вашей Supabase!`);
      
      // Cleanup inputs
      setUploadTitle('');
      setUploadUrl('');
      setUploadArtist('');
      setUploadSource('');
      setUploadDesc('');
      setUploadTagsString('');
      setUploadFileState('idle');
      setUploadFileName('');
      setComicCoverUrl('');
      setComicCoverFileState('idle');
      setComicCoverFileName('');
      setGameVersion('');
      setGameScreenshots('');
      setGameDownloadPc('');
      setGameDownloadMobile('');
      setGameDeviceCompatibility('all');

      // Reload gallery tables
      await loadDatabase();

      setTimeout(() => setUploadSuccessMsg(''), 5000);
      setActiveTab(uploadType === 'game' ? 'games' : 'gallery');
    } catch (err: any) {
      setUploadErrorMsg(err.message || 'Ошибка сохранения поста!');
    } finally {
      setIsSavingPost(false);
    }
  };

  // Render individual tag with rule34 aesthetics
  const renderTagBadge = (tagName: string, clickable = true, onDelete?: () => void) => {
    const isExcluded = tagName.startsWith('-');
    const cleanName = isExcluded ? tagName.slice(1) : tagName;
    const matched = tags.find(t => t.name === cleanName);
    const category = matched ? matched.category : 'general';
    
    let colorClass = 'bg-blue-950/40 text-blue-400 border-blue-900/40 hover:bg-blue-900/60';
    if (category === 'character') {
      colorClass = 'bg-emerald-950/40 text-emerald-400 border-emerald-920 hover:bg-emerald-950/60';
    } else if (category === 'copyright') {
      colorClass = 'bg-purple-950/40 text-purple-400 border-purple-920 hover:bg-purple-950/60';
    } else if (category === 'artist') {
      colorClass = 'bg-rose-950/40 text-rose-400 border-rose-920 hover:bg-rose-950/60';
    } else if (category === 'meta') {
      colorClass = 'bg-zinc-800/40 text-zinc-350 border-zinc-700/55 hover:bg-zinc-800/60';
    }

    if (isExcluded) {
      colorClass = 'bg-rose-950/20 text-rose-300 border-rose-900/60 hover:bg-rose-950/40 line-through decoration-rose-500 decoration-1.5';
    }

    return (
      <span 
        key={tagName}
        onClick={() => clickable && handleAddSearchTag(tagName)}
        className={`px-2 py-0.5 text-xs font-mono rounded cursor-pointer border flex items-center gap-1 transition duration-150 select-none ${colorClass}`}
      >
        <span>{tagName}</span>
        {onDelete && (
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="hover:bg-red-500/20 p-0.5 rounded text-zinc-400 hover:text-white"
          >
            <X className="w-3" />
          </button>
        )}
      </span>
    );
  };


  // --- SECURITY PASSCODE PROTECTION OVERLAY (LOCK) ---
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#07080a] flex items-center justify-center p-4 select-none font-sans">
        <div className="bg-[#0f1115] border-2 border-emerald-500/30 w-full max-w-md rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" />
          
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-505/10 rounded-full border border-emerald-500/20 flex items-center justify-center mx-auto shadow-lg bg-emerald-950/30">
              <Lock className="w-6 h-6 text-emerald-400" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-white font-mono">Sugule Database</h2>
              <p className="text-xs text-zinc-400 font-mono">Вход ограничен • Закрытое сообщество</p>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed pt-2">
              Этот ресурс создан для узкого круга лиц. Пожалуйста, введите персональный пароль доступа для работы с медиаархивом и сохранения файлов.
            </p>

            <form onSubmit={handlePasscodeSubmit} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <input 
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Пароль доступа..."
                  className="w-full text-center bg-[#07080a] border border-zinc-700/80 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono focus:ring-1 focus:ring-emerald-500/30"
                  required
                />
              </div>

              <div className="flex items-center justify-center gap-1.5 pt-1 font-mono text-[10px] text-emerald-400/90">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Запомнить меня на этом устройстве</span>
              </div>

              {passcodeError && (
                <p className="text-xs text-rose-400 font-mono">{passcodeError}</p>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-semibold py-2.5 rounded-lg text-xs tracking-wider uppercase transition shadow-lg shadow-emerald-950/40"
              >
                Подтвердить доступ
              </button>
            </form>

            <div className="pt-6 border-t border-zinc-900 text-[10px] text-zinc-500 font-mono">
              Подсказка: Код по умолчанию: <span className="text-zinc-400">sugule</span>
            </div>
          </div>
        </div>
      </div>
    );
  }


  // --- MAIN PRIVATE SITE VIEW ---
  return (
    <div className="min-h-screen bg-[#0d0e11] text-[#e3e6eb] font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* HEADER BANNER */}
      <header className="border-b border-purple-900 bg-[#7a1fa2] sticky top-0 z-40 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            {/* Hamburger Slide out Drawer Menu button */}
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="p-1.5 hover:bg-white/15 active:bg-white/20 rounded-lg transition focus:outline-none cursor-pointer text-white"
              title="Открыть меню разделов"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Logo Brand Title */}
            <div 
              onClick={() => {
                handleResetFilters();
                setMiddleFilterTab('all');
                setActiveTab('gallery');
                setSelectedPost(null);
              }}
              className="flex items-baseline gap-2 cursor-pointer group"
              title="Перейти на главную"
            >
              <span className="text-xl font-bold tracking-tight text-white group-hover:text-yellow-300 transition select-none">
                SuguleDatabase.com
              </span>
              <span className="text-[10px] font-mono bg-white/15 border border-white/20 px-1.5 py-0.2 rounded hover:text-yellow-300 transition cursor-help text-[#e1bee7]" title="Inspired by rule34.world engine">R34.W</span>
            </div>
          </div>

          {/* Middle Tabs: "Все", "Арты", "Видео", "Комиксы", "Игры" */}
          <div className="hidden md:flex items-center bg-black/15 border border-white/10 rounded-xl p-1 shrink-0 font-sans text-xs font-mono">
            {(['all', 'arts', 'videos', 'comics', 'games'] as const).map((tab) => {
              const labels = {
                all: 'Все',
                arts: 'Арты',
                videos: 'Видео',
                comics: 'Комиксы',
                games: 'Игры'
              };
              const isActive = tab === 'games' 
                ? activeTab === 'games' 
                : (activeTab === 'gallery' && middleFilterTab === tab);
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setSelectedPost(null);
                    if (tab === 'games') {
                      setActiveTab('games');
                    } else {
                      setMiddleFilterTab(tab);
                      setActiveTab('gallery');
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-lg font-bold transition select-none cursor-pointer ${
                    isActive 
                      ? 'bg-amber-400 text-black shadow-sm font-black' 
                      : 'text-purple-100 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* Action buttons on the right of header */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg transition duration-150 flex items-center gap-1 ${
                activeTab === 'upload' 
                  ? 'bg-white text-purple-900 shadow-sm' 
                  : 'text-purple-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Загрузить</span>
            </button>

            {isSignedUp ? (
              <button 
                onClick={() => {
                  setActiveTab('profile');
                  setSelectedPost(null);
                }}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-white text-purple-900 border-white shadow-sm'
                    : 'bg-purple-900/40 text-purple-100 border-purple-800 hover:text-white hover:bg-purple-950/60'
                }`}
                title="Мой профиль и списки"
              >
                @{username}
              </button>
            ) : (
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-[10px] select-none text-zinc-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">Guest (Гость)</span>
                <button
                  onClick={() => {
                    setActiveTab('profile');
                    setSelectedPost(null);
                  }}
                  className={`px-2.5 py-1 text-xs rounded-lg transition flex items-center gap-1 cursor-pointer font-bold ${
                    activeTab === 'profile'
                      ? 'bg-white text-purple-900 shadow-sm'
                      : 'text-purple-100 hover:text-white hover:bg-white/10'
                  }`}
                  title="Войти / Зарегистрироваться"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Войти</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* PRIMARY VIEWER CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* Global notification banner */}
        {uploadSuccessMsg && (
          <div className="mb-6 p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-lg flex items-center gap-3 shadow-lg">
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm font-mono">{uploadSuccessMsg}</p>
          </div>
        )}

        {/* --- TAB 1: GALLERY ARCHIVE INDEX --- */}
        {activeTab === 'gallery' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            
            {/* Backdrop for Drawer */}
            {isDrawerOpen && (
              <div 
                className="fixed inset-0 z-45 bg-black/75 backdrop-blur-sm transition-opacity"
                onClick={() => setIsDrawerOpen(false)}
              />
            )}

            {/* LEFT BAR SIDEBAR (SLIDING DRAWER) */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-80 max-w-full bg-[#111215] border-r border-[#292a30] p-5 shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-in-out space-y-4 ${
              isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
              
              {/* Drawer Title & Close Button */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-1 select-none">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider font-mono">Фильтры & Поиск</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 hover:bg-zinc-800 rounded transition text-zinc-400 hover:text-white cursor-pointer"
                  title="Закрыть"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
              
              {/* CARD 1: SEARCH & HOT TAGS */}
              <div id="search-card" className="bg-[#1b1c21] border border-[#292a30] rounded-2xl p-4.5 space-y-4 shadow-xl select-none">
                {/* Search Input Box */}
                <div className="relative">
                  <div className="flex items-center bg-[#121316] border border-zinc-750 rounded-xl overflow-hidden focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500/35 transition">
                    <div className="pl-3.5 pr-1 text-zinc-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input 
                      type="text"
                      value={tagInputText}
                      onChange={(e) => {
                        setTagInputText(e.target.value);
                        setShowTagSuggestions(true);
                      }}
                      onFocus={() => setShowTagSuggestions(true)}
                      placeholder="Search"
                      className="w-full bg-transparent border-none text-xs text-zinc-100 py-3.5 pl-1.5 pr-3 outline-none placeholder:text-zinc-550 font-sans font-medium animate-fadeIn"
                    />
                    {tagInputText && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setTagInputText('');
                          setSelectedTags([]);
                          setShowTagSuggestions(false);
                        }}
                        className="p-1 text-zinc-500 hover:text-white mr-2.5 cursor-pointer"
                        title="Очистить"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown tag search suggestions */}
                  {showTagSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-[#16181e] border border-zinc-700 rounded-lg shadow-2xl overflow-hidden z-40 divide-y divide-zinc-850 font-mono max-h-[240px] overflow-y-auto">
                      {filteredSuggestions.map(tag => {
                        let dotColor = 'bg-blue-400';
                        let hoverBg = 'hover:bg-blue-950/20 hover:text-blue-300';
                        let badgeBg = 'bg-blue-900/20 text-blue-400';
                        
                        if (tag.category === 'character') {
                          dotColor = 'bg-emerald-400';
                          hoverBg = 'hover:bg-emerald-950/30 hover:text-emerald-300';
                          badgeBg = 'bg-emerald-950/40 text-emerald-400';
                        } else if (tag.category === 'copyright') {
                          dotColor = 'bg-purple-400';
                          hoverBg = 'hover:bg-purple-950/30 hover:text-purple-300';
                          badgeBg = 'bg-purple-950/40 text-purple-400';
                        } else if (tag.category === 'artist') {
                          dotColor = 'bg-rose-400';
                          hoverBg = 'hover:bg-rose-955 hover:text-rose-300';
                          badgeBg = 'bg-rose-955 text-rose-400';
                        }

                        return (
                          <div 
                            key={tag.name}
                            onClick={() => handleAddSearchTag(tag.name)}
                            className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition duration-150 ${hoverBg}`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                              <span className="font-semibold">{tag.name}</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] text-zinc-500 font-mono">x{tag.count || 0}</span>
                              <span className={`text-[8px] font-mono tracking-wider px-1 py-0.2 rounded uppercase ${badgeBg}`}>{tag.category}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Hot tags block */}
                <div className="space-y-3.5 pt-1">
                  <span className="text-zinc-200 font-sans text-[13px] font-bold block ml-0.5">Hot tags</span>
                  
                  <div className="flex flex-wrap gap-2">
                    {/* Dynamic usage-sorted tags shown recursively */}
                    {sortedTags.slice(0, 10).map(tagItem => {
                      const isActive = selectedTags.some(t => t.toLowerCase() === tagItem.name.toLowerCase() || t.toLowerCase() === '-' + tagItem.name.toLowerCase());
                      const useCount = posts.filter(p => p.tags && p.tags.some(t => t.toLowerCase() === tagItem.name.toLowerCase())).length;
                      return (
                        <button
                          key={tagItem.name}
                          onClick={() => handleToggleHotTag(tagItem.name)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold select-none transition border border-transparent cursor-pointer flex items-center gap-1 ${
                            isActive 
                              ? 'ring-2 ring-white/60 bg-purple-650 text-white' 
                              : getHotTagColor(tagItem.name)
                          }`}
                        >
                          <span>{tagItem.name.replace(/_/g, ' ')}</span>
                          <span className="opacity-50 text-[9px] font-mono">({useCount})</span>
                        </button>
                      );
                    })}

                    {/* expansion options */}
                    {showMoreHotTags && sortedTags.slice(10, 30).map(tagItem => {
                      const isActive = selectedTags.some(t => t.toLowerCase() === tagItem.name.toLowerCase() || t.toLowerCase() === '-' + tagItem.name.toLowerCase());
                      const useCount = posts.filter(p => p.tags && p.tags.some(t => t.toLowerCase() === tagItem.name.toLowerCase())).length;
                      return (
                        <button
                          key={tagItem.name}
                          onClick={() => handleToggleHotTag(tagItem.name)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold select-none transition border border-transparent cursor-pointer flex items-center gap-1 ${
                            isActive 
                              ? 'ring-2 ring-white/60 bg-purple-655 text-white' 
                              : 'bg-[#292a30] text-zinc-300 hover:bg-[#34363d] flex items-center gap-1'
                          }`}
                        >
                          <span>{tagItem.name.replace(/_/g, ' ')}</span>
                          <span className="opacity-50 text-[9px] font-mono">({useCount})</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Expansion trigger text */}
                  <button
                    type="button"
                    onClick={() => setShowMoreHotTags(!showMoreHotTags)}
                    className="text-xs font-semibold text-zinc-400 hover:text-white transition block ml-0.5 pt-1 focus:outline-none cursor-pointer"
                  >
                    {showMoreHotTags ? 'Show less' : 'Show more (+20)'}
                  </button>
                </div>
              </div>

              {/* CARD 2: FILTERS AND SETTINGS (COLLAPSIBLE ACCORDION) */}
              <div id="filters-card" className="bg-[#1b1c21] border border-[#292a30] rounded-2xl p-4.5 space-y-4 shadow-xl select-none animate-fadeIn">
                
                {/* Header Toggler */}
                <div 
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <span className="text-zinc-200 font-sans text-sm font-bold">Filters And Settings</span>
                  <button className="text-zinc-400 group-hover:text-white transition focus:outline-none">
                    <span className="text-xs font-bold block transform duration-200 select-none">
                      {filtersExpanded ? '▲' : '▼'}
                    </span>
                  </button>
                </div>

                {/* Collapsible Panel */}
                {filtersExpanded && (
                  <div className="space-y-4 pt-1 animate-fadeIn divide-y divide-zinc-850">
                    
                    {/* Toggle: Filter AI posts */}
                    <div className="flex items-center justify-between text-zinc-200 text-xs font-semibold py-1">
                      <span>Filter AI posts</span>
                      <button 
                        type="button"
                        onClick={() => setFilterAiPosts(!filterAiPosts)}
                        className={`w-12 h-6.5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${filterAiPosts ? 'bg-emerald-500' : 'bg-[#404249]'}`}
                      >
                        <div className={`bg-[#121316] w-5.5 h-5.5 rounded-full shadow-md transform duration-150 flex items-center justify-center ${filterAiPosts ? 'translate-x-5.5' : 'translate-x-0'}`}>
                          <span className="text-[10px] text-zinc-500 font-bold font-sans select-none">—</span>
                        </div>
                      </button>
                    </div>

                    {/* Group: Media type */}
                    <div className="space-y-2 pt-3">
                      <span className="text-zinc-400 font-sans text-xs font-bold block">Media type</span>
                      <div className="flex gap-2">
                        {(['all', 'images', 'videos'] as const).map((type) => {
                          const isActive = mediaTypeFilter === type;
                          const labels = { all: 'All', images: 'Images', videos: 'Videos' };
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setMediaTypeFilter(type)}
                              className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer select-none ${
                                isActive 
                                  ? 'bg-[#a3e635] text-zinc-950 font-extrabold shadow-sm' 
                                  : 'bg-[#292a30] text-zinc-350 hover:bg-[#34363d]'
                              }`}
                            >
                              {labels[type]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Group: Sort */}
                    <div className="space-y-2 pt-3">
                      <span className="text-zinc-400 font-sans text-xs font-bold block">Sort</span>
                      <div className="flex flex-wrap gap-2">
                        {(['newest', 'score', 'views'] as const).map((sortOpt) => {
                          const isActive = sortBy === sortOpt;
                          const labels = { newest: 'Latest', score: 'Top Rated', views: 'Most Viewed' };
                          return (
                            <button
                              key={sortOpt}
                              type="button"
                              onClick={() => setSortBy(sortOpt)}
                              className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer select-none ${
                                isActive 
                                  ? 'bg-[#a3e635] text-zinc-950 font-extrabold shadow-sm' 
                                  : 'bg-[#292a30] text-zinc-355 hover:bg-[#34363d]'
                              }`}
                            >
                              {labels[sortOpt]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Group: Grid Layout */}
                    <div className="space-y-2 pt-3">
                      <span className="text-zinc-400 font-sans text-xs font-bold block">Grid Layout</span>
                      <div className="flex gap-2">
                        {(['grid', 'masonry'] as const).map((layoutOpt) => {
                          const isActive = gridLayout === layoutOpt;
                          const labels = { grid: 'Grid', masonry: 'Masonry' };
                          return (
                            <button
                              key={layoutOpt}
                              type="button"
                              onClick={() => setGridLayout(layoutOpt)}
                              className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer select-none ${
                                isActive 
                                  ? 'bg-[#a3e635] text-zinc-950 font-extrabold shadow-sm' 
                                  : 'bg-[#292a30] text-zinc-355 hover:bg-[#34363d]'
                              }`}
                            >
                              {labels[layoutOpt]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Group: Infinite Scroll */}
                    <div className="space-y-2 pt-3">
                      <span className="text-zinc-400 font-sans text-xs font-bold block">Infinite Scroll</span>
                      <div className="flex gap-2">
                        {([false, true] as const).map((scrollOpt) => {
                          const isActive = infiniteScroll === scrollOpt;
                          const labels = { false: 'Off', true: 'On' };
                          return (
                            <button
                              key={scrollOpt ? 'on' : 'off'}
                              type="button"
                              onClick={() => setInfiniteScroll(scrollOpt)}
                              className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer select-none ${
                                isActive 
                                  ? 'bg-[#a3e635] text-zinc-950 font-extrabold shadow-sm' 
                                  : 'bg-[#292a30] text-zinc-355 hover:bg-[#34363d]'
                              }`}
                            >
                              {labels[scrollOpt ? 'true' : 'false']}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Button: Blacklist */}
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => setShowBlacklistDialog(true)}
                        className="w-full py-2.5 bg-[#292a30] hover:bg-[#34363d] border border-zinc-700/80 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer select-none"
                      >
                        <Settings className="w-4 h-4 text-zinc-400 animate-spin-slow" />
                        <span>Configure Tag Blacklist</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>

              {/* WRAPPING ORIGINAL CONTENT IN A COLLAPSIBLE DIRECTORY (CLEARED) */}
              <div className="hidden opacity-0 pointer-events-none h-0 w-0 overflow-hidden select-none" aria-hidden="true">

              {/* Tag Categories Directory */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h4 className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold font-mono">
                    Справочник тегов
                  </h4>
                  <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded font-mono text-zinc-500">{tags.length} всего</span>
                </div>

                {!supabaseConfig.isEnabled ? (
                  <p className="text-xs text-zinc-500 italic font-mono">Подключите базу данных Supabase для загрузки актуального справочника тегов.</p>
                ) : (
                  <div className="space-y-5">
                    {/* Character Tag block */}
                    {(() => {
                      const sortedGroups = getCategorizedTags();
                      return (
                        <>
                          {sortedGroups.character.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-emerald-400 block border-b border-zinc-800/60 pb-1">👤 Персонажи (Character)</span>
                              <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1 select-none">
                                {sortedGroups.character.map(tag => (
                                  <div 
                                    key={tag.name}
                                    className="group/tagrow flex items-center justify-between text-xs font-mono px-2 py-1 rounded transition bg-zinc-950/20 hover:bg-[#131418] border border-transparent hover:border-zinc-850"
                                  >
                                    <button 
                                      onClick={() => handleQueryOnlyTag(tag.name)}
                                      className="text-left text-[#52b788] hover:text-[#74c69d] font-medium truncate flex-grow cursor-pointer"
                                      title={`Искать только ${tag.name}`}
                                    >
                                      {tag.name}
                                    </button>
                                    <div className="flex items-center gap-1 shrink-0 ml-1.5">
                                      <span className="text-[9px] text-zinc-500 font-mono">({tag.count || 0})</span>
                                      <button
                                        onClick={() => handleQueryAddTag(tag.name)}
                                        className="text-[9px] bg-emerald-950/30 hover:bg-emerald-700 border border-emerald-900/40 text-emerald-400 hover:text-white px-1 py-0 rounded transition cursor-pointer font-bold font-sans"
                                        title="Добавить к фильтру"
                                      >
                                        +
                                      </button>
                                      <button
                                        onClick={() => handleQueryExcludeTag(tag.name)}
                                        className="text-[9px] bg-red-950/30 hover:bg-red-700 border border-red-900/40 text-rose-400 hover:text-white px-1 py-0 rounded transition cursor-pointer font-bold font-sans"
                                        title="Исключить"
                                      >
                                        -
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {sortedGroups.copyright.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-purple-400 block border-b border-zinc-800/60 pb-1">🎬 Серии / Медиа (Copyright)</span>
                              <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1 select-none">
                                {sortedGroups.copyright.map(tag => (
                                  <div 
                                    key={tag.name}
                                    className="group/tagrow flex items-center justify-between text-xs font-mono px-2 py-1 rounded transition bg-zinc-950/20 hover:bg-[#131418] border border-transparent hover:border-zinc-850"
                                  >
                                    <button 
                                      onClick={() => handleQueryOnlyTag(tag.name)}
                                      className="text-left text-[#be92ff] hover:text-[#d5b8ff] font-medium truncate flex-grow cursor-pointer"
                                      title={`Искать только ${tag.name}`}
                                    >
                                      {tag.name}
                                    </button>
                                    <div className="flex items-center gap-1 shrink-0 ml-1.5">
                                      <span className="text-[9px] text-zinc-500 font-mono">({tag.count || 0})</span>
                                      <button
                                        onClick={() => handleQueryAddTag(tag.name)}
                                        className="text-[9px] bg-purple-950/30 hover:bg-[#8338ec] border border-purple-900/45 text-purple-400 hover:text-white px-1 py-0 rounded transition cursor-pointer font-bold font-sans"
                                        title="Добавить к фильтру"
                                      >
                                        +
                                      </button>
                                      <button
                                        onClick={() => handleQueryExcludeTag(tag.name)}
                                        className="text-[9px] bg-red-950/30 hover:bg-red-700 border border-red-900/40 text-rose-400 hover:text-white px-1 py-0 rounded transition cursor-pointer font-bold font-sans"
                                        title="Исключить"
                                      >
                                        -
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {sortedGroups.artist.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-rose-400 block border-b border-zinc-800/60 pb-1">🎨 Художники (Artist)</span>
                              <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1 select-none">
                                {sortedGroups.artist.map(tag => (
                                  <div 
                                    key={tag.name}
                                    className="group/tagrow flex items-center justify-between text-xs font-mono px-2 py-1 rounded transition bg-zinc-950/20 hover:bg-[#131418] border border-transparent hover:border-zinc-850"
                                  >
                                    <button 
                                      onClick={() => handleQueryOnlyTag(tag.name)}
                                      className="text-left text-[#ff8fa3] hover:text-[#ffb3c1] font-medium truncate flex-grow cursor-pointer"
                                      title={`Искать только ${tag.name}`}
                                    >
                                      {tag.name}
                                    </button>
                                    <div className="flex items-center gap-1 shrink-0 ml-1.5">
                                      <span className="text-[9px] text-zinc-500 font-mono">({tag.count || 0})</span>
                                      <button
                                        onClick={() => handleQueryAddTag(tag.name)}
                                        className="text-[9px] bg-rose-950/30 hover:bg-rose-750 border border-rose-900/45 text-rose-400 hover:text-white px-1 py-0 rounded transition cursor-pointer font-bold font-sans"
                                        title="Добавить к фильтру"
                                      >
                                        +
                                      </button>
                                      <button
                                        onClick={() => handleQueryExcludeTag(tag.name)}
                                        className="text-[9px] bg-red-950/30 hover:bg-red-700 border border-red-900/40 text-rose-400 hover:text-white px-1 py-0 rounded transition cursor-pointer font-bold font-sans"
                                        title="Исключить"
                                      >
                                        -
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {sortedGroups.general.length > 0 && (
                            <div className="space-y-1.5 font-mono">
                              <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400 block border-b border-zinc-800/60 pb-1">🏷️ Популярные (General)</span>
                              <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1 select-none">
                                {sortedGroups.general.slice(0, 30).map(tag => (
                                  <div 
                                    key={tag.name}
                                    className="group/tagrow flex items-center justify-between text-xs px-2 py-1 rounded transition bg-zinc-950/20 hover:bg-[#131418] border border-transparent hover:border-zinc-850"
                                  >
                                    <button 
                                      onClick={() => handleQueryOnlyTag(tag.name)}
                                      className="text-left text-[#3a86ff] hover:text-[#60a5fa] font-medium truncate flex-grow cursor-pointer"
                                      title={`Искать только ${tag.name}`}
                                    >
                                      {tag.name}
                                    </button>
                                    <div className="flex items-center gap-1 shrink-0 ml-1.5">
                                      <span className="text-[9px] text-zinc-500 font-mono">({tag.count || 0})</span>
                                      <button
                                        onClick={() => handleQueryAddTag(tag.name)}
                                        className="text-[9px] bg-blue-955 hover:bg-blue-700 border border-blue-900/40 text-blue-400 hover:text-white px-1 py-0 rounded transition cursor-pointer font-bold font-sans"
                                        title="Добавить к фильтру"
                                      >
                                        +
                                      </button>
                                      <button
                                        onClick={() => handleQueryExcludeTag(tag.name)}
                                        className="text-[9px] bg-red-955 hover:bg-red-700 border border-red-900/40 text-rose-400 hover:text-white px-1 py-0 rounded transition cursor-pointer font-bold font-sans"
                                        title="Исключить"
                                      >
                                        -
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* STATS */}
              <div className="bg-[#0b0c10]/40 border border-zinc-850/80 p-4 rounded-xl space-y-3 font-mono text-[11px] select-none text-zinc-400">
                <div className="flex items-center gap-2 border-b border-zinc-900 pb-2 text-indigo-400 font-bold text-[10px] uppercase">
                  <Info className="w-4 h-4 text-violet-500" />
                  <span>Stats</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total posts</span>
                    <span className="font-extrabold text-white">{posts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total tags</span>
                    <span className="font-extrabold text-white">{tags.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Artists</span>
                    <span className="font-extrabold text-white">
                      {tags.filter(t => t.category === 'artist').length}
                    </span>
                  </div>
                </div>
              </div>

              {/* RECENTLY VIEWED */}
              {recentlyViewed.length > 0 && (
                <div className="bg-[#0b0c10]/40 border border-zinc-850/80 p-4 rounded-xl space-y-3 select-none">
                  <div className="text-[10px] font-bold font-mono tracking-wider text-zinc-500 uppercase border-b border-zinc-900 pb-2">
                    RECENTLY VIEWED
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentlyViewed.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleViewPost(p)}
                        className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-850 hover:border-violet-500 bg-zinc-950 transition shrink-0 cursor-pointer"
                      >
                        <img src={getPostDisplayUrl(p)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              </div>
            </aside>

            {/* MAIN ARCHIVE GRID DISPLAY & SEARCH INPUT */}
            <section className="col-span-12 space-y-6">
              {selectedPost ? (
                <div className="fixed inset-0 z-50 bg-[#07080a]/98 flex flex-col md:flex-row select-text animate-fadeIn overflow-y-auto md:overflow-hidden">
                  {/* Large close button in the top right, styled with dark green and lime details */}
                  <button 
                    onClick={() => setSelectedPost(null)}
                    className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-[#1b251c] text-[#abffb3] border border-[#3b5d3f]/60 hover:border-rose-500/85 hover:text-white hover:bg-rose-950/80 transition-all shadow-lg shadow-black/50 cursor-pointer animate-fadeIn"
                    title="Закрыть (Esc)"
                  >
                    <X className="w-5 h-5 font-bold" />
                  </button>

                  {/* LEFT SIDEBAR: Tag listings and info */}
                  <div className="w-full md:w-80 border-t md:border-t-0 md:border-r border-[#1a1b26] bg-[#07080a] h-auto md:h-full flex flex-col shrink-0 md:overflow-y-auto select-none p-4 custom-scrollbar space-y-5 order-2 md:order-1">
                    {/* Brief title */}
                    <div className="flex items-center gap-2 pb-3 border-b border-[#141520]">
                      <Database className="w-4.5 h-4.5 text-violet-500" />
                      <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest font-bold">Свойства публикации</span>
                    </div>

                    {/* Sidebar search bar to filter post tags */}
                    <div>
                      <div className="flex items-center bg-[#0d0e11] border border-[#1a1c24] rounded-xl px-3 py-1.5 gap-2">
                        <Search className="w-3.5 h-3.5 text-zinc-650" />
                        <input 
                          type="text"
                          placeholder="Поиск тегов..."
                          value={sidebarTagQuery}
                          onChange={(e) => setSidebarTagQuery(e.target.value)}
                          className="bg-transparent border-none text-[11px] text-zinc-350 outline-none w-full placeholder:text-zinc-600 font-mono"
                        />
                        {sidebarTagQuery && (
                          <button onClick={() => setSidebarTagQuery('')} className="text-[11px] text-zinc-555 hover:text-white">✕</button>
                        )}
                      </div>
                    </div>

                    {/* Display tags grouped by category */}
                    <div className="space-y-4">
                      {['artist', 'character', 'copyright', 'general', 'meta'].map(cat => {
                        const filteredCatTags = (Array.from(new Set(selectedPost.tags)) as string[])
                          .filter(t => {
                            const tObj = tags.find(tag => tag.name.toLowerCase() === t.toLowerCase().trim());
                            const tagCat = tObj ? tObj.category : 'general';
                            return tagCat === cat;
                          })
                          .filter(t => t.toLowerCase().includes(sidebarTagQuery.toLowerCase().trim()));

                        if (filteredCatTags.length === 0) return null;

                        const catColor = getCategoryColor(cat);

                        return (
                          <div key={cat} className="space-y-1.5 animate-fadeIn">
                            <div className="flex items-center gap-1.5 border-b border-zinc-900/40 pb-1 pt-1">
                              <span className={`text-[10px] uppercase font-bold tracking-wider ${catColor.headerText}`}>
                                {cat === 'artist' ? 'artists' : cat === 'character' ? 'characters' : cat === 'copyright' ? 'copyrights' : cat === 'general' ? 'general tags' : 'metadata'}
                              </span>
                            </div>
                            
                            <ul className="space-y-1.5 font-mono text-[12px] pr-1">
                              {filteredCatTags.map(tagName => {
                                const displayCount = getTagCount(tagName);
                                const isLiked = followedTags.includes(tagName);

                                return (
                                  <li key={tagName} className="flex items-center justify-between group/li hover:bg-zinc-950/20 py-0.5 px-1 rounded transition">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <button 
                                        onClick={() => handleToggleFollowTag(tagName)}
                                        className="text-zinc-700 hover:text-rose-500 transition-colors shrink-0 cursor-pointer"
                                        title={isLiked ? "Убрать из любимых" : "В любимые теги"}
                                      >
                                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500 shadow-sm' : 'text-zinc-700'}`} />
                                      </button>
                                      <button 
                                        onClick={() => {
                                          handleQueryOnlyTag(tagName);
                                          setSelectedPost(null);
                                        }}
                                        className={`hover:underline truncate text-left cursor-pointer font-sans ${catColor.text}`}
                                      >
                                        {tagName.replace(/_/g, ' ')}
                                      </button>
                                    </div>
                                    <span className="text-[10px] text-zinc-650 shrink-0 select-none font-mono">
                                      ({displayCount})
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>

                    {/* Information Panel inside sidebar */}
                    <div className="pt-4 border-t border-[#141520] space-y-3 font-mono text-[11px] text-zinc-450 select-none pb-4">
                      <div className="flex items-center gap-1 text-zinc-550 uppercase text-[10px] font-bold">
                        <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>ИНФОРМАЦИЯ</span>
                      </div>

                      <div className="space-y-1.5 bg-[#090a0d] p-3 rounded-xl border border-zinc-900/40">
                        <div className="flex justify-between py-1 border-b border-[#141620]/30">
                          <span className="text-zinc-650 flex items-center gap-1 text-[10px] uppercase">
                            <FileText className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                            <span>Формат</span>
                          </span>
                          <span className="font-bold text-zinc-350 uppercase">
                            {isPostComic(selectedPost) ? 'комикс' : isUrlVideo(selectedPost.url) ? 'видео' : selectedPost.url.includes('.gif') ? 'гифка' : 'изображение'}
                          </span>
                        </div>

                        <div className="flex justify-between py-1 border-b border-[#141620]/30">
                          <span className="text-zinc-650 flex items-center gap-1 text-[10px] uppercase">
                            <User className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                            <span>Автор</span>
                          </span>
                          <button
                            onClick={() => {
                              const artist = selectedPost.tags.find(tag => tags.find(t => t.name === tag && t.category === 'artist'));
                              if (artist) {
                                  handleQueryOnlyTag(artist);
                                  setSelectedPost(null);
                              }
                            }}
                            className="font-bold text-violet-450 hover:text-violet-300 hover:underline hover:cursor-pointer transition"
                          >
                            {selectedPost.tags.find(tag => tags.find(t => t.name === tag && t.category === 'artist')) || selectedPost.uploader || 'anonymous_author'}
                          </button>
                        </div>

                        <div className="flex justify-between py-1 border-b border-[#141620]/30">
                          <span className="text-zinc-650 flex items-center gap-1 text-[10px] uppercase">
                            <Maximize2 className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                            <span>Разрешение</span>
                          </span>
                          <span className="font-bold text-zinc-350">
                            {mediaDetails.dimensions}
                          </span>
                        </div>

                        <div className="flex justify-between py-1 border-b border-[#141620]/30">
                          <span className="text-zinc-650 flex items-center gap-1 text-[10px] uppercase">
                            <Database className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                            <span>Размер</span>
                          </span>
                          <span className="font-bold text-zinc-350">
                            {mediaDetails.size}
                          </span>
                        </div>

                        <div className="flex justify-between py-1">
                          <span className="text-zinc-650 flex items-center gap-1 text-[10px] uppercase">
                            <ShieldCheck className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                            <span>Рейтинг</span>
                          </span>
                          <span className={`font-bold uppercase tracking-wider ${
                            selectedPost.rating === 'explicit' ? 'text-rose-500' :
                            selectedPost.rating === 'questionable' ? 'text-amber-500' : 'text-emerald-400'
                          }`}>
                            {selectedPost.rating}
                          </span>
                        </div>
                      </div>

                      {/* Small details / edit bulk tags list */}
                      <div className="pt-2">
                        {!isEditingBulkTags ? (
                          <button
                            onClick={handleOpenEditPost}
                            className="w-full text-center py-2 bg-indigo-950/40 border border-indigo-900/30 hover:bg-indigo-900/40 hover:border-indigo-700/50 rounded-xl text-[10px] font-mono font-bold text-indigo-300 transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Settings className="w-3.5 h-3.5 text-indigo-400" />
                            Редактировать публикацию
                          </button>
                        ) : (
                          <div className="space-y-3 bg-[#0a0b0e] border border-zinc-900 p-3 rounded-2xl font-sans text-xs">
                            <h4 className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest border-b border-zinc-900/80 pb-1 flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5 text-violet-500" />
                              Изменить публикацию
                            </h4>

                            <div className="space-y-1.5">
                              <label className="text-[9px] font-mono uppercase font-bold text-zinc-500 block">Название:</label>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full bg-[#050608] border border-zinc-850 rounded-xl px-2.5 py-1.5 text-[10.5px] text-zinc-150 focus:border-violet-600 focus:outline-none"
                                placeholder="Название..."
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[9px] font-mono uppercase font-bold text-zinc-500 block">Категория рейтинга:</label>
                              <select
                                value={editRating}
                                onChange={(e) => setEditRating(e.target.value as any)}
                                className="w-full bg-[#050608] border border-zinc-850 rounded-xl px-2.5 py-1.5 text-[10.5px] text-zinc-155 focus:border-violet-600 focus:outline-none"
                              >
                                <option value="safe">Safe (Безопасно)</option>
                                <option value="questionable">Questionable (Сомнительно)</option>
                                <option value="explicit">Explicit (18+)</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[9px] font-mono uppercase font-bold text-zinc-500 block">Источник (Source URL):</label>
                              <input
                                type="text"
                                value={editSource}
                                onChange={(e) => setEditSource(e.target.value)}
                                className="w-full bg-[#050608] border border-zinc-850 rounded-xl px-2.5 py-1.5 text-[10.5px] text-zinc-150 focus:border-violet-600 focus:outline-none"
                                placeholder="http://..."
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[9px] font-mono uppercase font-bold text-zinc-500 block">Описание работы:</label>
                              <textarea
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                rows={2}
                                className="w-full bg-[#050608] border border-zinc-850 rounded-xl p-2.5 text-[10.5px] text-zinc-150 focus:border-violet-600 focus:outline-none"
                                placeholder="Добавьте описание..."
                              />
                            </div>

                            <div className="space-y-2 border-t border-zinc-900/80 pt-2">
                              <label className="text-[9px] font-mono uppercase font-bold text-zinc-500 block">Файл Медиа:</label>
                              <input
                                type="text"
                                value={editUrl}
                                onChange={(e) => setEditUrl(e.target.value)}
                                className="w-full bg-[#050608] border border-zinc-850 rounded-xl px-2.5 py-1.5 text-[10.5px] text-zinc-150 focus:border-violet-600 focus:outline-none font-mono text-[9px]"
                                placeholder="Ссылка на файл..."
                              />
                              <div className="relative">
                                <input
                                  type="file"
                                  id="edit-file-uploader"
                                  onChange={handleUploadEditFile}
                                  className="hidden"
                                />
                                <label
                                  htmlFor="edit-file-uploader"
                                  className="w-full py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-350 hover:text-white rounded-lg text-[9px] font-mono font-bold uppercase transition block text-center cursor-pointer"
                                >
                                  {isSavingEdit ? 'Загрузка файла...' : '📁 Загрузить новый файл'}
                                </label>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[9px] font-mono uppercase font-bold text-zinc-500 block">Обложка (Cover URL):</label>
                              <input
                                type="text"
                                value={editCoverUrl}
                                onChange={(e) => setEditCoverUrl(e.target.value)}
                                className="w-full bg-[#050608] border border-zinc-850 rounded-xl px-2.5 py-1.5 text-[10.5px] text-zinc-150 focus:border-violet-600 focus:outline-none font-mono text-[9px]"
                                placeholder="Ссылка на обложку..."
                              />
                              <div className="relative">
                                <input
                                  type="file"
                                  id="edit-cover-uploader"
                                  onChange={handleUploadEditCoverFile}
                                  className="hidden"
                                />
                                <label
                                  htmlFor="edit-cover-uploader"
                                  className="w-full py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-350 hover:text-white rounded-lg text-[9px] font-mono font-bold uppercase transition block text-center cursor-pointer"
                                >
                                  {isSavingEdit ? 'Загрузка...' : '🖼️ Загрузить новую обложку'}
                                </label>
                              </div>
                            </div>

                            <div className="space-y-1.5 border-t border-zinc-900/80 pt-2 font-mono">
                              <label className="text-[9px] uppercase font-bold text-zinc-500 block">Список тегов (через пробел):</label>
                              <textarea
                                value={editTags}
                                onChange={(e) => setEditTags(e.target.value)}
                                rows={4}
                                className="w-full bg-[#050608] border border-zinc-850 rounded-xl p-2 text-[10px] text-zinc-150 focus:border-violet-600 focus:outline-[#343b4e] focus:outline-none placeholder-zinc-750"
                                placeholder="miku_art vocaloid green_hair"
                              />
                            </div>

                            <div className="flex gap-1.5 border-t border-zinc-900/85 pt-2 font-mono">
                              <button
                                onClick={handleSavePostDetails}
                                disabled={isSavingEdit}
                                className="flex-grow py-1.5 bg-violet-600 hover:bg-violet-500 border border-violet-500/20 text-white rounded-lg text-[10px] font-bold uppercase cursor-pointer"
                              >
                                Сохранить
                              </button>
                              <button
                                onClick={() => setIsEditingBulkTags(false)}
                                disabled={isSavingEdit}
                                className="flex-grow py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg text-[10px] font-bold uppercase cursor-pointer"
                              >
                                Отмена
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Post Removal options */}
                      <div className="pt-2 border-t border-[#141520] font-sans">
                        {showDeleteConfirm ? (
                          <div className="bg-red-955 border border-red-900/30 p-2.5 rounded-xl space-y-2">
                            <p className="text-[10px] text-red-300 font-sans leading-tight uppercase font-semibold">Удалить из архива навсегда?</p>
                            <div className="flex gap-1.5">
                              <button 
                                onClick={handleDeletePost}
                                className="flex-grow py-1 bg-rose-600 font-bold font-mono hover:bg-rose-500 text-white rounded-lg text-[10px] uppercase cursor-pointer"
                              >
                                Да
                              </button>
                              <button 
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-grow py-1 bg-zinc-855 border border-zinc-750 font-bold font-mono text-zinc-400 rounded-lg text-[10px] uppercase cursor-pointer"
                              >
                                Нет
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full py-2 bg-rose-950/10 hover:bg-rose-950/20 text-rose-455 hover:text-rose-350 border border-rose-955 hover:border-rose-900/50 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1 px-3 cursor-pointer"
                            title="Удалить из архива"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Удалить публикацию</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT CONTENT COLUMN Opening */}
                  <div className="flex-grow h-auto md:h-full md:overflow-y-auto flex flex-col items-center justify-start p-4 md:p-8 bg-[#040508] relative select-none order-1 md:order-2 w-full">
                    
                    {/* Media Viewer Frame */}
                    <div 
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      className={`bg-black/95 border border-[#1a1c24] p-1.5 rounded-2xl flex flex-col items-center justify-center relative min-h-[220px] sm:min-h-[300px] transition-all duration-300 select-none shadow-2xl shadow-black/80 w-full ${
                        isZoomed 
                          ? 'max-h-none overflow-y-auto max-w-5xl' 
                          : 'max-h-[65vh] md:max-h-[75vh] overflow-hidden max-w-4xl'
                      }`}
                    >
                        {/* Interactive nav chevrons on sides */}
                        <button 
                          onClick={handlePrevAction}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/85 border border-zinc-855 hover:border-violet-500 hover:text-white text-zinc-400 transition opacity-0 group-hover:opacity-100 focus:opacity-100 z-30 hidden sm:flex cursor-pointer"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
 
                        <div className="w-full flex-grow flex items-center justify-center relative min-h-[180px] sm:min-h-[260px]">
                          {/* Left / Right active overlay flip zones (DISABLED FOR VIDEOS OR WHEN ZOOMED) */}
                          {!isUrlVideo(isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url) && !isZoomed && (
                            <>
                              <div 
                                onClick={(e) => { e.stopPropagation(); handlePrevAction(); }}
                                className="absolute top-0 left-0 w-1/4 h-full cursor-w-resize z-20 hover:bg-gradient-to-r hover:from-white/[0.005] hover:to-transparent"
                                title="Предыдущий (Клик)"
                              />
                              <div 
                                onClick={(e) => { e.stopPropagation(); handleNextAction(); }}
                                className="absolute top-0 right-0 w-1/4 h-full cursor-e-resize z-25 hover:bg-gradient-to-l hover:from-white/[0.005] hover:to-transparent"
                                title="Следующий (Клик)"
                              />
                            </>
                          )}
 
                          {isUrlVideo(isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url) ? (
                            <video 
                              key={isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url}
                              src={isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url} 
                              controls 
                              autoPlay 
                              loop 
                              playsInline 
                              className="max-h-[48vh] md:max-h-[55vh] w-auto max-w-full rounded-xl object-contain relative z-10 shadow-lg"
                            />
                          ) : isUrlDownloadable(isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url) ? (
                            <div className="flex flex-col items-center justify-center p-6 bg-[#0b0f19] border border-zinc-800 rounded-2xl space-y-4 max-w-md w-full relative z-30 text-center select-text shadow-xl">
                              <div className="w-14 h-14 rounded-full bg-violet-600/10 flex items-center justify-center border border-violet-500/20 text-violet-400">
                                <FolderDown className="w-7 h-7 animate-pulse" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-zinc-100 font-mono tracking-tight break-all px-2">
                                  {(isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url).split('/').pop()}
                                </p>
                                <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider font-bold">Исполняемый файл / Установщик / Архив</p>
                              </div>
                              <a 
                                href={isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white rounded-xl font-bold font-mono text-xs shadow-lg shadow-violet-950/40 border border-violet-500/25 transition flex items-center gap-2 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>СКАЧАТЬ ФАЙЛ</span>
                              </a>
                            </div>
                          ) : (
                            <motion.img 
                              key={isPostComic(selectedPost) ? `comic-page-${currentComicPage}-${selectedPost.id}` : selectedPost.id}
                              initial={isPostComic(selectedPost) ? { x: slideDirection === 'forward' ? 100 : -100, opacity: 0 } : false}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ duration: 0.28, ease: 'easeOut' }}
                              src={isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url} 
                              alt="Медиа"
                              referrerPolicy="no-referrer"
                              onClick={() => setIsZoomed(!isZoomed)}
                              className={`${
                                isZoomed 
                                  ? 'w-full h-auto max-w-none max-h-none cursor-zoom-out' 
                                  : 'max-h-[50vh] md:max-h-[58vh] w-auto max-w-full cursor-zoom-in'
                              } rounded-xl object-contain relative z-10 shadow-lg h-auto transition-all duration-300`}
                            />
                          )}
                        </div>
 
                        {/* Expandable scale zoom action overlay indicator */}
                        {!isUrlVideo(isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url) && !isUrlDownloadable(isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url) && (
                          <button
                            onClick={() => setIsZoomed(!isZoomed)}
                            className="absolute bottom-4 right-4 z-30 px-2.5 py-1.5 rounded-lg bg-black/90 backdrop-blur-sm border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition text-[9px] uppercase tracking-wider font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                            title={isZoomed ? "Вписать в экран" : "Реальный размер"}
                          >
                            <Maximize2 className="w-3 h-3 text-violet-400" />
                            <span>{isZoomed ? "Вписать" : "100% размер"}</span>
                          </button>
                        )}
 
                        <button 
                          onClick={handleNextAction}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/85 border border-zinc-855 hover:border-violet-500 hover:text-white text-zinc-400 transition opacity-0 group-hover:opacity-100 focus:opacity-100 z-30 hidden sm:flex cursor-pointer"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
 
                        {/* Floating page reference indicator */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/95 border border-zinc-850 px-4 py-1.5 rounded-full text-[10px] font-mono text-zinc-400 shadow-xl z-30 whitespace-nowrap">
                          {isPostComic(selectedPost) ? (
                            <span>Страница <strong>{currentComicPage + 1}</strong> из <strong>{getComicPages(selectedPost).length}</strong></span>
                          ) : (
                            <span>Карточка <strong>{getFilteredPosts().findIndex(p => p.id === selectedPost.id) + 1}</strong> из <strong>{getFilteredPosts().length}</strong></span>
                          )}
                        </div>
                      </div>

                      {/* Title block with color-coded tags shown at the bottom of media */}
                      <div className="w-full mt-4 bg-[#0a0c10] border border-zinc-900/60 p-4 rounded-xl space-y-3 select-none">
                        
                        <div className="flex flex-wrap gap-1.5 font-mono select-none">
                          {(Array.from(new Set(selectedPost.tags)) as string[]).map(t => {
                            const catInfo = tags.find(tag => tag.name === t);
                            const cat = catInfo ? catInfo.category : 'general';
                            const catColor = getCategoryColor(cat);
                            return (
                              <button
                                key={t}
                                onClick={() => { handleQueryOnlyTag(t); setSelectedPost(null); }}
                                className={`px-2.5 py-0.5 rounded-lg text-[10px] border transition flex items-center gap-0.5 cursor-pointer ${catColor.badge}`}
                              >
                                <span>#</span>
                                <span>{t.replace(/_/g, ' ')}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* COMPACT ACTIONS PILL BAR: Rating, Thumbs, Favorite, Source, Original download */}
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-4 w-full py-1.5 px-3 bg-[#0a0c10] border border-zinc-900 rounded-xl select-none shadow-lg">
                        {/* Vote Up */}
                        <button 
                          onClick={() => handleVotePost(selectedPost.id, 'up')}
                          className="px-3.5 py-1.5 bg-zinc-950 border border-zinc-850 hover:border-emerald-500/40 text-emerald-400 rounded-lg hover:bg-emerald-950/20 font-bold font-mono text-xs flex items-center gap-1.5 transition select-none cursor-pointer"
                          title="Лайк"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{selectedPost.score || 0}</span>
                        </button>

                        {/* Vote Down */}
                        <button 
                          onClick={() => handleVotePost(selectedPost.id, 'down')}
                          className="p-1.5 bg-zinc-950 border border-zinc-850 hover:border-rose-500/40 text-rose-400 rounded-lg hover:bg-rose-955 transition select-none cursor-pointer"
                          title="Дизлайк"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Global Post Favorite state */}
                        <button 
                          onClick={() => handleToggleFavorite(selectedPost.id)}
                          className={`p-1.5 rounded-lg border transition-all select-none cursor-pointer ${
                            favorites.includes(selectedPost.id)
                              ? 'border-pink-500/40 text-pink-500 bg-pink-950/10'
                              : 'bg-zinc-950 border-zinc-850 text-zinc-500 hover:text-pink-400 hover:border-pink-500/30 font-sans'
                          }`}
                          title={favorites.includes(selectedPost.id) ? 'Удалить из избранного' : 'В избранное'}
                        >
                          <Heart className={`w-3.5 h-3.5 ${favorites.includes(selectedPost.id) ? 'fill-pink-500 text-pink-500' : ''}`} />
                        </button>

                        <div className="w-px h-6 bg-zinc-900 mx-1" />

                        {/* Download original */}
                        <a 
                          href={isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url}
                          download={`post-${selectedPost.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-zinc-950 border border-zinc-850 text-zinc-500 hover:text-violet-400 hover:bg-violet-955 hover:border-violet-500/30 rounded-lg transition"
                          title="Скачать исходный медиафайл"
                        >
                          <Database className="w-3.5 h-3.5" />
                        </a>
                        
                        {/* Source link */}
                        {selectedPost.source_url && (
                          <a 
                            href={selectedPost.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-zinc-950 border border-zinc-850 text-zinc-500 hover:text-sky-400 hover:bg-sky-955 hover:border-sky-500/30 rounded-lg transition"
                            title="Первоисточник работы"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {/* PLAYLIST ATTACHMENT WIDGET */}
                      {isSignedUp && customPlaylistsState.length > 0 && (
                        <div className="mt-4.5 w-full bg-[#08090d] border border-zinc-900/80 p-3 rounded-xl select-none text-left">
                          <span className="text-[9.5px] font-mono uppercase tracking-wider text-zinc-550 font-bold block mb-2">
                            Добавить в списки (Playlists)
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {customPlaylistsState.map(pl => {
                              const inPlaylist = pl.postIds.includes(selectedPost.id);
                              return (
                                <button
                                  key={pl.id}
                                  onClick={() => handleTogglePostPlaylist(pl.id, selectedPost.id)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono tracking-wide font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                    inPlaylist
                                      ? 'bg-indigo-950/40 border border-indigo-500 text-indigo-300'
                                      : 'bg-zinc-950 border border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-700'
                                  }`}
                                  title={inPlaylist ? 'Удалить из плейлиста' : 'Добавить в плейлист'}
                                >
                                  {inPlaylist ? <Check className="w-3 h-3 text-indigo-400 font-extrabold" /> : <Plus className="w-3 h-3 text-zinc-650" />}
                                  <span>{pl.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* PRIMARY NAVIGATION BUTTONS row centered */}
                      <div className="flex justify-center gap-3 mt-4 w-full max-w-xl select-none">
                        <button 
                          onClick={handlePrevAction} 
                          className="flex-grow max-w-[200px] h-12 flex items-center justify-center bg-[#0d0f14] border border-[#1a1c24] hover:bg-zinc-900 hover:border-violet-500/50 text-zinc-400 hover:text-white rounded-xl transition cursor-pointer shadow-md shadow-black"
                          title="Предыдущая публикация"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={handleNextAction} 
                          className="flex-grow max-w-[200px] h-12 flex items-center justify-center bg-[#0d0f14] border border-[#1a1c24] hover:bg-zinc-900 hover:border-violet-500/50 text-zinc-400 hover:text-white rounded-xl transition cursor-pointer shadow-md shadow-black"
                          title="Следующая публикация"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </div>

                    </div>

                  </div>
                ) : (
                <>
                  {/* Tag search panel */}
                  <div className="bg-[#121318] border border-zinc-800 p-5 rounded-xl space-y-4">

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const parsed = tagInputText.toLowerCase().split(/\s+/).filter(Boolean);
                    setSelectedTags(parsed);
                    setShowTagSuggestions(false);
                  }}
                  className="flex flex-col sm:flex-row gap-2"
                >
                  <div className="relative flex-grow">
                    <div className="flex items-center bg-[#0d0e11] border border-zinc-700/80 rounded-lg overflow-hidden focus-within:border-emerald-500 focus-within:shadow-[0_0_12px_rgba(16,185,129,0.15)] transition duration-150">
                      <div className="pl-3 py-3 text-zinc-500 shrink-0">
                        <Search className="w-4.5 h-4.5" />
                      </div>
                      <input 
                        type="text"
                        value={tagInputText}
                        onChange={(e) => {
                          setTagInputText(e.target.value);
                          setShowTagSuggestions(true);
                        }}
                        onFocus={() => setShowTagSuggestions(true)}
                        placeholder="hatsune_miku sky -comic -explicit..."
                        className="w-full bg-transparent border-none text-sm text-white px-3 py-3 outline-none placeholder:text-zinc-650 font-mono"
                      />
                      {tagInputText && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setTagInputText('');
                            setSelectedTags([]);
                            setShowTagSuggestions(false);
                          }}
                          className="p-1 text-zinc-500 hover:text-white mr-2 cursor-pointer"
                          title="Очистить всё"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Tag Suggestions Dropdown */}
                    {showTagSuggestions && filteredSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-[#16181e] border border-zinc-700 rounded-lg shadow-2xl overflow-hidden z-35 divide-y divide-zinc-850 font-mono max-h-[300px] overflow-y-auto">
                        {filteredSuggestions.map(tag => {
                          let dotColor = 'bg-blue-400';
                          let hoverBg = 'hover:bg-blue-950/20 hover:text-blue-300';
                          let badgeBg = 'bg-blue-900/20 text-blue-400';
                          
                          if (tag.category === 'character') {
                            dotColor = 'bg-emerald-400';
                            hoverBg = 'hover:bg-emerald-950/30 hover:text-emerald-300';
                            badgeBg = 'bg-emerald-950/40 text-emerald-400';
                          } else if (tag.category === 'copyright') {
                            dotColor = 'bg-purple-400';
                            hoverBg = 'hover:bg-purple-950/30 hover:text-purple-300';
                            badgeBg = 'bg-purple-950/40 text-purple-400';
                          } else if (tag.category === 'artist') {
                            dotColor = 'bg-rose-400';
                            hoverBg = 'hover:bg-rose-950/30 hover:text-rose-300';
                            badgeBg = 'bg-rose-950/40 text-rose-400';
                          } else if (tag.category === 'meta') {
                            dotColor = 'bg-zinc-400';
                            hoverBg = 'hover:bg-zinc-900/60 hover:text-zinc-200';
                            badgeBg = 'bg-zinc-800/50 text-zinc-400';
                          }

                          return (
                            <div 
                              key={tag.name}
                              onClick={() => handleAddSearchTag(tag.name)}
                              className={`px-4 py-2.5 text-xs flex items-center justify-between cursor-pointer transition duration-150 ${hoverBg}`}
                            >
                              <span className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                                <span className="font-semibold">{tag.name}</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-zinc-500">x{tag.count || 0}</span>
                                <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${badgeBg}`}>{tag.category}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-mono text-sm font-bold uppercase tracking-wider rounded-lg transition duration-150 select-none cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Search className="w-4 h-4" />
                      <span>Искать</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTagInputText('');
                        setSelectedTags([]);
                        setShowTagSuggestions(false);
                      }}
                      className="px-4 py-2.5 bg-zinc-900 border border-zinc-750 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 font-mono text-xs font-semibold rounded-lg transition duration-150 select-none cursor-pointer"
                    >
                      Сброс
                    </button>
                  </div>
                </form>

                {/* Display Chosen filters as categorized badges */}
                {selectedTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 items-center bg-[#0d0e11] p-2.5 rounded-lg border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono shrink-0 mr-1.5 font-bold">Активные фильтры:</span>
                    {(Array.from(new Set(selectedTags)) as string[]).map(tag => renderTagBadge(tag, false, () => handleRemoveSearchTag(tag)))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTags([]);
                        setTagInputText('');
                      }}
                      className="text-[10px] font-mono text-rose-400 hover:text-rose-300 ml-auto border border-rose-950 hover:bg-rose-950/20 px-2 py-0.5 rounded transition cursor-pointer"
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                ) : (
                  <div className="text-zinc-500 text-xs font-mono py-1">
                    🟢 Отображаются все публикации. Поддерживается поиск методом AND и исключение с помощью "-".
                  </div>
                )}
              </div>

              {/* GRID ITEMS CARDS LIST */}
              {isLoadingDb ? (
                <div className="p-12 text-center bg-[#121318] border border-zinc-800 rounded-xl space-y-4">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                  <p className="text-xs text-zinc-500 font-mono">Загрузка карточек из бэкенда Supabase...</p>
                </div>
              ) : getFilteredPosts().length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {getFilteredPosts().map((post) => {
                    const isFav = favorites.includes(post.id);
                    const isVideo = isUrlVideo(post.url);
                    return (
                      <article 
                        key={post.id}
                        id={`post-${post.id}`}
                        onClick={() => handleViewPost(post)}
                        onMouseEnter={(e) => {
                          const v = e.currentTarget.querySelector('video');
                          if (v) v.play().catch(() => {});
                        }}
                        onMouseLeave={(e) => {
                          const v = e.currentTarget.querySelector('video');
                          if (v) {
                            v.pause();
                            v.currentTime = 0;
                          }
                        }}
                        className="group bg-[#131418] border border-zinc-800/80 rounded-xl overflow-hidden hover:border-emerald-500/50 shadow-md transition-all duration-300 hover:shadow-emerald-950/10 hover:shadow-lg cursor-pointer flex flex-col relative"
                      >
                        
                        {/* Artwork Preview Frame */}
                        <div className="aspect-[4/3] w-full overflow-hidden relative bg-black/40 flex items-center justify-center">
                          
                          {/* Render Video or Image smoothly */}
                          {isVideo ? (
                            <div className="relative w-full h-full">
                              <video 
                                src={post.url} 
                                loop 
                                muted 
                                playsInline 
                                preload="metadata"
                                className="w-full h-full object-cover animate-fadeIn"
                              />
                            </div>
                          ) : (
                            <img 
                              src={getPostDisplayUrl(post)} 
                              alt="Медиа"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 group-hover:brightness-[1.05]"
                            />
                          )}

                          {/* Overlaid tags preview on hover (subtle, clean) */}
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                          {/* Comic Badge Indicator */}
                          {isPostComic(post) && (
                            <div className="absolute top-2.5 left-2.5 z-10">
                              <span className="text-[9px] font-bold tracking-widest font-mono uppercase px-2 py-0.5 rounded shadow bg-indigo-900/80 border border-indigo-700/30 text-indigo-300 backdrop-blur-xs">
                                📖 {getComicPages(post).length} стр.
                              </span>
                            </div>
                          )}

                          {/* Video Badge Indicator */}
                          {isVideo && (
                            <div className="absolute top-2.5 left-2.5 z-10 bg-black/50 p-1.5 rounded-lg border border-zinc-850 text-indigo-300">
                              <Video className="w-3.5 h-3.5" />
                            </div>
                          )}

                          {/* Favorite indicator overlay */}
                          {isFav && (
                            <div className="absolute top-2.5 right-2.5 p-1 bg-black/50 border border-yellow-500/20 rounded-full text-yellow-500 z-10 backdrop-blur-xs">
                              <Star className="w-3 h-3 fill-yellow-500" />
                            </div>
                          )}

                          {/* Overlaid transparent bar at the bottom containing Likes & Date */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent p-3 flex items-center justify-between text-[11px] font-mono select-none z-10">
                            <span className="flex items-center gap-1.5 text-zinc-100 font-bold">
                              <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Оценка: {post.score || 0}</span>
                            </span>
                            <span className="text-zinc-350">
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                          </div>

                        </div>

                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center bg-[#121318] border border-zinc-800 rounded-xl space-y-4">
                  <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm text-zinc-200">Публикаций по выбранным фильтрам не найдено</h3>
                    <p className="text-xs text-zinc-500 font-mono">Попробуйте изменить поисковые теги или включить отображение других возрастных групп.</p>
                  </div>
                </div>
              )}
                </>
              )}

            </section>
          </div>
        )}


        {/* --- TAB 2: UPLOAD & NEW ENTRY REGISTRATION --- */}
        {activeTab === 'upload' && (
          <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
            
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Upload</h2>

            <form onSubmit={handlePublishPost} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Input fields and file selectors */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* DRAG & DROP ARENA */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all bg-[#0a0b10] ${
                    dragActive ? 'border-purple-600 bg-purple-950/10' : 'border-zinc-800 hover:border-violet-500 bg-[#0b0f19]'
                  }`}
                >
                  <input 
                    type="file" 
                    id="file-upload-input" 
                    onChange={handleFileInput}
                    multiple={uploadType === 'comic'}
                    accept={
                      uploadType === 'video' ? 'video/*' :
                      uploadType === 'gif' ? '.gif,image/gif' :
                      uploadType === 'audio' ? 'audio/*' :
                      uploadType === 'document' ? '.pdf,.doc,.docx,.txt' :
                      uploadType === 'installer' ? '.exe,.msi,.zip,.rar,.7z,.tar,.gz,.apk,.dmg,.pkg,.bin' : 'image/*'
                    }
                    className="hidden" 
                  />

                  <label htmlFor="file-upload-input" className="cursor-pointer space-y-3 block">
                    <Upload className="w-10 h-10 text-zinc-500 mx-auto" />
                    <div>
                      <p className="text-sm font-bold text-white">Drop files here</p>
                      <p className="text-xs text-zinc-500 mt-1">or click to browse</p>
                    </div>
                  </label>
                </div>

                {/* Grid for Media Type Selection (3 columns, 2/3 rows) */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'image', label: 'IMAGE', icon: FileImage },
                    { id: 'video', label: 'VIDEO', icon: Video },
                    { id: 'gif', label: 'GIF', icon: Sparkles },
                    { id: 'comic', label: 'COMIC', icon: BookOpen },
                    { id: 'audio', label: 'AUDIO', icon: Music },
                    { id: 'document', label: 'DOCUMENT', icon: FileText },
                    { id: 'installer', label: 'INSTALLER', icon: FolderDown },
                    { id: 'game', label: 'GAME / ИГРА', icon: Flame },
                  ].map(t => {
                    const IconComponent = t.icon;
                    const isActive = uploadType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setUploadType(t.id as any);
                          setUploadUrl('');
                          setUploadFileState('idle');
                          setUploadFileName('');
                          setComicFiles([]);
                        }}
                        className={`py-3.5 rounded-lg flex flex-col items-center justify-center gap-1.5 transition select-none ${
                          isActive
                            ? 'bg-violet-600 text-white shadow-lg'
                            : 'bg-[#12131a] hover:bg-zinc-900 border border-zinc-900 text-zinc-400'
                        }`}
                      >
                        <IconComponent className={`w-5 h-5 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                        <span className="text-[10px] font-bold tracking-wider uppercase">{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Form Field Inputs */}
                <div className="space-y-4">
                  {/* Comic cover visual picker */}
                  {uploadType === 'comic' && (
                    <div className="bg-[#0b0f19] border border-zinc-850 rounded-2xl p-4 space-y-3">
                      <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-zinc-400 block">
                        Обложка комикса (Опционально)
                      </span>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <input 
                          type="file" 
                          id="comic-cover-upload" 
                          onChange={handleComicCoverInput}
                          accept="image/*"
                          className="hidden" 
                        />
                        <label 
                          htmlFor="comic-cover-upload" 
                          className="px-4 py-2 bg-zinc-900 border border-zinc-850 hover:border-violet-500 hover:text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition flex items-center gap-2 shrink-0 self-start"
                        >
                          <FileImage className="w-4 h-4 text-violet-400" />
                          <span>Выбрать файл обложки</span>
                        </label>
                        <div className="overflow-hidden">
                          {comicCoverFileState === 'uploading' && (
                            <span className="text-[10px] text-amber-500 font-mono animate-pulse">Загрузка...</span>
                          )}
                          {comicCoverFileState === 'success' && (
                            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                              ✓ Готово: <span className="text-zinc-400 truncate max-w-[150px]">{comicCoverFileName}</span>
                            </span>
                          )}
                          {comicCoverFileState === 'error' && (
                            <span className="text-[10px] text-rose-500 font-mono">Ошибка загрузки</span>
                          )}
                          {comicCoverFileState === 'idle' && (
                            <span className="text-[10px] text-zinc-500 font-mono">Если не добавлена, обложкой станет 1-я страница</span>
                          )}
                        </div>
                      </div>
                      {comicCoverUrl && (
                        <div className="relative w-20 h-28 border border-zinc-800 rounded-lg overflow-hidden bg-black/40 shadow">
                          <img src={comicCoverUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => {
                              setComicCoverUrl('');
                              setComicCoverFileState('idle');
                              setComicCoverFileName('');
                            }}
                            className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-rose-600 hover:text-white rounded-full text-[9px] font-bold leading-none cursor-pointer flex items-center justify-center w-4 h-4 transition"
                            title="Удалить обложку"
                          >
                            ✖
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Creator Name (Artist) */}
                  {uploadType === 'game' && (
                    <div className="bg-[#0b0f19] border border-zinc-850 rounded-2xl p-4.5 space-y-4 text-left">
                      <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-violet-400 block border-b border-zinc-900 pb-2">
                        🎮 Параметры Игры / Game Details
                      </span>

                      {/* Game Title */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-mono text-zinc-400 block">Название игры *</span>
                        <input 
                          type="text"
                          required={uploadType === 'game'}
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                          placeholder="Например: Cyberpunk RPG 2D"
                          className="w-full bg-[#0a0b12] border border-zinc-850 focus:border-purple-500 rounded-xl px-4 py-2.5 text-white focus:outline-none placeholder-zinc-650 text-sm"
                        />
                      </div>

                      {/* Game Version */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-mono text-zinc-400 block">Версия игр (оставьте пустым для "Last")</span>
                        <input 
                          type="text"
                          value={gameVersion}
                          onChange={(e) => setGameVersion(e.target.value)}
                          placeholder="v1.0, beta 5.3..."
                          className="w-full bg-[#0a0b12] border border-zinc-850 focus:border-purple-500 rounded-xl px-4 py-2.5 text-white focus:outline-none placeholder-zinc-650 text-sm"
                        />
                      </div>

                      {/* Cover URL Info */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-mono text-zinc-400 block">Ссылка на обложку (или загрузите файл сверху) *</span>
                        <input 
                          type="url"
                          required={uploadType === 'game'}
                          value={uploadUrl}
                          onChange={(e) => setUploadUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/... (URL обложки)"
                          className="w-full bg-[#0a0b12] border border-zinc-850 focus:border-purple-500 rounded-xl px-4 py-2.5 text-white focus:outline-none placeholder-zinc-650 text-sm font-mono"
                        />
                      </div>

                      {/* Gameplay Screens and Videos */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-mono text-zinc-400 block">Скриншоты и видео геймплея (через запятую)</span>
                        <textarea
                          value={gameScreenshots}
                          onChange={(e) => setGameScreenshots(e.target.value)}
                          placeholder="https://images.unsplash.com/photo-1542751371-adc38448a05e, https://images.unsplash.com/photo-1511512578047-dfb367046420"
                          rows={2}
                          className="w-full bg-[#0a0b12] border border-zinc-850 focus:border-purple-500 rounded-xl px-4 py-2.5 text-white focus:outline-none placeholder-zinc-650 text-sm font-mono leading-normal"
                        />
                      </div>

                      {/* Compatibility check */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-mono text-zinc-400 block">Платформы устройства</span>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'all', label: 'Все устройства' },
                            { id: 'pc', label: 'Только ПК' },
                            { id: 'mobile', label: 'Только Телефон' },
                          ].map(opt => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setGameDeviceCompatibility(opt.id as any)}
                              className={`py-2 text-[10px] rounded-lg border font-mono tracking-wide font-bold transition cursor-pointer ${
                                gameDeviceCompatibility === opt.id
                                  ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                                  : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Download Links */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <span className="text-xs font-mono text-zinc-400 block">Файл для ПК (.exe/.zip/.rar)</span>
                          <input 
                            type="text"
                            value={gameDownloadPc}
                            onChange={(e) => setGameDownloadPc(e.target.value)}
                            placeholder="https://domain.com/game_pc.zip"
                            className="w-full bg-[#0a0b12] border border-zinc-850 focus:border-purple-500 rounded-xl px-4 py-2.5 text-white focus:outline-none placeholder-zinc-650 text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-xs font-mono text-zinc-400 block">Файл для телефона (.apk)</span>
                          <input 
                            type="text"
                            value={gameDownloadMobile}
                            onChange={(e) => setGameDownloadMobile(e.target.value)}
                            placeholder="https://domain.com/game_mobile.apk"
                            className="w-full bg-[#0a0b12] border border-zinc-850 focus:border-purple-500 rounded-xl px-4 py-2.5 text-white focus:outline-none placeholder-zinc-650 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <input 
                      type="text"
                      value={uploadArtist}
                      onChange={(e) => setUploadArtist(e.target.value)}
                      placeholder="Creator Name (fallback: anon)"
                      className="w-full bg-[#0a0b12] border border-zinc-850 focus:border-purple-500 rounded-xl px-4 py-3 text-white focus:outline-none placeholder-zinc-500 font-sans text-sm"
                    />
                  </div>

                  {/* Tags */}
                  <div className="space-y-1 relative">
                    <input 
                      type="text"
                      value={uploadTagsString}
                      onChange={(e) => setUploadTagsString(e.target.value)}
                      onFocus={() => setFocusedInput('mainTags')}
                      onBlur={() => setTimeout(() => setFocusedInput(null), 250)}
                      placeholder="Tags (fallback: tagme)"
                      className="w-full bg-[#0a0b12] border border-zinc-850 focus:border-purple-500 rounded-xl px-4 py-3 text-white focus:outline-none placeholder-zinc-500 font-sans text-sm"
                    />

                    {mainTagSuggestions.length > 0 && focusedInput === 'mainTags' && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-1.5 divide-y divide-zinc-900 scrollbar-thin">
                        {mainTagSuggestions.map((tag) => {
                          const catInfo = tags.find(t => t.name === tag);
                          const cat = catInfo ? catInfo.category : 'general';
                          const catColor = getCategoryColor(cat);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                handleSelectMainTag(tag);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 duration-150 rounded-lg flex items-center justify-between cursor-pointer"
                            >
                              <span>{tag}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-mono tracking-wider ${catColor.badge}`}>
                                {cat}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Custom tag registration utility */}
                  <div className="bg-[#050608] border border-zinc-900 rounded-xl p-3.5 space-y-2 mt-4 select-none">
                    <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-zinc-400 block pb-0.5">Создать тег с категорией</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 relative">
                      <div className="relative">
                        <input 
                          type="text"
                          value={newCustomTagName}
                          onChange={(e) => setNewCustomTagName(e.target.value)}
                          onFocus={() => setFocusedInput('customTag')}
                          onBlur={() => setTimeout(() => setFocusedInput(null), 250)}
                          placeholder="Название (например: miku)"
                          className="w-full bg-[#111218] border border-zinc-850 hover:border-zinc-800 focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none"
                        />

                        {customTagSuggestions.length > 0 && focusedInput === 'customTag' && (
                          <div className="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl p-1 divide-y divide-zinc-900 scrollbar-thin">
                            {customTagSuggestions.map((tag) => {
                              const catInfo = tags.find(t => t.name === tag);
                              const cat = catInfo ? catInfo.category : 'general';
                              const catColor = getCategoryColor(cat);
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => {
                                    handleSelectCustomTag(tag);
                                  }}
                                  className="w-full text-left px-2 py-1.5 text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-900 duration-150 rounded flex items-center justify-between cursor-pointer"
                                >
                                  <span>{tag}</span>
                                  <span className={`text-[8px] px-1 rounded uppercase font-mono tracking-wider ${catColor.badge}`}>
                                    {cat}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      <select
                        value={newCustomTagCategory}
                        onChange={(e) => setNewCustomTagCategory(e.target.value as any)}
                        className="bg-black/40 border border-zinc-850 focus:border-purple-500 rounded-lg px-2 py-1.5 text-xs text-zinc-300 outline-none cursor-pointer h-full"
                      >
                        <option value="general" className="bg-[#121316]">general (обычный)</option>
                        <option value="character" className="bg-[#121316]">character (персонаж)</option>
                        <option value="copyright" className="bg-[#121316]">copyright (франшиза)</option>
                        <option value="artist" className="bg-[#121316]">artist (автор)</option>
                        <option value="meta" className="bg-[#121316]">meta (метаданные)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={handleRegisterCustomTag}
                        className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 hover:border-purple-500 rounded-lg text-[10px] font-bold font-mono tracking-wider uppercase cursor-pointer transition animate-fadeIn"
                      >
                        Добавить тег в базу
                      </button>

                      {tagRegSuccessMsg && (
                        <span className="text-[10px] text-emerald-400 font-mono animate-fadeIn">{tagRegSuccessMsg}</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: File queue and submit */}
              <div className="lg:col-span-5 space-y-6 bg-[#0a0b10] border border-zinc-850/80 p-5 rounded-2xl">
                
                {/* File Queue Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">FILE QUEUE</h3>

                  <div className="space-y-3 max-h-[360px] overflow-y-auto scrollbar-thin">
                    {uploadFileState === 'idle' && comicFiles.length === 0 && (
                      <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-zinc-850 rounded-xl">
                        No files in queue
                      </div>
                    )}

                    {comicFiles.map((f, idx) => (
                      <div 
                        key={idx}
                        className="p-3 bg-zinc-950/80 border border-zinc-850 rounded-xl flex items-center justify-between gap-3 text-zinc-300 transition-all hover:border-zinc-800"
                      >
                        {/* Left part: gripper, thumbnail, details */}
                        <div className="flex items-center gap-3 overflow-hidden">
                          <GripVertical className="w-4 h-4 text-zinc-600 shrink-0 cursor-grab" id={`grip-${idx}`} />

                          {f.thumbnail ? (
                            <img 
                              src={f.thumbnail} 
                              alt="Thumbnail" 
                              className="w-12 h-12 object-cover rounded-lg bg-zinc-900 border border-zinc-850 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-zinc-900 border border-zinc-850 rounded-lg flex items-center justify-center text-zinc-500 shrink-0">
                              {uploadType === 'video' ? <Video className="w-5 h-5" /> : <FileImage className="w-5 h-5" />}
                            </div>
                          )}

                          <div className="overflow-hidden">
                            <p className="text-xs font-semibold text-white truncate max-w-[160px]" id={`filename-${idx}`}>{f.name}</p>
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{f.size || '100 KB'}</p>
                          </div>
                        </div>

                        {/* Status Label & Reordering Actions on the right */}
                        <div className="flex items-center gap-3 shrink-0 select-none">
                          {comicFiles.length > 1 && (
                            <div className="flex items-center gap-1 font-mono text-[9px]">
                              <button
                                type="button"
                                onClick={() => handleMoveFileUp(idx)}
                                disabled={idx === 0}
                                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-850 disabled:opacity-20 border border-zinc-800 text-zinc-400 hover:text-white rounded transition cursor-pointer disabled:cursor-not-allowed"
                                title="Переместить вверх"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveFileDown(idx)}
                                disabled={idx === comicFiles.length - 1}
                                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-850 disabled:opacity-20 border border-zinc-800 text-zinc-400 hover:text-white rounded transition cursor-pointer disabled:cursor-not-allowed"
                                title="Переместить вниз"
                              >
                                ▼
                              </button>
                            </div>
                          )}

                          <div className="text-[10px] font-mono font-bold">
                            {f.state === 'uploading' && <span className="text-amber-500 animate-pulse">UPLOADING...</span>}
                            {f.state === 'success' && <span className="text-emerald-400">SUCCESS</span>}
                            {f.state === 'error' && <span className="text-rose-500">ERROR</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {uploadErrorMsg && (
                  <div className="p-3 bg-red-950/20 border border-red-900/40 text-red-300 rounded-xl text-xs font-mono">
                    🔴 Ошибка: {uploadErrorMsg}
                  </div>
                )}

                {uploadUrl && (
                  <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 rounded-xl text-xs space-y-1.5 font-sans leading-relaxed select-text">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-200">
                      <span className="text-sm">🟢</span> Файл успешно загружен в облачное хранилище Supabase!
                    </p>
                    <p className="text-[10.5px] text-zinc-400">
                      Медиафайл сохранен в бакете <code className="bg-zinc-950 px-1.5 py-0.5 rounded text-rose-400 font-mono font-bold">media</code> вашего проекта Supabase и готов к постоянной публикации без риска удаления.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSavingPost || !uploadUrl}
                  className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-850 disabled:text-zinc-600 text-white py-3.5 rounded-xl font-bold uppercase transition-all duration-200 tracking-wider shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  {isSavingPost ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>SAVE POST...</span>
                    </>
                  ) : (
                    <span>SAVE POST</span>
                  )}
                </button>

              </div>

            </form>
          </div>
        )}

        {/* --- TAB 2.5: GAMES HUB PLATFORM VIEW --- */}
        {activeTab === 'games' && (
          <GamesView 
            posts={posts}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onVotePost={handleVotePost}
          />
        )}

        {/* --- TAB 3: USER PROFILE AND REGISTRATION VIEW --- */}
        {activeTab === 'profile' && (
          <UserProfile 
            posts={posts}
            favorites={favorites}
            onViewPost={handleViewPost}
            currentUsername={username}
            isSignedUp={isSignedUp}
            followedTags={followedTags}
            onToggleFollowTag={handleToggleFollowTag}
            onSearchTag={(tag) => {
              setSelectedTags([tag]);
              setSidebarTagQuery('');
              setActiveTab('gallery');
            }}
            onLoginSuccess={(newUsername) => {
              setIsSignedUp(true);
              setUsername(newUsername);
              localStorage.setItem('sugule_username', newUsername);
              window.dispatchEvent(new Event('storage'));
            }}
            onLogout={() => {
              setIsSignedUp(false);
              setUsername('');
              localStorage.removeItem('sugule_username');
              window.dispatchEvent(new Event('storage'));
            }}
          />
        )}
      </main>

      {false && selectedPost && (
        <div className="fixed inset-0 bg-[#060709]/95 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn select-all">
          
          <div className="bg-[#0b0c10] border border-zinc-850/80 rounded-xl max-w-6xl w-full max-h-[96vh] overflow-hidden flex flex-col shadow-2xl shadow-black select-text">
            
            {/* Modal Navigation & Closing Header */}
            <div className="px-5 py-3 border-b border-zinc-900 flex items-center justify-between bg-zinc-950 select-none">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-mono text-xs text-zinc-400 uppercase tracking-widest font-semibold">Просмотр работы • Sugule Archive</h3>
              </div>
              <button 
                onClick={() => setSelectedPost(null)}
                className="px-3 py-1 bg-zinc-900/60 border border-zinc-800 hover:border-rose-500/80 text-zinc-400 hover:text-white rounded font-mono text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Закрыть (Esc)</span>
              </button>
            </div>

            {/* Modal Main Grid content area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto flex-grow divide-y lg:divide-y-0 lg:divide-x divide-zinc-900 max-h-[88vh]">
              
              {/* Left Column: Rule34-style Sidebar (col-span-3) */}
              <div className="lg:col-span-3 p-4 space-y-5 bg-[#090a0d] overflow-y-auto text-xs order-last lg:order-first select-none">
                
                {/* 1. INTERACTION BUTTONS */}
                <div className="space-y-1.5 pb-2 border-b border-zinc-900">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleVotePost(selectedPost.id, 'up')}
                      className="flex-grow flex items-center justify-center gap-1 py-1.5 rounded bg-emerald-950/30 border border-emerald-900/60 hover:bg-emerald-900/40 text-emerald-400 font-mono text-[11px] font-bold transition cursor-pointer"
                      title="Нравится"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{selectedPost.score || 0}</span>
                    </button>
                    <button
                      onClick={() => handleToggleFavorite(selectedPost.id)}
                      className={`flex-grow flex items-center justify-center gap-1 py-1.5 rounded border font-mono text-[11px] font-bold transition cursor-pointer ${
                        favorites.includes(selectedPost.id) 
                          ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400' 
                          : 'bg-zinc-900/50 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
                      }`}
                      title={favorites.includes(selectedPost.id) ? 'Удалить из избранного' : 'Добавить в избранное'}
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>{favorites.includes(selectedPost.id) ? 'Избранное' : 'В избр.'}</span>
                    </button>
                    <button
                      onClick={() => handleVotePost(selectedPost.id, 'down')}
                      className="px-2 py-1.5 rounded bg-rose-950/20 border border-rose-950/50 hover:bg-rose-900/30 text-rose-400 transition cursor-pointer"
                      title="Не нравится"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2. BOORU STATS BOX */}
                <div className="space-y-2 bg-zinc-950/40 p-3 rounded border border-zinc-900/80 font-mono text-[11px]">
                  <h4 className="text-[10px] uppercase font-bold text-zinc-500 border-b border-zinc-900 pb-1.5 flex items-center gap-1">
                    <Info className="w-3 h-3 text-indigo-400" />
                    <span>Статистика</span>
                  </h4>
                  
                  <div className="space-y-1 text-zinc-400">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">ID Поста:</span>
                      <span className="text-zinc-200 uppercase">#{selectedPost.id.replace('p_', '')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Оценка:</span>
                      <span className="font-bold text-zinc-100">{selectedPost.score || 0} баллов</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Рейтинг:</span>
                      <span className={`font-bold uppercase ${
                        selectedPost.rating === 'explicit' ? 'text-red-500' :
                        selectedPost.rating === 'questionable' ? 'text-amber-500' : 'text-emerald-400'
                      }`}>{selectedPost.rating}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Опубликовал:</span>
                      <span className="text-zinc-200 font-bold">{selectedPost.uploader}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Дата:</span>
                      <span className="text-zinc-300">{new Date(selectedPost.created_at).toLocaleDateString()}</span>
                    </div>
                    {selectedPost.source_url && (
                      <div className="pt-1.5 border-t border-zinc-900 flex justify-between items-center">
                        <span className="text-zinc-650">Первоисточник:</span>
                        <a 
                          href={selectedPost.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <span>Pixiv/Web</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}

                    <div className="pt-2.5 border-t border-zinc-900">
                      {showDeleteConfirm ? (
                        <div className="bg-red-950/20 border border-red-900/50 p-2 rounded space-y-2 mt-1">
                          <p className="text-[10px] text-red-300 font-sans leading-tight">Вы уверены, что хотите удалить публикацию? Это также удалит все комментарии к ней.</p>
                          <div className="flex gap-2">
                            <button
                              onClick={handleDeletePost}
                              className="flex-1 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[9px] font-bold cursor-pointer transition uppercase font-mono"
                            >
                              Да, удалить
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(false)}
                              className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[9px] font-bold cursor-pointer transition uppercase font-mono"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="w-full py-1.5 bg-red-950/20 hover:bg-red-900/30 border border-red-950/50 hover:border-red-500/60 text-rose-400 hover:text-rose-300 text-[10px] font-bold rounded flex items-center justify-center gap-1.5 transition cursor-pointer font-mono uppercase"
                          title="Удалить пост из базы"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Удалить пост</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. CLASSIFIED VERTICAL TAGS SYSTEM (Rule34.world format) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                    <h4 className="text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-500">
                      Теги работы ({selectedPost.tags.length})
                    </h4>
                    {!isEditingBulkTags && (
                      <button
                        onClick={() => {
                          setIsEditingBulkTags(true);
                          setBulkTagInput(selectedPost.tags.join(' '));
                        }}
                        className="text-[10px] font-mono text-zinc-400 hover:text-indigo-400 hover:underline transition flex items-center gap-1 cursor-pointer"
                        title="Редактировать список тегов"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                        <span>Править списком</span>
                      </button>
                    )}
                  </div>

                  {isEditingBulkTags ? (
                    <div className="space-y-2.5 p-2 bg-[#0d0e11] border border-zinc-850 rounded">
                      <p className="text-[9px] font-mono text-zinc-400 font-semibold uppercase tracking-wider">Редактирование тегов (через пробел)</p>
                      <textarea
                        value={bulkTagInput}
                        onChange={(e) => setBulkTagInput(e.target.value)}
                        rows={6}
                        className="w-full bg-[#07080a] border border-zinc-800 rounded p-2 text-[11px] font-mono focus:border-indigo-600 focus:outline-none text-zinc-100 placeholder:text-zinc-700"
                        placeholder="miku hatsune blue_hair"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={handleSaveBulkTags}
                          className="flex-grow py-1.5 px-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 font-mono text-white rounded cursor-pointer text-center uppercase transition"
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={() => setIsEditingBulkTags(false)}
                          className="flex-grow py-1.5 px-2 text-[10px] font-bold bg-[#27272a] hover:bg-zinc-700 font-mono text-zinc-300 rounded cursor-pointer text-center uppercase transition"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const uniquePostTags = Array.from(new Set(selectedPost?.tags || [])) as string[];
                        return (
                          <div className="space-y-3.5">
                        
                            {/* ARTISTS CATEGORY */}
                            {uniquePostTags.some(tag => tags.find(t => t.name === tag && t.category === 'artist')) && (
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold font-mono tracking-widest text-[#ff5874]">🎨 Художники (Artist)</p>
                                <ul className="space-y-1 pl-1">
                                  {uniquePostTags
                                    .filter(tag => tags.find(t => t.name === tag && t.category === 'artist'))
                                    .map(tag => (
                                      <li key={tag} className="group/tag flex items-center justify-between text-[11px] font-mono py-0.5 hover:bg-zinc-900/40 px-1 rounded">
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span className="text-zinc-500 select-none">🎨</span>
                                          <button 
                                            onClick={() => { handleQueryOnlyTag(tag); setSelectedPost(null); }}
                                            className="text-[#ff8fa3] hover:underline hover:text-rose-400 text-left truncate cursor-pointer font-medium"
                                            title={`Искать только ${tag}`}
                                          >{tag}</button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button 
                                            onClick={() => { handleQueryAddTag(tag); setSelectedPost(null); }}
                                            className="px-1 text-[9px] font-sans font-bold text-emerald-400 hover:bg-emerald-950/40 border border-emerald-900/30 rounded cursor-pointer transition select-none"
                                            title="Добавить"
                                          >+</button>
                                          <button 
                                            onClick={() => { handleQueryExcludeTag(tag); setSelectedPost(null); }}
                                            className="px-1 text-[9px] font-sans font-bold text-rose-400 hover:bg-red-950/40 border border-red-900/30 rounded cursor-pointer transition select-none"
                                            title="Исключить"
                                          >-</button>
                                          <button onClick={() => handleRemoveTagFromPost(tag)} className="text-zinc-500 hover:text-rose-500 p-0.5" title="Удалить из поста"><X className="w-2.5 h-2.5" /></button>
                                        </div>
                                      </li>
                                    ))}
                                </ul>
                              </div>
                            )}

                            {/* CHARACTERS CATEGORY */}
                            {uniquePostTags.some(tag => tags.find(t => t.name === tag && t.category === 'character')) && (
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold font-mono tracking-widest text-[#52b788]">👤 Персонажи (Character)</p>
                                <ul className="space-y-1 pl-1">
                                  {uniquePostTags
                                    .filter(tag => tags.find(t => t.name === tag && t.category === 'character'))
                                    .map(tag => (
                                      <li key={tag} className="group/tag flex items-center justify-between text-[11px] font-mono py-0.5 hover:bg-zinc-900/40 px-1 rounded">
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span className="text-zinc-500 select-none">👤</span>
                                          <button 
                                            onClick={() => { handleQueryOnlyTag(tag); setSelectedPost(null); }}
                                            className="text-[#52b788] hover:underline hover:text-[#74c69d] text-left truncate cursor-pointer font-medium"
                                            title={`Искать только ${tag}`}
                                          >{tag}</button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button 
                                            onClick={() => { handleQueryAddTag(tag); setSelectedPost(null); }}
                                            className="px-1 text-[9px] font-sans font-bold text-emerald-400 hover:bg-emerald-950/40 border border-emerald-900/30 rounded cursor-pointer transition select-none"
                                            title="Добавить"
                                          >+</button>
                                          <button 
                                            onClick={() => { handleQueryExcludeTag(tag); setSelectedPost(null); }}
                                            className="px-1 text-[9px] font-sans font-bold text-rose-400 hover:bg-red-950/40 border border-red-900/30 rounded cursor-pointer transition select-none"
                                            title="Исключить"
                                          >-</button>
                                          <button onClick={() => handleRemoveTagFromPost(tag)} className="text-zinc-500 hover:text-rose-500 p-0.5" title="Удалить из поста"><X className="w-2.5 h-2.5" /></button>
                                        </div>
                                      </li>
                                    ))}
                                </ul>
                              </div>
                            )}

                            {/* COPYRIGHT CATEGORY */}
                            {uniquePostTags.some(tag => tags.find(t => t.name === tag && t.category === 'copyright')) && (
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold font-mono tracking-widest text-[#be92ff]">🎬 Авторские серии (Copyright)</p>
                                <ul className="space-y-1 pl-1">
                                  {uniquePostTags
                                    .filter(tag => tags.find(t => t.name === tag && t.category === 'copyright'))
                                    .map(tag => (
                                      <li key={tag} className="group/tag flex items-center justify-between text-[11px] font-mono py-0.5 hover:bg-zinc-900/40 px-1 rounded">
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span className="text-zinc-500 select-none">🎬</span>
                                          <button 
                                            onClick={() => { handleQueryOnlyTag(tag); setSelectedPost(null); }}
                                            className="text-[#be92ff] hover:underline hover:text-indigo-300 text-left truncate cursor-pointer font-medium"
                                            title={`Искать только ${tag}`}
                                          >{tag}</button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button 
                                            onClick={() => { handleQueryAddTag(tag); setSelectedPost(null); }}
                                            className="px-1 text-[9px] font-sans font-bold text-emerald-400 hover:bg-emerald-950/40 border border-emerald-900/30 rounded cursor-pointer transition select-none"
                                            title="Добавить"
                                          >+</button>
                                          <button 
                                            onClick={() => { handleQueryExcludeTag(tag); setSelectedPost(null); }}
                                            className="px-1 text-[9px] font-sans font-bold text-rose-400 hover:bg-red-950/40 border border-red-900/30 rounded cursor-pointer transition select-none"
                                            title="Исключить"
                                          >-</button>
                                          <button onClick={() => handleRemoveTagFromPost(tag)} className="text-zinc-500 hover:text-rose-500 p-0.5" title="Удалить из поста"><X className="w-2.5 h-2.5" /></button>
                                        </div>
                                      </li>
                                    ))}
                                </ul>
                              </div>
                            )}

                            {/* GENERAL & UNSORTED TAGS */}
                            {uniquePostTags.some(tag => {
                              const found = tags.find(t => t.name === tag);
                              return !found || found.category === 'general' || found.category === 'meta';
                            }) && (
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold font-mono tracking-widest text-[#3a86ff]">🏷️ Общие свойства (General)</p>
                                <ul className="space-y-1 pl-1">
                                  {uniquePostTags
                                    .filter(tag => {
                                      const found = tags.find(t => t.name === tag);
                                      return !found || found.category === 'general' || found.category === 'meta';
                                    })
                                    .map(tag => (
                                      <li key={tag} className="group/tag flex items-center justify-between text-[11px] font-mono py-0.5 hover:bg-zinc-900/40 px-1 rounded">
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span className="text-zinc-500 select-none">#</span>
                                          <button 
                                            onClick={() => { handleQueryOnlyTag(tag); setSelectedPost(null); }}
                                            className="text-sky-350 hover:underline hover:text-sky-300 text-left truncate cursor-pointer font-light"
                                            title={`Искать только ${tag}`}
                                          >{tag}</button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button 
                                            onClick={() => { handleQueryAddTag(tag); setSelectedPost(null); }}
                                            className="px-1 text-[9px] font-sans font-bold text-emerald-400 hover:bg-emerald-950/40 border border-emerald-950/30 rounded cursor-pointer transition select-none"
                                            title="Добавить"
                                          >+</button>
                                          <button 
                                            onClick={() => { handleQueryExcludeTag(tag); setSelectedPost(null); }}
                                            className="px-1 text-[9px] font-sans font-bold text-rose-400 hover:bg-red-950/40 border border-red-950/30 rounded cursor-pointer transition select-none"
                                            title="Исключить"
                                          >-</button>
                                          <button onClick={() => handleRemoveTagFromPost(tag)} className="text-zinc-500 hover:text-rose-500 p-0.5" title="Удалить из поста"><X className="w-2.5 h-2.5" /></button>
                                        </div>
                                      </li>
                                    ))}
                                </ul>
                              </div>
                            )}

                          </div>
                        );
                      })()}

                  {/* Sleek Form to add tag inline */}
                  <form onSubmit={handleAddTagToPost} className="pt-2.5 border-t border-zinc-900 flex items-center gap-1">
                    <input 
                      type="text"
                      value={detailTagInput}
                      onChange={(e) => setDetailTagInput(e.target.value)}
                      placeholder="+ Добавить тег..."
                      className="bg-[#0e0f12] border border-zinc-850 rounded px-2 py-1 focus:border-indigo-600 focus:outline-none font-mono text-[10px] text-white flex-grow placeholder:text-zinc-650"
                    />
                    <button 
                      type="submit"
                      className="p-1 bg-[#121319] border border-zinc-800 rounded text-zinc-400 hover:text-emerald-400 transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </form>
                    </>
                  )}
                </div>

              </div>

              {/* Right Column: Main Artwork Viewer Frame & Comments feed (col-span-9) */}
              <div className="lg:col-span-9 p-5 space-y-5 flex flex-col overflow-y-auto max-h-[85vh] order-first lg:order-last bg-[#08090c]">
                
                {/* 1. TOP TITLE & ACTION LINKS BAR */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 mt-1">
                      Загружено от: <strong className="text-zinc-450">{selectedPost.uploader}</strong> | Общая оценка: <strong className="text-emerald-400">+{selectedPost.score || 0}</strong>
                    </p>
                  </div>
                  
                  {/* Action link triggers */}
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <a
                      href={isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-zinc-900/45 border border-zinc-800/80 hover:border-emerald-500 hover:text-white rounded flex items-center gap-1.5 text-zinc-400 transition"
                      title="Адрес оригинального файла"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Открыть оригинал</span>
                    </a>
                  </div>
                </div>

                {/* 2. MAIN MEDIA CANVAS FRAME (Rule34 look block) */}
                <div 
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  className="bg-[#030405] border border-zinc-900/60 p-1.5 rounded-lg flex flex-col items-center justify-center relative min-h-[360px] overflow-hidden group select-none shadow-inner"
                >
                  {/* Interactive navigational side hover chevron buttons */}
                  <button 
                    onClick={handlePrevAction}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/80 border border-zinc-900 hover:border-emerald-500 hover:text-emerald-400 text-zinc-450 transition opacity-0 group-hover:opacity-100 focus:opacity-100 z-30 hidden sm:flex cursor-pointer"
                    title="Назад (Стрелка влево)"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={handleNextAction}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/80 border border-zinc-900 hover:border-emerald-500 hover:text-emerald-400 text-zinc-450 transition opacity-0 group-hover:opacity-100 focus:opacity-100 z-30 hidden sm:flex cursor-pointer"
                    title="Вперед (Стрелка вправо)"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <div className="w-full flex-grow flex items-center justify-center relative min-h-[300px]">
                    {/* Left & Right active overlay flip zones (DISABLED FOR VIDEOS) */}
                    {!isUrlVideo(isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url) && (
                      <>
                        <div 
                          onClick={(e) => { e.stopPropagation(); handlePrevAction(); }}
                          className="absolute top-0 left-0 w-1/2 h-full cursor-w-resize z-20 group/side-left flex items-center justify-start pl-4 transition-all hover:bg-gradient-to-r hover:from-white/[0.02] hover:to-transparent"
                          title="Назад (Кликните по левой стороне)"
                        />
                        
                        <div 
                          onClick={(e) => { e.stopPropagation(); handleNextAction(); }}
                          className="absolute top-0 right-0 w-1/2 h-full cursor-e-resize z-20 group/side-right flex items-center justify-end pr-4 transition-all hover:bg-gradient-to-l hover:from-white/[0.02] hover:to-transparent"
                          title="Вперед (Кликните по правой стороне)"
                        />
                      </>
                    )}

                    {isUrlVideo(isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url) ? (
                      <video 
                        key={isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url}
                        src={isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url} 
                        controls 
                        autoPlay 
                        loop 
                        playsInline 
                        className="max-h-[580px] w-auto max-w-full rounded object-contain relative z-10"
                      />
                    ) : isUrlDownloadable(isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url) ? (
                      <div className="flex flex-col items-center justify-center p-8 bg-[#0b0f19] border border-zinc-800 rounded-2xl space-y-5 max-w-md w-full relative z-30 text-center select-text shadow-xl">
                        <div className="w-16 h-16 rounded-full bg-violet-600/10 flex items-center justify-center border border-violet-500/20 text-violet-400">
                          <FolderDown className="w-8 h-8 animate-pulse" />
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm font-bold text-zinc-100 font-mono tracking-tight break-all px-2">
                            {(isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url).split('/').pop()}
                          </p>
                          <p className="text-xs text-zinc-500 uppercase font-mono tracking-wider font-bold">Исполняемый файл / Установщик / Архив</p>
                        </div>
                        <a 
                          href={isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl text-xs font-mono font-bold tracking-wider text-white shadow-lg shadow-violet-900/30 hover:shadow-violet-950/50 transition duration-300 w-full hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>СКАЧАТЬ ФАЙЛ</span>
                        </a>
                      </div>
                    ) : (
                      <motion.img 
                        key={isPostComic(selectedPost) ? `comic-page-${currentComicPage}-${selectedPost.id}` : selectedPost.id}
                        initial={isPostComic(selectedPost) ? { x: slideDirection === 'forward' ? 100 : -100, opacity: 0 } : false}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.28, ease: 'easeOut' }}
                        src={isPostComic(selectedPost) ? (getComicPages(selectedPost)[currentComicPage] || selectedPost.url) : selectedPost.url} 
                        alt="Медиа"
                        referrerPolicy="no-referrer"
                        className="max-h-[580px] w-auto max-w-full rounded object-contain relative z-10"
                      />
                    )}
                  </div>
                </div>

                {/* 3. DYNAMIC COMMENTS LIST IN BOORU FORMAT */}
                {selectedPost?.is_game ? (
                  <div className="space-y-4 pt-2 border-t border-zinc-900">
                    <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-400 flex items-center gap-2 select-none border-b border-zinc-950 pb-2">
                      <MessageSquare className="w-4 h-4 text-[#ff5874]" />
                      <span>Отзывы и комментарии ({comments.length})</span>
                    </h4>

                    {/* Commentary stream */}
                    <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-2 divide-y divide-zinc-950">
                      {comments.length > 0 ? (
                        comments.map((comment) => (
                          <div key={comment.id} className="pt-3.5 first:pt-0 space-y-1.5 font-sans">
                            <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 select-none">
                              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-zinc-650" />
                                <span>{comment.author}</span>
                              </span>
                              <span className="flex items-center gap-1 text-zinc-600">
                                <Calendar className="w-3 h-3 text-zinc-700" />
                                <span>{new Date(comment.created_at).toLocaleString()}</span>
                              </span>
                            </div>
                            <div className="bg-[#0b0c10] border border-zinc-900 rounded p-3 text-xs text-zinc-300 font-sans leading-relaxed break-words shadow-sm">
                              {comment.text}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-zinc-650 font-mono italic text-center py-6 select-none bg-zinc-950/20 rounded border border-dashed border-zinc-900/60">Отзывов для этого поста пока нет. Вы можете оставить первый комментарий ниже.</p>
                      )}
                    </div>

                    {/* Add commentary card */}
                    <form onSubmit={handleAddComment} className="pt-3.5 border-t border-zinc-900 space-y-2.5 select-none text-left">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                        <div className="md:col-span-4">
                          <input 
                            type="text"
                            value={newCommentAuthor}
                            onChange={(e) => setNewCommentAuthor(e.target.value)}
                            placeholder="Имя куратора (Аноним)"
                            className="w-full bg-[#0a0b0d] border border-zinc-850 focus:border-zinc-750 text-xs rounded px-3 py-2 text-white focus:outline-none font-mono placeholder:text-zinc-600"
                          />
                        </div>
                        <div className="md:col-span-8 flex gap-1.5">
                          <input 
                            type="text"
                            required
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            placeholder="Текст комментария..."
                            className="w-full bg-[#0a0b0d] border border-zinc-850 focus:border-zinc-750 text-xs rounded px-3 py-2 text-white focus:outline-none font-mono placeholder:text-zinc-650"
                          />
                          <button 
                            type="submit"
                            className="px-4 py-2 bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 hover:border-zinc-700 hover:text-white transition rounded font-mono font-bold text-xs shrink-0 text-zinc-350 hover:bg-zinc-850"
                          >
                            Отправить
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="pt-6 pb-2 border-t border-zinc-900 select-none text-center space-y-2">
                    <ShieldCheck className="w-8 h-8 text-violet-400 mx-auto opacity-80" />
                    <p className="text-[11px] font-mono font-bold text-zinc-300">Функция комментариев недоступна</p>
                    <p className="text-[10px] text-zinc-500 leading-relaxed max-w-sm mx-auto">
                      По решению администрации, комментирование временно доступно исключительно во вкладке <strong className="text-purple-400">Игры</strong>. Пообщаться с другими игроками можно в игровом хабе!
                    </p>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
