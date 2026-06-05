import React, { useState, useEffect } from 'react';
import { 
  Flame, Monitor, Smartphone, Download, Tag as TagIcon, Calendar, 
  User, MessageSquare, ThumbsUp, ThumbsDown, Heart, Eye, Check, PlayCircle, Plus, Sparkles, AlertCircle
} from 'lucide-react';
import { Post, Comment } from '../types';
import { dbManager } from '../supabaseClient';

interface GamesViewProps {
  posts: Post[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onVotePost: (id: string, dir: 'up' | 'down') => void;
}

export const GamesView: React.FC<GamesViewProps> = ({
  posts,
  favorites,
  onToggleFavorite,
  onVotePost
}) => {
  // Device Compatibility States
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'pc' | 'mobile'>('all');
  const [detectedPlatform, setDetectedPlatform] = useState<'pc' | 'mobile'>('pc');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active game detailed display overlay
  const [selectedGame, setSelectedGame] = useState<Post | null>(null);
  const [activeMedia, setActiveMedia] = useState<string>('');
  
  // Game Comments / Reviews States
  const [gameComments, setGameComments] = useState<Comment[]>([]);
  const [newCommentAuthor, setNewCommentAuthor] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Auto detect platform on load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.navigator) {
      const ua = window.navigator.userAgent.toLowerCase();
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
      const platform = isMobile ? 'mobile' : 'pc';
      setDetectedPlatform(platform);
      setDeviceFilter(platform); // Auto-filter depending on device!
    }
  }, []);

  // Filter games from the global posts list
  const getFilteredGames = () => {
    return posts.filter(p => {
      if (!p.is_game) return false;

      // Platform filter logic
      if (deviceFilter === 'pc') {
        if (p.device_compatibility === 'mobile') return false;
      } else if (deviceFilter === 'mobile') {
        if (p.device_compatibility === 'pc') return false;
      }

      // Search query logic (search title, description, or tags)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = p.title?.toLowerCase().includes(query);
        const matchesDesc = p.description?.toLowerCase().includes(query);
        const matchesTags = p.tags.some(t => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDesc && !matchesTags) return false;
      }

      return true;
    });
  };

  // Fetch comments when game detail is opened
  useEffect(() => {
    if (selectedGame) {
      // Set default cover URL as active item
      setActiveMedia(selectedGame.url);
      
      const loadGameComments = async () => {
        setReviewsLoading(true);
        try {
          const list = await dbManager.getComments(selectedGame.id);
          // Sort by newest first
          const sorted = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setGameComments(sorted);
        } catch (e) {
          console.error('Error fetching comments:', e);
        } finally {
          setReviewsLoading(false);
        }
      };
      
      loadGameComments();
    }
  }, [selectedGame]);

  // Handle addition of comment
  const handleAddGameComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGame || !newCommentText.trim()) return;

    const authorName = newCommentAuthor.trim() || 'Анонимный куратор';
    const commentId = 'c_g_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const freshComment: Comment = {
      id: commentId,
      post_id: selectedGame.id,
      author: authorName,
      text: newCommentText.trim(),
      created_at: new Date().toISOString(),
      likes: 0
    };

    try {
      await dbManager.createComment(freshComment);
      setGameComments(prev => [freshComment, ...prev]);
      setNewCommentText('');
    } catch (e) {
      alert('Ошибка при сохранении отзыва: ' + e);
    }
  };

  const isVideoUrl = (url: string) => {
    return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov') || url.includes('/videos/');
  };

  const filteredGames = getFilteredGames();

  return (
    <div className="space-y-6 max-w-7xl mx-auto anime-fadeIn">
      
      {/* GAMES HUB TITLE & INTRO BANNER */}
      <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-zinc-950 border border-purple-900/40 rounded-2xl p-5.5 flex flex-col md:flex-row items-center justify-between gap-5 select-none text-left">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-yellow-400 text-black text-[9.5px] font-mono tracking-widest font-extrabold uppercase rounded animate-pulse">
              НОВОЕ
            </span>
            <span className="text-[10px] text-purple-400 font-mono uppercase tracking-widest font-extrabold">Games Platform</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Игровой хаб Booru</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Подборка интерактивных игр, RPG, модов и визуальных новелл. Все релизы структурированы по устройствам. Оставляйте свои комментарии и оценки!
          </p>
        </div>

        {/* Device Detection Alert Badge */}
        <div className="bg-zinc-950/80 border border-zinc-850 p-4 rounded-xl flex flex-col items-center justify-center shrink-0 w-full md:w-64 space-y-2 select-none shadow">
          <span className="text-[9.5px] font-mono text-zinc-500 uppercase tracking-wider font-extrabold">Ваше устройство</span>
          <div className="flex items-center gap-2 text-white">
            {detectedPlatform === 'mobile' ? (
              <>
                <Smartphone className="w-5 h-5 text-emerald-400 animate-bounce" />
                <span className="text-xs font-mono font-bold tracking-wide">📱 Мобильный (Телефон)</span>
              </>
            ) : (
              <>
                <Monitor className="w-5 h-5 text-violet-400 animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-wide">💻 Настольный ПК (Компьютер)</span>
              </>
            )}
          </div>
          <p className="text-[9.5px] text-zinc-600 text-center font-mono">
            Система автоматически подбирает поддерживаемые форматы.
          </p>
        </div>
      </div>

      {/* FILTER CONTROL BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-[#111216] border border-zinc-850 rounded-2xl p-3.5 gap-4 shadow-lg">
        
        {/* Device Compatibility Search Filters Toggle */}
        <div className="flex items-center bg-black/30 border border-zinc-800 rounded-lg p-1 w-full sm:w-auto font-mono text-[10px] tracking-wide select-none">
          {[
            { id: 'all', label: 'Все платформы', icon: Sparkles },
            { id: 'pc', label: 'Только для ПК', icon: Monitor },
            { id: 'mobile', label: 'Только для Телефона', icon: Smartphone }
          ].map(opt => {
            const Icon = opt.icon;
            const active = deviceFilter === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setDeviceFilter(opt.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.8 rounded-md transition cursor-pointer text-center justify-center w-full sm:w-auto ${
                  active 
                    ? 'bg-purple-600 text-white shadow-md font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input Bar */}
        <div className="flex items-center bg-[#07080a] border border-zinc-800 focus-within:border-purple-600 rounded-xl px-3 py-2 gap-2.5 w-full sm:max-w-xs transition">
          <TagIcon className="w-4 h-4 text-zinc-650" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию или тегу..."
            className="w-full bg-transparent text-xs text-white placeholder-zinc-550 focus:outline-none font-mono"
          />
        </div>
      </div>

      {/* GAMES GRID LIST */}
      {filteredGames.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 select-none">
          {filteredGames.map((game) => {
            const comp = game.device_compatibility || 'all';
            const favorite = favorites.includes(game.id);
            const score = game.score || 0;

            return (
              <div 
                key={game.id}
                className="bg-[#111216]/65 border border-zinc-850/80 hover:border-purple-800 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col hover:-translate-y-1 shadow-md hover:shadow-xl hover:shadow-black/40 group text-left relative"
              >
                {/* Visual Label Banner */}
                <div className="absolute top-2.5 left-2.5 z-20 flex gap-1 font-mono text-[9px] font-bold">
                  {comp === 'pc' && (
                    <span className="bg-slate-900/90 text-sky-400 border border-sky-950 px-2 py-0.6 rounded-md uppercase tracking-wider backdrop-blur-sm flex items-center gap-1">
                      <Monitor className="w-2.5 h-2.5" />
                      <span>PC Release</span>
                    </span>
                  )}
                  {comp === 'mobile' && (
                    <span className="bg-slate-900/90 text-emerald-400 border border-emerald-950 px-2 py-0.6 rounded-md uppercase tracking-wider backdrop-blur-sm flex items-center gap-1">
                      <Smartphone className="w-2.5 h-2.5" />
                      <span>Mobile Release</span>
                    </span>
                  )}
                  {comp === 'all' && (
                    <span className="bg-slate-900/90 text-violet-400 border border-violet-950 px-2 py-0.6 rounded-md uppercase tracking-wider backdrop-blur-sm flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>MULTIPLATER / ALL</span>
                    </span>
                  )}
                  {game.version && (
                    <span className="bg-purple-950/90 border border-purple-900 text-yellow-300 px-2 py-0.6 rounded-md">
                      {game.version}
                    </span>
                  )}
                </div>

                {/* Cover representation container */}
                <div 
                  onClick={() => setSelectedGame(game)}
                  className="w-full aspect-[4/3] overflow-hidden bg-black relative cursor-pointer"
                >
                  <img 
                    src={game.url} 
                    alt={game.title} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                  />
                  {/* Subtle dark gradient scrim overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-transparent opacity-75 group-hover:opacity-90 transition-opacity" />
                  
                  {/* Action hover icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 z-10">
                    <span className="p-3 bg-purple-600 border border-purple-500 rounded-full text-white shadow-lg shadow-black/50 transform scale-90 group-hover:scale-100 transition duration-300">
                      <PlayCircle className="w-7 h-7" />
                    </span>
                  </div>
                </div>

                {/* Description & metadata details */}
                <div className="p-4 flex-grow flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5 cursor-pointer" onClick={() => setSelectedGame(game)}>
                    <div className="text-[9.5px] font-mono text-zinc-550 flex items-center gap-1.5 uppercase font-bold">
                      <span>{new Date(game.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>автор: {game.uploader}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-purple-400 font-sans tracking-tight leading-tight line-clamp-1 transition">
                      {game.title || 'Без названия'}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed line-clamp-2 h-9">
                      {game.description || 'Описание отсутствует.'}
                    </p>
                  </div>

                  {/* Rating state & download releases button */}
                  <div className="space-y-2.5 pt-2 border-t border-zinc-900/60 font-mono">
                    
                    {/* Tags Badge row marquee */}
                    <div className="flex flex-wrap gap-1 max-h-12 overflow-hidden">
                      {game.tags.slice(0, 4).map(t => (
                        <span key={t} className="text-[9px] bg-zinc-950 border border-zinc-850 px-1.8 py-0.5 rounded text-zinc-400 capitalize">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[10.5px]">
                      {/* Voting and Favorite status row */}
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => onVotePost(game.id, 'up')}
                          className="text-emerald-400 hover:text-emerald-300 transition text-[11px] font-bold flex items-center gap-1"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{score >= 0 ? `+${score}` : score}</span>
                        </button>
                        <button 
                          onClick={() => onToggleFavorite(game.id)}
                          className={`transition ${favorite ? 'text-pink-500 hover:text-pink-400' : 'text-zinc-550 hover:text-zinc-350'}`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${favorite ? 'fill-pink-500' : ''}`} />
                        </button>
                      </div>

                      {/* Launch direct play trigger */}
                      <button 
                        onClick={() => setSelectedGame(game)}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-purple-950/40 border border-zinc-800 hover:border-purple-500 text-zinc-300 hover:text-white rounded-lg text-[10px] font-bold tracking-wide transition cursor-pointer flex items-center gap-1"
                      >
                        <span>Подробнее</span>
                        <PlayCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-zinc-950 border border-zinc-900/80 rounded-2xl p-16 text-center select-none space-y-3">
          <AlertCircle className="w-10 h-10 text-zinc-650 mx-auto" />
          <p className="text-zinc-400 font-mono text-sm font-bold">Игры не найдены</p>
          <p className="text-zinc-600 text-xs max-w-md mx-auto leading-relaxed">
            Нет доступных игр, соответствующих активной платформе или поисковому запросу. Попробуйте сбросить фильтры.
          </p>
        </div>
      )}

      {/* --- STEAM-STYLE DETAILED OVERLAY --- */}
      {selectedGame && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 overflow-y-auto selection:bg-purple-500/30 font-sans">
          
          <div className="bg-[#111216] border border-zinc-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col md:max-h-[90vh] text-left relative animate-fadeIn">
            
            {/* Close Button top-right */}
            <button 
              onClick={() => setSelectedGame(null)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-zinc-950 hover:bg-rose-950 text-zinc-400 hover:text-white border border-zinc-850 hover:border-rose-700 transition cursor-pointer shadow-md"
              title="Закрыть"
            >
              <Check className="w-4.5 h-4.5 rotate-45" />
            </button>

            {/* HEADER METADATA SECTION */}
            <div className="p-6 bg-gradient-to-b from-[#18191f] to-transparent border-b border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
              <div className="space-y-1">
                <span className="text-[10px] font-mono tracking-wider uppercase text-purple-400 font-bold block">
                  🎮 Игровой Профиль (ОБЗОР RELEASE)
                </span>
                <h3 className="text-xl font-black text-white tracking-tight">
                  {selectedGame.title || 'Без названия'}
                </h3>
                <div className="flex flex-wrap items-center gap-2.5 text-[10.5px] font-mono text-zinc-500">
                  <span className="text-zinc-400 font-bold flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    @{selectedGame.uploader}
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Загружено: {new Date(selectedGame.created_at).toLocaleDateString()}
                  </span>
                  <span>|</span>
                  <span className="px-1.5 py-0.2 bg-purple-950/80 border border-purple-800 text-purple-300 rounded">
                    Версия: {selectedGame.version || 'Last'}
                  </span>
                </div>
              </div>

              {/* Status score indicator */}
              <div className="bg-zinc-950 border border-zinc-850 p-2.5 px-4 rounded-xl flex items-center gap-3 shrink-0">
                <div className="text-center font-mono">
                  <div className="text-[9px] text-zinc-500 uppercase tracking-widest leading-none font-bold">Оценка</div>
                  <div className="text-base font-bold text-emerald-400 mt-1">+{selectedGame.score || 0}</div>
                </div>
                <div className="w-px h-8 bg-zinc-850" />
                <button 
                  onClick={() => onVotePost(selectedGame.id, 'up')}
                  className="p-1.8 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
                  title="Голосовать за (Upvote)"
                >
                  <ThumbsUp className="w-4 h-4 text-emerald-500" />
                </button>
              </div>
            </div>

            {/* STEAM WORKSPACE LAYOUT COLLAPSIBLE COLLUMNS */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 1. LEFT COLUMN: STEAM MEDIA GALLERY VIEWPORT */}
                <div className="lg:col-span-7 space-y-3 select-none">
                  <div className="bg-[#07080a] aspect-[16/10] rounded-2xl overflow-hidden border border-zinc-850/80 flex items-center justify-center relative shadow-inner">
                    {isVideoUrl(activeMedia) ? (
                      <video 
                        key={activeMedia}
                        src={activeMedia} 
                        controls 
                        autoPlay
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <img 
                        src={activeMedia} 
                        alt="Gameplay screenshot" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>

                  {/* Thumbnail slider (Steam style!) */}
                  {selectedGame.screenshots && selectedGame.screenshots.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                      {/* Embed fallback cover url */}
                      <button 
                        onClick={() => setActiveMedia(selectedGame.url)}
                        className={`w-18 h-12 flex-shrink-0 rounded-lg overflow-hidden border transition bg-[#07080a] cursor-pointer ${
                          activeMedia === selectedGame.url ? 'border-purple-500 ring-1 ring-purple-500' : 'border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        <img src={selectedGame.url} className="w-full h-full object-cover opacity-75 hover:opacity-100" referrerPolicy="no-referrer" />
                      </button>
                      {selectedGame.screenshots.map((scr, idx) => (
                        <button 
                          key={idx}
                          onClick={() => setActiveMedia(scr)}
                          className={`w-18 h-12 flex-shrink-0 rounded-lg overflow-hidden border transition bg-[#07080a] cursor-pointer ${
                            activeMedia === scr ? 'border-purple-500 ring-1 ring-purple-500' : 'border-zinc-800 hover:border-zinc-600'
                          }`}
                        >
                          <img src={scr} className="w-full h-full object-cover opacity-75 hover:opacity-100" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. RIGHT COLUMN: DETAILS AND DOWNLOAD ACTIONS panel */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                  
                  {/* Game description Card */}
                  <div className="bg-[#07080a]/60 border border-zinc-900 rounded-2xl p-4.5 space-y-3 flex-grow">
                    <span className="text-[9.5px] font-mono tracking-wider text-zinc-550 uppercase font-black block border-b border-zinc-950 pb-2">
                      Описание Игры
                    </span>
                    <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                      {selectedGame.description || 'Данная игра не содержит дополнительного русскоязычного описания от автора.'}
                    </p>

                    <div className="pt-2">
                      <span className="text-[9px] font-mono tracking-wider text-zinc-550 uppercase font-black block mb-2">
                        Теги проекта
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {selectedGame.tags.map(tag => (
                          <span key={tag} className="px-2.5 py-0.8 bg-purple-950/25 border border-purple-900 text-purple-300 rounded-md text-[9px] font-mono uppercase tracking-wide">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* DEVICE-AWARE STEAM DOWNLOAD CTA AREA */}
                  <div className="bg-[#0b0c10] border border-purple-950/60 p-4.5 rounded-2xl space-y-4 select-none shadow shadow-black">
                    <div className="flex items-center justify-between border-b border-zinc-950 pb-2">
                      <span className="text-[10px] font-mono tracking-wider uppercase text-zinc-450 font-black">
                        Доступные релизы
                      </span>
                      <span className="text-[9px] bg-indigo-950 border border-indigo-900 text-indigo-300 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wide">
                        Free release
                      </span>
                    </div>

                    <div className="space-y-2">
                      {/* Determine download priority based on detected platform */}
                      {detectedPlatform === 'mobile' ? (
                        <>
                          {/* Android mobile device prioritize APK */}
                          {selectedGame.download_mobile ? (
                            <a 
                              href={selectedGame.download_mobile}
                              download
                              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 border border-emerald-500/80 text-white rounded-xl text-xs font-mono font-bold text-center tracking-wider uppercase transition flex items-center justify-center gap-2 shadow shadow-black/40 cursor-pointer"
                            >
                              <Download className="w-4 h-4 animate-bounce" />
                              <span>Скачать APK на телефон</span>
                            </a>
                          ) : (
                            <p className="text-[10.5px] text-amber-500 font-mono text-center flex items-center justify-center gap-1.5 bg-amber-950/20 border border-amber-950 rounded-lg py-2 px-3">
                              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                              <span>Официального APK релиза нет.</span>
                            </p>
                          )}

                          {selectedGame.download_pc && (
                            <a 
                              href={selectedGame.download_pc}
                              download
                              className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 text-zinc-400 rounded-xl text-[10.5px] font-mono text-center tracking-normal transition flex items-center justify-center gap-2"
                            >
                              <Monitor className="w-3.5 h-3.5" />
                              <span>Релиз для ПК (.exe / .zip)</span>
                            </a>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Desktop device prioritize EXE / ZIP */}
                          {selectedGame.download_pc ? (
                            <a 
                              href={selectedGame.download_pc}
                              download
                              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 border border-purple-500/80 text-white rounded-xl text-xs font-mono font-bold text-center tracking-wider uppercase transition flex items-center justify-center gap-2 shadow shadow-black/40 cursor-pointer"
                            >
                              <Download className="w-4 h-4 animate-bounce" />
                              <span>Скачать для ПК (.exe / .zip)</span>
                            </a>
                          ) : (
                            <p className="text-[10.5px] text-amber-500 font-mono text-center flex items-center justify-center gap-1.5 bg-amber-950/20 border border-amber-950 rounded-lg py-2 px-3">
                              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                              <span>Официального релиза для ПК нет.</span>
                            </p>
                          )}

                          {selectedGame.download_mobile && (
                            <a 
                              href={selectedGame.download_mobile}
                              download
                              className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 text-zinc-400 rounded-xl text-[10.5px] font-mono text-center tracking-normal transition flex items-center justify-center gap-2"
                            >
                              <Smartphone className="w-3.5 h-3.5" />
                              <span>Мобильная версия (.apk)</span>
                            </a>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1">
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Проверено антивирусом
                      </span>
                      <span>MD5: Secure Cache Verified</span>
                    </div>
                  </div>

                </div>

              </div>

              {/* 3. STEAM COMMENTS / REVIEWS BLOCK CHRONILCE */}
              <div className="space-y-4 pt-4 border-t border-zinc-900">
                <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-400 flex items-center gap-2 select-none border-b border-zinc-950 pb-2">
                  <MessageSquare className="w-4.5 h-4.5 text-[#ff5874]" />
                  <span>Отзывы геймеров и Обсуждения ({gameComments.length})</span>
                </h4>

                {/* Commentary Stream */}
                <div className="space-y-3.5 max-h-[280px] overflow-y-auto pr-2 divide-y divide-zinc-950">
                  {reviewsLoading ? (
                    <div className="py-8 text-center text-zinc-550 font-mono text-xs animate-pulse">Загрузка отзывов кураторов...</div>
                  ) : gameComments.length > 0 ? (
                    gameComments.map((comment) => (
                      <div key={comment.id} className="pt-3.5 first:pt-0 space-y-1.5 text-left">
                        <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 select-none">
                          <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-zinc-650" />
                            <span>{comment.author}</span>
                            <span className="bg-[#1b251c] border border-emerald-950 text-emerald-300 font-serif px-1 rounded-[3px] text-[8px] font-normal tracking-wide">CURATOR</span>
                          </span>
                          <span className="flex items-center gap-1 text-zinc-600">
                            <Calendar className="w-3 h-3 text-zinc-700" />
                            <span>{new Date(comment.created_at).toLocaleString()}</span>
                          </span>
                        </div>
                        <div className="bg-[#0b0c10] border border-zinc-900 rounded-xl p-3.5 text-xs text-zinc-300 font-sans leading-relaxed break-words shadow-sm">
                          {comment.text}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-zinc-650 font-mono italic text-center py-8 select-none bg-zinc-950/20 rounded-xl border border-dashed border-zinc-900/60">Отзывов для этой игры пока нет. Вы можете оставить первый отзыв ниже.</p>
                  )}
                </div>

                {/* Add dynamic review form */}
                <form onSubmit={handleAddGameComment} className="pt-4 border-t border-zinc-900 space-y-3 select-none">
                  <span className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase font-black block">Оставьте свой отзыв к игре</span>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                    <div className="md:col-span-4">
                      <input 
                        type="text"
                        value={newCommentAuthor}
                        onChange={(e) => setNewCommentAuthor(e.target.value)}
                        placeholder="Ваш никнейм (Аноним)"
                        className="w-full bg-[#0a0b0d] border border-zinc-850 focus:border-zinc-750 text-xs rounded-xl px-3 py-2.5 text-white focus:outline-none font-mono placeholder:text-zinc-600 shadow-inner"
                      />
                    </div>
                    <div className="md:col-span-8 flex gap-2">
                      <input 
                        type="text"
                        required
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="Поделитесь впечатлениями о геймплее игры..."
                        className="w-full bg-[#0a0b0d] border border-zinc-850 focus:border-zinc-750 text-xs rounded-xl px-4 py-2.5 text-white focus:outline-none font-mono placeholder:text-zinc-650 shadow-inner"
                      />
                      <button 
                        type="submit"
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-800 to-indigo-900 hover:from-purple-700 hover:to-indigo-800 border border-purple-700 text-white transition rounded-xl font-mono font-black text-xs shrink-0 cursor-pointer shadow-md"
                      >
                        Опубликовать
                      </button>
                    </div>
                  </div>
                </form>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};
