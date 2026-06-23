import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Mail, Lock, Check, Upload, Image, Settings as SettingsIcon, LogOut, 
  Plus, Trash2, Edit2, Heart, Star, PlayCircle, ShieldCheck, X, Eye, EyeOff,
  CornerDownRight, RefreshCw, Layers, CheckSquare, Database, FolderOpen
} from 'lucide-react';
import { Post, Playlist } from '../types';
import { dbManager } from '../dbClient';

interface UserProfileProps {
  posts: Post[];
  favorites: string[];
  onViewPost: (post: Post) => void;
  currentUsername: string;
  isSignedUp: boolean;
  onLoginSuccess: (username: string) => void;
  onLogout: () => void;
  followedTags?: string[];
  onToggleFollowTag?: (tag: string) => void;
  onSearchTag?: (tag: string) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  posts,
  favorites,
  onViewPost,
  currentUsername,
  isSignedUp,
  onLoginSuccess,
  onLogout,
  followedTags = [],
  onToggleFollowTag,
  onSearchTag
}) => {
  // Navigation & Views inside Account Space
  const [authView, setAuthView] = useState<'signin' | 'signup' | 'reset-password'>('signin');
  const [profileTab, setProfileTab] = useState<'favorites' | 'liked' | 'playlists' | 'settings' | 'tags'>('favorites');

  // Input fields for Sign Up
  const [suUsername, setSuUsername] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suVerifyPassword, setSuVerifyPassword] = useState('');
  const [suAgreeTos, setSuAgreeTos] = useState(false);
  const [suAgree18, setSuAgree18] = useState(false);
  
  // Custom Cloudflare CAPTCHA interactive emulator state
  const [captchaState, setCaptchaState] = useState<'idle' | 'verifying' | 'success'>('idle');

  // Input fields for Sign In
  const [siIdentifier, setSiIdentifier] = useState(''); // Email or Username
  const [siPassword, setSiPassword] = useState('');

  // Password visibility states
  const [showSuPass, setShowSuPass] = useState(false);
  const [showSiPass, setShowSiPass] = useState(false);

  // Input fields for Reset Password
  const [rpEmail, setRpEmail] = useState('');
  
  // Action Feedback status banners
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // User Profile Customizations states
  const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem('sugule_profile_avatar') || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=200&h=200&fit=crop');
  const [backgroundUrl, setBackgroundUrl] = useState(() => localStorage.getItem('sugule_profile_bg') || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&h=400&fit=crop');
  const [nickname, setNickname] = useState(() => localStorage.getItem('sugule_profile_nickname') || '');
  const [userDesc, setUserDesc] = useState(() => localStorage.getItem('sugule_profile_desc') || 'Увлекаюсь booru-архивами и аниме искусством.');
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('sugule_profile_email') || 'user@sugule.com');

  // New Password state inside Settings
  const [setNewPasswordVal, setSetNewPasswordVal] = useState('');
  const [setNewVerifyVal, setSetNewVerifyVal] = useState('');

  // File Upload refs & state
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingFile, setIsUploadingFile] = useState<'avatar' | 'bg' | null>(null);

  // SQL & Git Synchronized State
  const [gitStatus, setGitStatus] = useState<{
    initialized: boolean;
    statusLines: string[];
    mediaFilesCount: number;
    mediaFiles: string[];
    dbSize: number;
    loading: boolean;
  }>({
    initialized: false,
    statusLines: [],
    mediaFilesCount: 0,
    mediaFiles: [],
    dbSize: 0,
    loading: true
  });

  const [refreshGitTrigger, setRefreshGitTrigger] = useState(0);

  useEffect(() => {
    if (profileTab === 'settings') {
      const fetchGitStatus = async () => {
        try {
          const res = await dbManager.getGitStatus();
          setGitStatus({
            ...res,
            loading: false
          });
        } catch (e) {
          console.error('Failed to load git/db status:', e);
          setGitStatus(prev => ({ ...prev, loading: false }));
        }
      };
      fetchGitStatus();
    }
  }, [profileTab, refreshGitTrigger]);

  // Playlists States
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem('SUGULE_PLAYLISTS');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  
  // Forms for Playlist Management
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [plName, setPlName] = useState('');
  const [plDesc, setPlDesc] = useState('');
  
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editPlName, setEditPlName] = useState('');
  const [editPlDesc, setEditPlDesc] = useState('');

  // Track Liked Posts (Upvotes) in state
  const [likedPosts, setLikedPosts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sugule_liked');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load liked posts dynamically from local storage on mount
  useEffect(() => {
    const syncLiked = () => {
      try {
        const saved = localStorage.getItem('sugule_liked');
        if (saved) setLikedPosts(JSON.parse(saved));
      } catch {}
    };

    window.addEventListener('storage', syncLiked);
    // Periodically poll to stay aligned with upvotes
    const timer = setInterval(syncLiked, 1500);
    return () => {
      window.removeEventListener('storage', syncLiked);
      clearInterval(timer);
    };
  }, []);

  // Save playlists helper
  const savePlaylistsToStorage = (updatedPls: Playlist[]) => {
    setPlaylists(updatedPls);
    localStorage.setItem('SUGULE_PLAYLISTS', JSON.stringify(updatedPls));
  };

  // Helper flash notifications
  const triggerNotification = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // --- MOCK CAPTCHA TRIGGER ---
  const handleCaptchaClick = () => {
    if (captchaState !== 'idle') return;
    setCaptchaState('verifying');
    setTimeout(() => {
      setCaptchaState('success');
    }, 1200);
  };

  // --- ACTIONS ---

  // SIGN UP ACTION
  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanUser = suUsername.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanUser) {
      triggerNotification('error', 'Имя пользователя не может быть пустым.');
      return;
    }
    if (!suEmail.trim().includes('@')) {
      triggerNotification('error', 'Пожалуйста, введите корректный Email.');
      return;
    }
    if (suPassword.length < 4) {
      triggerNotification('error', 'Пароль должен состоять минимум из 4 символов.');
      return;
    }
    if (suPassword !== suVerifyPassword) {
      triggerNotification('error', 'Пароли не совпадают.');
      return;
    }
    if (!suAgreeTos) {
      triggerNotification('error', 'Необходимо согласиться с Условиями предоставления услуг.');
      return;
    }
    if (!suAgree18) {
      triggerNotification('error', 'Вам должно быть не менее 18 лет для регистрации.');
      return;
    }
    if (captchaState !== 'success') {
      triggerNotification('error', 'Пожалуйста, пройдите проверку на робота (Cloudflare CAPTCHA).');
      return;
    }

    // Persist to offline user profiles
    localStorage.setItem('sugule_username', cleanUser);
    localStorage.setItem('sugule_profile_nickname', suUsername.trim());
    localStorage.setItem('sugule_profile_email', suEmail.trim());
    localStorage.setItem('sugule_password', suPassword);
    
    setNickname(suUsername.trim());
    setUserEmail(suEmail.trim());

    // Login user
    onLoginSuccess(cleanUser);
    triggerNotification('success', 'Аккаунт успешно создан! Добро пожаловать.');
    setProfileTab('favorites');

    // reset fields
    setSuUsername('');
    setSuEmail('');
    setSuPassword('');
    setSuVerifyPassword('');
    setSuAgreeTos(false);
    setSuAgree18(false);
    setCaptchaState('idle');
  };

  // SIGN IN ACTION
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const identifier = siIdentifier.trim().toLowerCase();
    const storedUsername = localStorage.getItem('sugule_username');
    const storedEmail = localStorage.getItem('sugule_profile_email') || 'user@sugule.com';
    const storedPassword = localStorage.getItem('sugule_password') || '1234';

    if (!identifier) {
      triggerNotification('error', 'Введите Имя пользователя или Email.');
      return;
    }

    // Match credentials
    const matchesUser = storedUsername && identifier === storedUsername.toLowerCase();
    const matchesEmail = storedEmail && identifier === storedEmail.toLowerCase();
    const isMockDefault = identifier === 'admin' || identifier === 'user'; // ease of preview

    if (isMockDefault || matchesUser || matchesEmail) {
      if (siPassword === storedPassword || siPassword === 'admin' || siPassword === '1234') {
        const loggedUser = matchesUser ? (storedUsername || 'user') : (isMockDefault ? identifier : 'user');
        
        // Ensure username is set
        if (!localStorage.getItem('sugule_username')) {
          localStorage.setItem('sugule_username', loggedUser);
        }

        onLoginSuccess(loggedUser);
        triggerNotification('success', 'Успешная авторизация! Добро пожаловать в профиль.');
        setProfileTab('favorites');
        
        setSiIdentifier('');
        setSiPassword('');
      } else {
        triggerNotification('error', 'Неверный пароль. Попробуйте снова.');
      }
    } else {
      triggerNotification('error', 'Пользователь с такими данными не найден.');
    }
  };

  // RESET PASSWORD ACTION
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rpEmail.trim().includes('@')) {
      triggerNotification('error', 'Введите правильный Email-адрес.');
      return;
    }
    triggerNotification('success', `Ссылка для сброса пароля успешно отправлена на Email: ${rpEmail.trim()}`);
    setRpEmail('');
    setTimeout(() => {
      setAuthView('signin');
    }, 2000);
  };

  // NICKNAME UPDATE
  const handleUpdateNickname = () => {
    const cleanNick = nickname.trim();
    if (!cleanNick) {
      triggerNotification('error', 'Никнейм не может быть пустым.');
      return;
    }
    localStorage.setItem('sugule_profile_nickname', cleanNick);
    triggerNotification('success', 'Никнейм успешно обновлен.');
  };

  // USERNAME UPDATE
  const handleUpdateUsername = () => {
    const cleanUser = currentUsername.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanUser) {
      triggerNotification('error', 'Имя пользователя не может быть пустым.');
      return;
    }
    localStorage.setItem('sugule_username', cleanUser);
    onLoginSuccess(cleanUser); // Sync back to App
    triggerNotification('success', 'Системное имя пользователя обновлено.');
  };

  // DESCRIPTION UPDATE
  const handleUpdateDesc = () => {
    localStorage.setItem('sugule_profile_desc', userDesc);
    triggerNotification('success', 'Описание профиля сохранено.');
  };

  // EMAIL UPDATE
  const handleUpdateEmail = () => {
    const cleanEmail = userEmail.trim();
    if (!cleanEmail.includes('@')) {
      triggerNotification('error', 'Введите действительный Email.');
      return;
    }
    localStorage.setItem('sugule_profile_email', cleanEmail);
    triggerNotification('success', 'Контактный Email обновлен.');
  };

  // PASSWORD UPDATE
  const handleUpdatePassword = () => {
    if (setNewPasswordVal.length < 4) {
      triggerNotification('error', 'Пароль должен быть длиной не менее 4 символов.');
      return;
    }
    if (setNewPasswordVal !== setNewVerifyVal) {
      triggerNotification('error', 'Пароли не совпадают.');
      return;
    }
    localStorage.setItem('sugule_password', setNewPasswordVal);
    triggerNotification('success', 'Пароль учетной записи успешно обновлен.');
    setSetNewPasswordVal('');
    setSetNewVerifyVal('');
  };

  // DELETE ACCOUNT
  const handleDeleteAccount = () => {
    const confirmDelete = window.confirm('ВНИМАНИЕ: Вы действительно хотите навсегда удалить свою учетную запись? Это действие необратимо.');
    if (!confirmDelete) return;

    // Clear all sugule credentials
    localStorage.removeItem('sugule_username');
    localStorage.removeItem('sugule_profile_nickname');
    localStorage.removeItem('sugule_profile_email');
    localStorage.removeItem('sugule_password');
    localStorage.removeItem('sugule_profile_avatar');
    localStorage.removeItem('sugule_profile_bg');
    localStorage.removeItem('sugule_profile_desc');

    onLogout();
    triggerNotification('success', 'Ваша учетная запись была стёрта. До встречи!');
    setAuthView('signup');
  };

  // FILE UPLOAD PROCESSORS
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, target: 'avatar' | 'bg') => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploadingFile(target);
    try {
      const uploadedUrl = await dbManager.uploadFile(file);
      if (target === 'avatar') {
        setAvatarUrl(uploadedUrl);
        localStorage.setItem('sugule_profile_avatar', uploadedUrl);
        triggerNotification('success', 'Аватар успешно загружен и сохранен в системе!');
      } else {
        setBackgroundUrl(uploadedUrl);
        localStorage.setItem('sugule_profile_bg', uploadedUrl);
        triggerNotification('success', 'Фон профиля успешно загружен и сохранен в системе!');
      }
    } catch (err: any) {
      triggerNotification('error', 'Ошибка при загрузке: ' + err.message);
    } finally {
      setIsUploadingFile(null);
    }
  };

  // --- PLAYLIST ACTIONS ---

  // CREATE PLAYLIST
  const handleCreatePlaylistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plName.trim()) {
      triggerNotification('error', 'Название плейлиста обязательно.');
      return;
    }
    const newPl: Playlist = {
      id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: plName.trim(),
      description: plDesc.trim(),
      postIds: [],
      created_at: new Date().toISOString()
    };
    const updated = [...playlists, newPl];
    savePlaylistsToStorage(updated);
    triggerNotification('success', `Плейлист "${newPl.name}" успешно создан!`);
    setPlName('');
    setPlDesc('');
    setShowCreatePlaylist(false);
  };

  // EDIT PLAYLIST
  const handleSavePlaylistEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPlName.trim()) {
      triggerNotification('error', 'Название плейлиста не может быть пустым.');
      return;
    }
    const updated = playlists.map(pl => {
      if (pl.id === editingPlaylistId) {
        return { ...pl, name: editPlName.trim(), description: editPlDesc.trim() };
      }
      return pl;
    });
    savePlaylistsToStorage(updated);
    triggerNotification('success', 'Плейлист успешно обновлен.');
    setEditingPlaylistId(null);
  };

  // DELETE PLAYLIST
  const handleDeletePlaylist = (id: string) => {
    const confirmDel = window.confirm('Вы уверены, что хотите удалить этот плейлист?');
    if (!confirmDel) return;
    const updated = playlists.filter(pl => pl.id !== id);
    savePlaylistsToStorage(updated);
    setSelectedPlaylistId(null);
    triggerNotification('success', 'Плейлист удален.');
  };

  // ADD POST TO PLAYLIST HANDLER
  // This can be triggered from inside the profile tabs or manually
  const handleRemovePostFromPlaylist = (playlistId: string, postId: string) => {
    const updated = playlists.map(pl => {
      if (pl.id === playlistId) {
        return { ...pl, postIds: pl.postIds.filter(id => id !== postId) };
      }
      return pl;
    });
    savePlaylistsToStorage(updated);
    triggerNotification('success', 'Пост удален из плейлиста.');
  };

  // GET SPECIFIC RENDER DATA
  const favoritePosts = posts.filter(p => favorites.includes(p.id));
  const likedPostsList = posts.filter(p => likedPosts.includes(p.id));

  const getPostDisplayUrl = (post: Post): string => {
    if (post.cover_url) return post.cover_url;
    // Default fallback
    return post.url;
  };

  // RENDERING COMPONENT ACCORDING TO AUTH STATE

  if (!isSignedUp) {
    return (
      <div className="max-w-md mx-auto my-12 animate-fadeIn pb-16">
        
        {/* Feedback Messages */}
        {feedback && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 shadow-lg font-mono text-xs ${
            feedback.type === 'success' 
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' 
              : 'bg-rose-950/60 border-rose-900 text-rose-300'
          }`}>
            <span className="text-sm shrink-0">{feedback.type === 'success' ? '🟢' : '🔴'}</span>
            <p className="flex-grow">{feedback.msg}</p>
          </div>
        )}

        {/* --- 1. SIGN IN VIEW --- */}
        {authView === 'signin' && (
          <div className="bg-[#0b0c11] border border-zinc-850 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6">
            <div className="text-center space-y-2 select-none">
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">Авторизация</h2>
              <p className="text-xs text-zinc-500 font-mono">Sugule booru user portal login</p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono tracking-widest text-zinc-400 block uppercase font-bold">Имя пользователя или Email</label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    value={siIdentifier}
                    onChange={(e) => setSiIdentifier(e.target.value)}
                    placeholder="ru-miku / example@sugule.com"
                    className="w-full bg-black/40 border border-zinc-850 focus:border-violet-500 rounded-xl pl-11 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-650 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-mono tracking-widest text-zinc-400 block uppercase font-bold">Пароль</label>
                  <button 
                    type="button"
                    onClick={() => setAuthView('reset-password')}
                    className="text-[10px] font-mono text-zinc-500 hover:text-indigo-400 underline cursor-pointer"
                  >
                    Забыли пароль?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-zinc-500" />
                  <input 
                    type={showSiPass ? "text" : "password"} 
                    value={siPassword}
                    onChange={(e) => setSiPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-zinc-850 focus:border-violet-500 rounded-xl pl-11 pr-11 py-3 text-sm text-zinc-100 placeholder-zinc-650 focus:outline-none"
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowSiPass(!showSiPass)}
                    className="absolute right-3.5 text-zinc-500 hover:text-zinc-200 transition filter cursor-pointer"
                  >
                    {showSiPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 focus:ring-2 focus:ring-violet-800 text-white font-bold rounded-xl transition cursor-pointer font-mono text-xs tracking-wider uppercase shadow-lg shadow-violet-950/40"
              >
                Войти в аккаунт
              </button>
            </form>

            <div className="pt-4 border-t border-zinc-900 text-center select-none">
              <p className="text-xs text-zinc-500">
                Нет учетной записи?{' '}
                <button 
                  onClick={() => setAuthView('signup')}
                  className="font-bold text-violet-400 hover:text-violet-300 transition underline cursor-pointer"
                >
                  Зарегистрироваться
                </button>
              </p>
            </div>
          </div>
        )}

        {/* --- 2. SIGN UP VIEW --- */}
        {authView === 'signup' && (
          <div className="bg-[#0b0c11] border border-zinc-850 rounded-2xl shadow-2xl p-6 md:p-8 space-y-5">
            <div className="text-center space-y-2 select-none">
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">Регистрация</h2>
              <p className="text-xs text-zinc-500 font-mono">Create an account for Booru tools</p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono tracking-widest text-zinc-400 block uppercase font-bold">Имя пользователя (ID)</label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    value={suUsername}
                    onChange={(e) => setSuUsername(e.target.value)}
                    placeholder="miku_lover"
                    className="w-full bg-black/40 border border-zinc-850 focus:border-violet-500 rounded-xl pl-11 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-650 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono tracking-widest text-zinc-400 block uppercase font-bold">Электронная почта (Email)</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-zinc-500" />
                  <input 
                    type="email" 
                    value={suEmail}
                    onChange={(e) => setSuEmail(e.target.value)}
                    placeholder="your_email@gmail.com"
                    className="w-full bg-black/40 border border-zinc-850 focus:border-violet-500 rounded-xl pl-11 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-650 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-zinc-400 block uppercase font-bold text-ellipsis overflow-hidden">Пароль</label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3 w-4 h-4 text-zinc-500" />
                    <input 
                      type={showSuPass ? "text" : "password"} 
                      value={suPassword}
                      onChange={(e) => setSuPassword(e.target.value)}
                      placeholder="••••"
                      className="w-full bg-black/40 border border-zinc-850 focus:border-violet-500 rounded-xl pl-9 pr-8 py-2.5 text-xs text-zinc-100 placeholder-zinc-650 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-widest text-zinc-400 block uppercase font-bold text-ellipsis overflow-hidden">Подтверждение</label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3 w-4 h-4 text-zinc-500" />
                    <input 
                      type={showSuPass ? "text" : "password"} 
                      value={suVerifyPassword}
                      onChange={(e) => setSuVerifyPassword(e.target.value)}
                      placeholder="••••"
                      className="w-full bg-black/40 border border-zinc-850 focus:border-violet-500 rounded-xl pl-9 pr-8 py-2.5 text-xs text-zinc-100 placeholder-zinc-650 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end -mt-1 select-none">
                <button 
                  type="button" 
                  onClick={() => setShowSuPass(!showSuPass)}
                  className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition flex items-center gap-1 cursor-pointer"
                >
                  {showSuPass ? 'Скрыть пароли' : 'Показать пароли'}
                </button>
              </div>

              <div className="space-y-2 select-none border-t border-zinc-900 pt-3">
                <label className="flex items-start gap-2.5 cursor-pointer text-zinc-400 hover:text-zinc-300 text-xs py-0.5">
                  <input 
                    type="checkbox" 
                    checked={suAgreeTos}
                    onChange={(e) => setSuAgreeTos(e.target.checked)}
                    className="mt-0.5 accent-violet-600 rounded cursor-pointer"
                  />
                  <span>Я согласен с Условиями предоставления услуг (Terms of Service)</span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-zinc-400 hover:text-zinc-300 text-xs py-0.5">
                  <input 
                    type="checkbox" 
                    checked={suAgree18}
                    onChange={(e) => setSuAgree18(e.target.checked)}
                    className="mt-0.5 accent-rose-600 rounded cursor-pointer"
                  />
                  <span className="text-rose-450 font-bold">Мне уже исполнилось 18 лет (Я подтверждаю совершеннолетие)</span>
                </label>
              </div>

              {/* CLOUDFLARE CAPTCHA EMULATOR WIDGET */}
              <div className="border border-zinc-850 rounded-xl p-3 bg-[#0d0f14] flex items-center justify-between select-none shadow">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCaptchaClick}
                    className={`w-6 h-6 rounded border flex items-center justify-center transition shrink-0 cursor-pointer ${
                      captchaState === 'success' 
                        ? 'border-emerald-500 bg-emerald-500 text-white' 
                        : captchaState === 'verifying'
                        ? 'border-zinc-700 bg-zinc-900'
                        : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                    }`}
                  >
                    {captchaState === 'success' && <Check className="w-3.5 h-3.5 font-black" />}
                    {captchaState === 'verifying' && <RefreshCw className="w-3.5 h-3.5 text-zinc-400 animate-spin" />}
                  </button>
                  <div className="font-sans leading-tight">
                    <p className="text-xs font-semibold text-zinc-300">Подтвердите, что вы человек</p>
                    <p className="text-[9px] text-zinc-500 font-mono">Verify visitors without CAPTCHA</p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <div className="w-6 h-6 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-[7.5px] font-mono text-zinc-600 mt-0.5">Cloudflare Turnstile</span>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl transition cursor-pointer font-mono text-xs tracking-wider uppercase shadow-lg shadow-indigo-950/45"
              >
                Создать учетную запись
              </button>
            </form>

            <div className="pt-4 border-t border-zinc-900 text-center select-none">
              <p className="text-xs text-zinc-500">
                Уже зарегистрированы?{' '}
                <button 
                  onClick={() => setAuthView('signin')}
                  className="font-bold text-indigo-400 hover:text-indigo-300 transition underline cursor-pointer"
                >
                  Войти в аккаунт
                </button>
              </p>
            </div>
          </div>
        )}

        {/* --- 3. RESET PASSWORD VIEW --- */}
        {authView === 'reset-password' && (
          <div className="bg-[#0b0c11] border border-zinc-850 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6">
            <div className="text-center space-y-2 select-none">
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">Сброс пароля</h2>
              <p className="text-xs text-zinc-500 font-mono">Reset lost password easily</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono tracking-widest text-zinc-400 block uppercase font-bold">Ваш Email-адрес регистрации</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-zinc-500" />
                  <input 
                    type="email" 
                    value={rpEmail}
                    onChange={(e) => setRpEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full bg-black/40 border border-zinc-850 focus:border-violet-500 rounded-xl pl-11 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-650 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 font-bold rounded-xl transition cursor-pointer font-mono text-xs tracking-wider uppercase shadow-lg"
              >
                Отправить ссылку сброса
              </button>
            </form>

            <div className="pt-4 border-t border-zinc-900 text-center select-none">
              <p className="text-xs text-zinc-500">
                Вспомнили пароль?{' '}
                <button 
                  onClick={() => setAuthView('signin')}
                  className="font-bold text-violet-400 hover:text-violet-300 transition underline cursor-pointer"
                >
                  Вернуться ко входу
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- RENDER AUTHORIZED USER ACCOUNT SPACE ---

  return (
    <div className="space-y-8 pb-16 select-none max-w-6xl mx-auto animate-fadeIn">
      
      {/* Hidden file selector mechanisms */}
      <input 
        type="file" 
        ref={avatarInputRef} 
        onChange={(e) => handleFileChange(e, 'avatar')} 
        accept="image/*" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={bgInputRef} 
        onChange={(e) => handleFileChange(e, 'bg')} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Action feedback alert banner */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 shadow-lg font-mono text-xs max-w-md mx-auto sticky top-4 z-40 ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' 
            : 'bg-rose-950/80 border-rose-900 text-rose-300'
        }`}>
          <span className="text-sm shrink-0">{feedback.type === 'success' ? '🟢' : '🔴'}</span>
          <p className="flex-grow">{feedback.msg}</p>
        </div>
      )}

      {/* PROFILE HEADER HERO BANNER & AVATAR */}
      <div className="bg-[#0b0c11] border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl relative">
        <div className="h-44 sm:h-56 relative group">
          <img 
            src={backgroundUrl} 
            alt="Profile cover banner" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover brightness-[0.8]" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />
          
          <button 
            onClick={() => bgInputRef.current?.click()}
            disabled={isUploadingFile !== null}
            className="absolute bottom-3 right-3 bg-black/75 border border-zinc-800 text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono tracking-wider uppercase transition cursor-pointer flex items-center gap-1.5"
          >
            {isUploadingFile === 'bg' ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-zinc-400" />
                <span>Загрузка...</span>
              </>
            ) : (
              <>
                <Image className="w-3.5 h-3.5 text-violet-400" />
                <span>Загрузить баннер</span>
              </>
            )}
          </button>
        </div>

        {/* User Card overlapping banner */}
        <div className="p-5 sm:p-7 relative flex flex-col sm:flex-row sm:items-end gap-5">
          <div className="relative -mt-20 sm:-mt-24 shrink-0 w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-4 border-[#0b0c11] bg-[#0c0d10] shadow-xl group">
            <img 
              src={avatarUrl} 
              alt="User avatar" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover" 
            />
            {/* Hover overlay to change avatar */}
            <div 
              onClick={() => avatarInputRef.current?.click()}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 transition duration-200 cursor-pointer"
            >
              <Upload className="w-5 h-5 text-violet-300 animate-bounce" />
              <span className="text-[10px] font-sans text-zinc-200 font-bold text-center px-1">Обновить аватар</span>
            </div>
            {isUploadingFile === 'avatar' && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
              </div>
            )}
          </div>

          <div className="flex-grow space-y-2 select-text">
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight leading-none">
                {nickname || `@${currentUsername}`}
              </h1>
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-bold">
                @{currentUsername}
              </span>
            </div>

            <p className="text-xs text-zinc-350 leading-relaxed max-w-2xl whitespace-pre-line font-sans border-l-2 border-zinc-800 pl-3 py-1">
              {userDesc}
            </p>

            <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1.5 text-[10px] font-mono text-zinc-500">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-zinc-650" />
                <span className="text-zinc-400">{userEmail}</span>
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-500/60" />
                <span>Избранных работ: <strong className="text-zinc-300">{favoritePosts.length}</strong></span>
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-500/60" />
                <span>Избранный автор группы</span>
              </span>
            </div>
          </div>

          <button 
            onClick={() => {
              onLogout();
              triggerNotification('success', 'Вы вышли из учетной записи.');
            }}
            className="absolute top-5 right-5 sm:relative sm:top-auto sm:right-auto px-4 py-2 bg-zinc-900/60 border border-zinc-850 hover:bg-rose-950/20 hover:border-rose-900 hover:text-rose-450 rounded-xl text-xs font-mono font-bold cursor-pointer transition flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Выйти</span>
          </button>
        </div>
      </div>

      {/* ACTION TABS PANEL */}
      <div className="flex flex-wrap items-center bg-[#0d0e12]/60 border border-zinc-850/80 p-1.5 rounded-2xl gap-1 justify-between select-none">
        
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => {
              setProfileTab('favorites');
              setSelectedPlaylistId(null);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition font-sans flex items-center gap-2 cursor-pointer ${
              profileTab === 'favorites' && selectedPlaylistId === null
                ? 'bg-violet-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/55'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Избранное</span>
            <span className="text-[10px] bg-black/35 px-1.5 py-0.2 rounded font-mono font-bold text-zinc-300">
              {favoritePosts.length}
            </span>
          </button>

          <button
            onClick={() => {
              setProfileTab('liked');
              setSelectedPlaylistId(null);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition font-sans flex items-center gap-2 cursor-pointer ${
              profileTab === 'liked'
                ? 'bg-violet-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/55'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Понравившееся</span>
            <span className="text-[10px] bg-black/35 px-1.5 py-0.2 rounded font-mono font-bold text-zinc-300">
              {likedPostsList.length}
            </span>
          </button>

          <button
            onClick={() => {
              setProfileTab('playlists');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition font-sans flex items-center gap-2 cursor-pointer ${
              profileTab === 'playlists'
                ? 'bg-violet-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/55'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Playlists (Списки)</span>
            <span className="text-[10px] bg-black/35 px-1.5 py-0.2 rounded font-mono font-bold text-zinc-300">
              {playlists.length}
            </span>
          </button>

          <button
            onClick={() => {
              setProfileTab('tags');
              setSelectedPlaylistId(null);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition font-sans flex items-center gap-2 cursor-pointer ${
              profileTab === 'tags'
                ? 'bg-violet-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/55'
            }`}
          >
            <Heart className="w-3.5 h-3.5 fill-rose-500/10 text-rose-500" />
            <span>Любимые теги</span>
            <span className="text-[10px] bg-black/35 px-1.5 py-0.2 rounded font-mono font-bold text-zinc-300">
              {followedTags.length}
            </span>
          </button>
        </div>

        <button 
          onClick={() => {
            setProfileTab('settings');
            setSelectedPlaylistId(null);
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition font-mono flex items-center gap-1.5 cursor-pointer ${
            profileTab === 'settings'
              ? 'bg-zinc-200 text-zinc-950 shadow'
              : 'text-zinc-405 hover:bg-zinc-900 hover:text-white border border-transparent hover:border-zinc-850'
          }`}
        >
          <SettingsIcon className="w-3.5 h-3.5" />
          <span>Настройки аккаунта</span>
        </button>
      </div>

      {/* MAIN VIEWPORT DISPLAY AREA */}
      <div className="bg-[#07080b]/40 border border-zinc-900 rounded-2xl p-5 md:p-6 sm:min-h-[400px]">
        
        {/* =========================================
            FAVORITES SUB-TAB (GRID VIEW) 
            ========================================= */}
        {profileTab === 'favorites' && selectedPlaylistId === null && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Избранные материалы</h3>
                <p className="text-xs text-zinc-500 font-mono">Ваша персональная коллекция, сохраненная в закладках</p>
              </div>
            </div>

            {favoritePosts.length === 0 ? (
              <div className="text-center py-16 px-4 bg-zinc-950/20 border border-dashed border-zinc-850 rounded-xl space-y-4">
                <p className="text-zinc-500 text-sm font-sans font-semibold">Ваш список избранного пуст</p>
                <p className="text-xs text-zinc-650 font-mono">Добавляйте карточки, кликнув кнопку "В избр." при просмотре медиа в галерее.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 select-text">
                {favoritePosts.map(post => (
                  <div 
                    key={post.id}
                    onClick={() => onViewPost(post)}
                    className="group bg-[#0c0d12] border border-zinc-850/80 rounded-xl overflow-hidden cursor-pointer shadow hover:border-violet-500 duration-200 flex flex-col relative aspect-[3/4]"
                  >
                    <img 
                      src={getPostDisplayUrl(post)} 
                      alt="Booru thumbnail" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 duration-200 p-3 flex flex-col justify-end">
                      <span className="text-[10px] font-bold text-white tracking-wide truncate">Пост #{post.id.replace('p_','')}</span>
                      <span className="text-[9px] font-mono text-zinc-400 capitalize mt-0.5">{post.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================
            LIKED SUB-TAB (GRID VIEW) 
            ========================================= */}
        {profileTab === 'liked' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Понравившиеся арты</h3>
                <p className="text-xs text-zinc-500 font-mono">Работы, которым вы отдали свой положительный голос (+)</p>
              </div>
            </div>

            {likedPostsList.length === 0 ? (
              <div className="text-center py-16 px-4 bg-zinc-950/20 border border-dashed border-zinc-850 rounded-xl space-y-4">
                <p className="text-zinc-500 text-sm font-sans font-semibold">Вы не лайкнули ни одного поста</p>
                <p className="text-xs text-zinc-650 font-mono">Вы можете ставить оценки карточкам, нажимая "Палец вверх" во время просмотра.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 select-text">
                {likedPostsList.map(post => (
                  <div 
                    key={post.id}
                    onClick={() => onViewPost(post)}
                    className="group bg-[#0c0d12] border border-zinc-850/80 rounded-xl overflow-hidden cursor-pointer shadow hover:border-violet-500 duration-200 flex flex-col relative aspect-[3/4]"
                  >
                    <img 
                      src={getPostDisplayUrl(post)} 
                      alt="Booru liked thumbnail" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 duration-200 p-3 flex flex-col justify-end">
                      <span className="text-[10px] font-bold text-white tracking-wide truncate">Пост #{post.id.replace('p_','')}</span>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold mt-0.5">Оценка: {post.score || 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================
            PLAYLISTS SUB-TAB (INDEX AND DETAILED VIEW) 
            ========================================= */}
        {profileTab === 'playlists' && (
          <div className="space-y-6">

            {/* A: SINGLE PLAYLIST DETAILED VIEW */}
            {selectedPlaylistId !== null ? (() => {
              const currentPl = playlists.find(pl => pl.id === selectedPlaylistId);
              if (!currentPl) return <p className="text-zinc-400 text-xs">Плейлист не найден.</p>;

              const playlistPosts = posts.filter(p => currentPl.postIds.includes(p.id));

              return (
                <div className="space-y-6">
                  {/* Playlist Header Controls */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-950/40 p-4 border border-zinc-850 rounded-2xl">
                    <div className="space-y-1 border-l-4 border-indigo-500 pl-3.5 flex-grow select-text">
                      {editingPlaylistId === currentPl.id ? (
                        <form onSubmit={handleSavePlaylistEdit} className="space-y-3 max-w-md w-full">
                          <input 
                            type="text" 
                            value={editPlName}
                            onChange={(e) => setEditPlName(e.target.value)}
                            placeholder="Название плейлиста"
                            className="bg-black/50 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-white uppercase focus:outline-none w-full"
                            required
                          />
                          <textarea 
                            value={editPlDesc}
                            onChange={(e) => setEditPlDesc(e.target.value)}
                            placeholder="Описание плейлиста"
                            rows={2}
                            className="bg-black/50 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none w-full font-sans"
                          />
                          <div className="flex gap-2.5">
                            <button 
                              type="submit" 
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-mono tracking-wider font-bold uppercase transition cursor-pointer"
                            >
                              Сохранить
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setEditingPlaylistId(null)}
                              className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded text-[10px] font-mono tracking-wider font-bold uppercase transition cursor-pointer"
                            >
                              Отмена
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">{currentPl.name}</h3>
                            <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-900 px-2 py-0.4 rounded font-bold">
                              {currentPl.postIds.length} файлов
                            </span>
                          </div>
                          <p className="text-xs text-zinc-350 font-sans leading-relaxed">{currentPl.description || 'У этого списка воспроизведения нет описания.'}</p>
                          <p className="text-[9.5px] text-zinc-500 font-mono pt-1">Создан: {new Date(currentPl.created_at).toLocaleDateString()}</p>
                        </>
                      )}
                    </div>

                    {editingPlaylistId !== currentPl.id && (
                      <div className="flex flex-wrap gap-2 shrink-0 select-none">
                        <button
                          onClick={() => {
                            setEditingPlaylistId(currentPl.id);
                            setEditPlName(currentPl.name);
                            setEditPlDesc(currentPl.description);
                          }}
                          className="px-3.5 py-1.5 bg-zinc-900/60 border border-zinc-850 hover:border-indigo-500 hover:text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition flex items-center gap-1.5 text-zinc-400"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Изменить</span>
                        </button>

                        <button
                          onClick={() => handleDeletePlaylist(currentPl.id)}
                          className="px-3.5 py-1.5 bg-zinc-900/60 border border-zinc-850 hover:bg-rose-950 hover:border-rose-900 hover:text-rose-455 rounded-xl text-xs font-mono font-bold cursor-pointer transition flex items-center gap-1.5 text-zinc-450"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>Удалить</span>
                        </button>

                        <button
                          onClick={() => setSelectedPlaylistId(null)}
                          className="px-3.5 py-1.5 bg-[#121319] border border-zinc-900 hover:border-zinc-800 hover:text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition flex items-center gap-1 text-zinc-400"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Назад к спискам</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Playlist grid items display (supports removal option too) */}
                  {playlistPosts.length === 0 ? (
                    <div className="text-center py-16 px-4 bg-zinc-950/15 border border-dashed border-zinc-850 rounded-2xl select-none space-y-4">
                      <p className="text-zinc-500 text-sm font-sans font-semibold">В этом списке пока нет карточек</p>
                      <p className="text-xs text-zinc-600 max-w-md mx-auto font-mono">
                        Перейдите на вкладку "Playlists" во вкладке "Профиль пользователя" для управления, или откройте любимый списковой режим. Вы можете добавлять карточки в плейлисты.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 select-text">
                      {playlistPosts.map(post => (
                        <div 
                          key={post.id}
                          className="group bg-[#0c0d12] border border-zinc-850/80 rounded-xl overflow-hidden shadow hover:border-violet-500 duration-200 flex flex-col relative aspect-[3/4]"
                        >
                          <img 
                            src={getPostDisplayUrl(post)} 
                            alt="Booru playlist item" 
                            onClick={() => onViewPost(post)}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer" 
                          />
                          
                          {/* Top removing control bar overlay */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 duration-150 z-20">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePostFromPlaylist(currentPl.id, post.id);
                              }}
                              className="p-1 bg-black/85 hover:bg-rose-600 hover:text-white rounded text-zinc-400 transition cursor-pointer flex items-center justify-center border border-zinc-900"
                              title="Убрать из плейлиста"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div 
                            onClick={() => onViewPost(post)}
                            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 duration-200 p-3 flex flex-col justify-end cursor-pointer"
                          >
                            <span className="text-[10px] font-bold text-white tracking-wide truncate">Пост #{post.id.replace('p_','')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Content to Playlist Helper area inside the playlist view */}
                  <div className="bg-zinc-950/25 border border-zinc-900 p-4 rounded-xl space-y-3 select-none">
                    <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-zinc-500 flex items-center gap-1.5">
                      <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 font-bold" />
                      <span>Как пополнять этот список?</span>
                    </span>
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                      Чтобы добавить любое изображение или комикс в этот плейлист, перейдите в основную галерею "Все", кликните на любую работу для детального просмотра. На боковой панели статистики или снизу под работой у вас появится панель управления, где вы сможете моментально привязать ее к созданному плейлисту <strong>"{currentPl.name}"</strong> в один клик.
                    </p>
                  </div>
                </div>
              );
            })() : (
              
              // B: PLAYLISTS INDEX MAIN LIST
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Списки воспроизведения (Playlists)</h3>
                    <p className="text-xs text-zinc-500 font-mono">Группируйте понравившиеся арты по категориям, франшизам или авторам</p>
                  </div>

                  <button
                    onClick={() => setShowCreatePlaylist(!showCreatePlaylist)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Создать новый список</span>
                  </button>
                </div>

                {/* Inline form overlay for playlist creation */}
                {showCreatePlaylist && (
                  <form onSubmit={handleCreatePlaylistSubmit} className="bg-[#0b0d13] border border-zinc-800 p-5 rounded-2xl max-w-xl space-y-4 animate-fadeIn select-none">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono tracking-widest text-zinc-400 block uppercase font-bold">Название плейлиста</label>
                      <input 
                        type="text" 
                        value={plName}
                        onChange={(e) => setPlName(e.target.value)}
                        placeholder="Например: Избранные арты Vocaloid"
                        className="w-full bg-black/40 border border-zinc-800 focus:border-violet-500 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono tracking-widest text-zinc-400 block uppercase font-bold">Описание / Особенности</label>
                      <textarea 
                        value={plDesc}
                        onChange={(e) => setPlDesc(e.target.value)}
                        placeholder="Тут можно указать аннотацию или теги..."
                        rows={3}
                        className="w-full bg-black/40 border border-zinc-800 focus:border-violet-500 rounded-lg px-4 py-2.5 text-xs text-zinc-200 focus:outline-none font-sans"
                      />
                    </div>

                    <div className="flex gap-2.5 pt-1">
                      <button 
                        type="submit" 
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-mono font-bold tracking-wider uppercase cursor-pointer transition shadow"
                      >
                        Создать во фрейме
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowCreatePlaylist(false);
                          setPlName('');
                          setPlDesc('');
                        }}
                        className="px-5 py-2 bg-[#12141a] border border-zinc-850 hover:border-zinc-805 text-zinc-400 hover:text-white rounded-xl text-xs font-mono font-bold tracking-wider uppercase cursor-pointer transition"
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                )}

                {playlists.length === 0 ? (
                  <div className="text-center py-16 px-4 bg-zinc-950/20 border border-dashed border-zinc-850 rounded-xl space-y-4 select-none">
                    <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-500 mx-auto">
                      <Layers className="w-6 h-6 text-zinc-650" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-zinc-500 text-sm font-sans font-semibold">Списки коллекций не созданы</p>
                      <p className="text-xs text-zinc-650 max-w-sm mx-auto font-mono">Создайте свой первый список воспроизведения для группировки любимого контента.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 font-sans select-text">
                    {playlists.map(pl => {
                      // Find first post inside playlist as background image cover
                      const firstPost = pl.postIds.length > 0 ? posts.find(p => p.id === pl.postIds[0]) : null;
                      const displayCover = firstPost ? getPostDisplayUrl(firstPost) : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&h=200&fit=crop';

                      return (
                        <div 
                          key={pl.id}
                          onClick={() => setSelectedPlaylistId(pl.id)}
                          className="group relative h-40 rounded-2xl overflow-hidden border border-zinc-850 hover:border-indigo-500 bg-zinc-950/80 cursor-pointer transition-all shadow-lg flex flex-col justify-end"
                        >
                          <img 
                            src={displayCover} 
                            alt="Playlist cover" 
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover brightness-[0.4] group-hover:scale-103 duration-300 pointer-events-none" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#090a0d] via-black/25 to-transparent pointer-events-none" />
                          
                          {/* Top items badge */}
                          <div className="absolute top-3.5 right-3.5 bg-black/80 text-[10px] font-mono font-bold text-indigo-400 px-2 py-0.6 rounded-full border border-indigo-950/60 z-10 flex items-center gap-1">
                            <PlayCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{pl.postIds.length} файлов</span>
                          </div>

                          <div className="p-4 relative z-10 space-y-1 select-text">
                            <h4 className="text-sm font-black text-white uppercase tracking-tight group-hover:text-indigo-300 transition duration-150 truncate">
                              {pl.name}
                            </h4>
                            <p className="text-xs text-zinc-400 line-clamp-1 truncate leading-normal pr-5">
                              {pl.description || 'Нет описания.'}
                            </p>
                            <p className="text-[9px] font-mono text-zinc-550 pt-0.5">ID: {pl.id.toUpperCase()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================
            FAVORITE TAGS SUB-TAB (LIST VIEW) 
            ========================================= */}
        {profileTab === 'tags' && (
          <div className="space-y-6 animate-fadeIn select-text">
            <div className="space-y-1 border-b border-zinc-900 pb-3">
              <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Heart className="w-4.5 h-4.5 fill-rose-500 text-rose-500" />
                <span>Мои любимые теги ({followedTags.length})</span>
              </h3>
              <p className="text-xs text-zinc-500">
                Работы с этими тегами будут выделяться в ленте, а также вы можете быстро отфильтровать галерею, кликнув по тегу.
              </p>
            </div>

            {followedTags.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {followedTags.map((tagName) => {
                  return (
                    <div 
                      key={tagName} 
                      className="flex items-center gap-1.5 bg-[#0e0f14] border border-zinc-850 py-1.5 pl-3 pr-2 rounded-xl transition hover:border-[#383f52]"
                    >
                      <button
                        onClick={() => onSearchTag && onSearchTag(tagName)}
                        className="text-xs font-medium font-sans text-violet-400 hover:text-violet-350 hover:underline cursor-pointer"
                        title="Найти публикации с этим тегом"
                      >
                        #{tagName.replace(/_/g, ' ')}
                      </button>

                      <button
                        onClick={() => onToggleFollowTag && onToggleFollowTag(tagName)}
                        className="p-1 rounded-lg text-zinc-650 hover:text-rose-500 hover:bg-rose-950/20 max-h-7 max-w-7 flex items-center justify-center transition cursor-pointer"
                        title="Убрать из любимых"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-[#090a0d] border border-zinc-900 rounded-xl space-y-2">
                <Heart className="w-8 h-8 text-zinc-750 mx-auto opacity-40" />
                <p className="text-xs text-zinc-500 max-w-sm mx-auto font-sans">
                  У вас пока нет любимых тегов. Чтобы добавить тег в любимые, откройте любой пост и нажмите на иконку сердечка рядом с нужным тегом в левой колонке свойств.
                </p>
              </div>
            )}
          </div>
        )}

        {/* =========================================
            SETTINGS TAB (EDIT DETAILS & PASSWORDS) 
            ========================================= */}
        {profileTab === 'settings' && (
          <div className="space-y-8 max-w-2xl select-none animate-fadeIn">
            
            <div className="space-y-1 border-b border-zinc-900 pb-3.5 select-none">
              <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-indigo-400 animate-spin-slow" />
                <span>Настройки вашей учетной записи</span>
              </h3>
              <p className="text-xs text-zinc-500 font-mono">Управление учетными данными, аватаром и параметрами безопасности</p>
            </div>

            <div className="space-y-6">
              
              {/* Avatar & Profile Banner upload widgets inline details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#0a0a0f] border border-zinc-850 p-4 rounded-xl">
                <div>
                  <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-zinc-400 block pb-1">Аватарка</span>
                  <div className="flex items-center gap-3 mt-1.5">
                    <img src={avatarUrl} className="w-12 h-12 object-cover rounded-lg border border-zinc-800 shrink-0" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingFile !== null}
                      className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-violet-500 text-zinc-200 hover:text-white rounded-lg text-[10px] uppercase font-bold font-mono tracking-wider cursor-pointer transition flex items-center gap-1.5"
                    >
                      {isUploadingFile === 'avatar' ? 'Загрузка...' : 'Загрузить новый'}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-zinc-400 block pb-1">Баннер профиля</span>
                  <div className="flex items-center gap-3 mt-1.5">
                    <img src={backgroundUrl} className="w-14 h-9 object-cover rounded border border-zinc-800 shrink-0" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => bgInputRef.current?.click()}
                      disabled={isUploadingFile !== null}
                      className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-violet-500 text-zinc-200 hover:text-white rounded-lg text-[10px] uppercase font-bold font-mono tracking-wider cursor-pointer transition flex items-center gap-1.5"
                    >
                      {isUploadingFile === 'bg' ? 'Загрузка...' : 'Загрузить фон'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid 1: Nickname & Username Customization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Nickname */}
                <div className="space-y-1.5 bg-[#0a0a0f] border border-zinc-900 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <label className="text-[10px] font-mono tracking-widest text-zinc-500 block uppercase font-bold">Отображаемый Никнейм</label>
                    <input 
                      type="text" 
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder={currentUsername}
                      className="w-full bg-black/40 border border-zinc-850 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-zinc-250 mt-1.5 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdateNickname}
                    className="mt-3.5 self-start px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-mono text-[10px] font-bold tracking-wider uppercase cursor-pointer transition shadow"
                  >
                    Обновить Nickname
                  </button>
                </div>

                {/* System Handle */}
                <div className="space-y-1.5 bg-[#0a0a0f] border border-zinc-900 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <label className="text-[10px] font-mono tracking-widest text-zinc-500 block uppercase font-bold">Системное Имя Пользователя</label>
                    <input 
                      type="text" 
                      defaultValue={currentUsername}
                      disabled
                      className="w-full bg-black/20 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-500 mt-1.5 focus:outline-none select-all opacity-80"
                    />
                  </div>
                  <span className="text-[9.5px] font-mono text-zinc-650">Задается при первой регистрации.</span>
                </div>
              </div>

              {/* Grid 2: About / Description & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bio Description */}
                <div className="space-y-1.5 bg-[#0a0a0f] border border-zinc-900 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <label className="text-[10px] font-mono tracking-widest text-zinc-500 block uppercase font-bold">О себе / Описание</label>
                    <textarea 
                      rows={2}
                      value={userDesc}
                      onChange={(e) => setUserDesc(e.target.value)}
                      className="w-full bg-black/40 border border-zinc-850 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-zinc-250 mt-1.5 focus:outline-none resize-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdateDesc}
                    className="mt-2.5 self-start px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-mono text-[10px] font-bold tracking-wider uppercase cursor-pointer transition shadow"
                  >
                    Обновить описание
                  </button>
                </div>

                {/* Contact Email */}
                <div className="space-y-1.5 bg-[#0a0a0f] border border-zinc-900 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <label className="text-[10px] font-mono tracking-widest text-zinc-500 block uppercase font-bold">Контактный Email</label>
                    <input 
                      type="email" 
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="w-full bg-black/40 border border-zinc-850 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-zinc-250 mt-1.5 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdateEmail}
                    className="mt-2.5 self-start px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-mono text-[10px] font-bold tracking-wider uppercase cursor-pointer transition shadow"
                  >
                    Сохранить Email
                  </button>
                </div>
              </div>

              {/* Grid 3: Security & Passwords */}
              <div className="bg-[#0a0a0f] border border-zinc-900 rounded-xl p-4.5 space-y-3.5">
                <h4 className="text-xs font-bold text-zinc-400 font-mono uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  Сменить пароль учетной записи
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9.5px] font-mono tracking-wider text-zinc-500 uppercase block font-medium">Новый пароль</span>
                    <input 
                      type="password"
                      value={setNewPasswordVal}
                      onChange={(e) => setSetNewPasswordVal(e.target.value)}
                      placeholder="••••"
                      className="w-full bg-black/40 border border-zinc-850 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-zinc-250 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9.5px] font-mono tracking-wider text-zinc-500 uppercase block font-medium">Подтвердите пароль</span>
                    <input 
                      type="password"
                      value={setNewVerifyVal}
                      onChange={(e) => setSetNewVerifyVal(e.target.value)}
                      placeholder="••••"
                      className="w-full bg-black/40 border border-zinc-850 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-zinc-250 focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  className="px-3.5 py-1.5 bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 hover:border-violet-500 text-zinc-300 hover:text-white rounded font-mono text-[10px] font-bold tracking-wider uppercase cursor-pointer transition flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                  Применить изменения пароля
                </button>
              </div>

              {/* Row 4: Git-Tracked JSON Storage with Automatic Sync */}
              <div className="bg-[#0b0c10] border border-zinc-900 rounded-xl p-5 space-y-4 shadow-xl">
                <div className="flex items-start justify-between border-b border-zinc-900 pb-3">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-zinc-200 tracking-tight flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      Бессерверное JSON-хранилище с авто-синхронизацией
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-mono">Абсолютный контроль локального рабочего места без сторонних СУБД</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 text-[9px] font-mono font-bold tracking-wider rounded uppercase">
                    Активно
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                  По вашему требованию все базы данных SQL были полностью устранены. Данные галереи, комментариев и метатегов записываются в файл репозитория (<code className="bg-zinc-950 px-1 py-0.5 rounded font-mono text-emerald-400 text-[10px]">database.json</code>), а графические обложки и снимки сохраняются в папку <code className="bg-zinc-950 px-1 py-0.5 rounded font-mono text-rose-400 text-[10px]">/media</code>. Синхронизация с вашим привязанным GitHub-репозиторием происходит полностью автоматически силами платформы без настройки токенов вручную.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1.5">
                  <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-lg space-y-1.5">
                    <span className="text-[9px] font-mono tracking-wider text-zinc-500 uppercase block">Учетные записи & Карточки</span>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-zinc-200">database.json</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-450 block">Размер хранилища: {(gitStatus.dbSize / 1024).toFixed(1)} КБ</span>
                  </div>

                  <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-lg space-y-1.5">
                    <span className="text-[9px] font-mono tracking-wider text-zinc-500 uppercase block">Интегрированная папка Media</span>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs font-bold text-zinc-200">/media</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-455 block">Медиафайлов загружено: {gitStatus.mediaFilesCount} шт.</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-900/60 font-mono">
                  <span className="text-[9.5px] tracking-wider text-zinc-500 uppercase block">Состояние репозитория:</span>
                  
                  {gitStatus.loading ? (
                    <div className="text-[11px] text-zinc-500 italic py-1">Анализ репозитория...</div>
                  ) : gitStatus.statusLines && gitStatus.statusLines.length > 0 ? (
                    <div className="bg-black/80 border border-zinc-900 rounded-lg p-2.5 max-h-[140px] overflow-y-auto space-y-1 font-mono text-[10.5px] text-zinc-350 leading-relaxed select-text">
                      {gitStatus.statusLines.map((line, idx) => (
                        <div key={idx} className="truncate">
                          <span className={line.startsWith(' M') || line.startsWith('M ') ? 'text-blue-400' : 'text-emerald-400'}>
                            {line.slice(0, 2)}
                          </span>
                          <span>{line.slice(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-zinc-950/25 border border-zinc-900 rounded-lg text-[10px] text-zinc-500 italic">
                      ✓ Все файлы и база данных database.json полностью соответствуют репозиторию и готовы к фоновой синхронизации.
                    </div>
                  )}
                </div>

                <div className="p-3 bg-emerald-950/10 border border-emerald-900/25 rounded-lg">
                  <span className="text-[9.5px] font-mono text-emerald-400 uppercase font-bold block pb-1">Автоматическая синхронизация активна</span>
                  <p className="text-[10.5px] text-zinc-400 font-sans leading-relaxed">
                    Все ваши новые медиа, комментарии, голоса и свойства пишутся напрямую в файлы вашего веб-проекта. Выгрузка в ваш привязанный репозиторий GitHub происходит автоматически на стороне платформы AI Studio и не требует никаких токенов или иных паролей внутри интерфейса приложения.
                  </p>
                </div>
              </div>

              {/* Row 5: Permanently Delete Account danger zone */}
              <div className="bg-red-950/10 border border-red-950/45 p-4 rounded-xl space-y-3 select-none">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-red-400 font-mono uppercase tracking-wider">Опасная зона • Удаление учетной записи</h4>
                  <p className="text-[11px] text-zinc-400 font-sans">
                    Please be aware that account deletion is permanent and cannot be undone. Все ваши настройки, аватары и учетные связи будут стерты навсегда из этого веб-сеанса.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white font-mono text-[10px] font-bold rounded-lg tracking-wider uppercase transition cursor-pointer shadow flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Удалить аккаунт навсегда</span>
                </button>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
};
