import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from '@/context/socket-context';
import { useToast } from '@/context/toast-context';
import { useUserStore } from '@/store/userStore';
import { useAudio, useAudioStore } from '@/store/audioStore';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { PiArrowFatLineUpFill } from "react-icons/pi";
import { LuArrowBigUpDash } from "react-icons/lu";
import { Link, Plus, Loader2, MessageCircle, X } from 'lucide-react';
import { Chat } from './Chat';
import { 
  PlayIcon, 
  DeleteIcon, 
  NextIcon,
  UsersIcon,
  TimeIcon,
  PlayListIcon,
  SearchIcon
} from '@/components/icons';
import { inter, outfit, manrope, spaceGrotesk } from '@/lib/font';
import axios from 'axios';

// Spotify Logo Component
const SpotifyLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg 
    className={className}
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.959-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.361 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.840c.361.181.48.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.301.421-1.02.599-1.559.3z"/>
  </svg>
);

interface QueueItem {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  smallImg: string;
  bigImg: string;
  url: string;
  type: 'Youtube' | 'Spotify';
  voteCount: number;
  createAt?: string;
  addedByUser: {
    id: string;
    username: string;
  };
  upvotes: Array<{
    userId: string;
  }>;
  spotifyId?: string;
  spotifyUrl?: string;
  youtubeId?: string;
  youtubeUrl?: string;
}

interface QueueManagerProps {
  spaceId: string;
  isAdmin?: boolean;
}

const PlayingAnimation = () => {
  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-xl flex items-center justify-center">
      <div className="flex items-center space-x-1">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="w-1 bg-blue-400 rounded-full"
            animate={{
              height: [4, 16, 8, 20, 4],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Floating heart/upvote particles animation
const FloatingParticles = ({ trigger }: { trigger: boolean }) => {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    delay: i * 0.1,
    angle: (i * 45) * (Math.PI / 180), // Convert to radians
  }));

  if (!trigger) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute top-1/2 left-1/2 text-blue-400"
          initial={{ 
            opacity: 0, 
            scale: 0, 
            x: -8, 
            y: -8,
            rotate: 0 
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0.8],
            x: Math.cos(particle.angle) * 30 - 8,
            y: Math.sin(particle.angle) * 30 - 8,
            rotate: 360,
          }}
          transition={{
            duration: 1.2,
            delay: particle.delay,
            ease: "easeOut"
          }}
        >
          <PiArrowFatLineUpFill size={12} />
        </motion.div>
      ))}
    </div>
  );
};

// Ripple effect animation
const RippleEffect = ({ trigger }: { trigger: boolean }) => {
  if (!trigger) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
      {[0, 0.2, 0.4].map((delay, index) => (
        <motion.div
          key={index}
          className="absolute inset-0 border-2 border-blue-400/50 rounded-xl"
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{
            duration: 0.8,
            delay,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );
};

const UpvoteButton = ({ 
  onClick, 
  isVoted = false,
  voteCount = 0
}: { 
  onClick: (e?: any) => void;
  isVoted?: boolean;
  voteCount?: number;
}) => {
  const [animationTrigger, setAnimationTrigger] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Simple click handler that works on both desktop and mobile
  const handleVoteClick = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Trigger particle animation
    setAnimationTrigger(true);
    setShowSuccess(true);
    
    // Reset animation trigger
    setTimeout(() => setAnimationTrigger(false), 1200);
    setTimeout(() => setShowSuccess(false), 2000);
    
    onClick(e);
  };
  
  return (
    <motion.div className="relative">
      {/* Success message */}
      <AnimatePresence>
        {showSuccess && !isVoted && (
          <motion.div
            className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-xs font-bold backdrop-blur-xl border border-green-500/30 shadow-lg z-10"
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            Upvoted! 🎵
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={handleVoteClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        style={{ touchAction: 'manipulation' }}
        className={`relative flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all duration-300 backdrop-blur-xl border-2 shadow-xl overflow-hidden min-w-[44px] min-h-[44px] ${outfit.className} font-medium ${
          isVoted 
            ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/30' 
            : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/15 hover:border-white/30 hover:text-white hover:shadow-2xl hover:ring-1 hover:ring-white/20'
        }`}
      >
        {/* Ripple effect */}
        <RippleEffect trigger={animationTrigger} />
        
        {/* Floating particles */}
        <FloatingParticles trigger={animationTrigger} />
        
        {/* Glow effect when clicked */}
        <AnimatePresence>
          {animationTrigger && (
            <motion.div
              className="absolute inset-0 bg-blue-400/20 rounded-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          )}
        </AnimatePresence>

        {/* Icon with enhanced animation */}
        <motion.div
          animate={
            isVoted 
              ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } 
              : animationTrigger 
                ? { scale: [1, 1.4, 1], rotate: [0, 15, 0] }
                : {}
          }
          transition={{ duration: isVoted ? 0.4 : 0.6, ease: "easeOut" }}
          className="flex items-center justify-center relative z-10"
          style={{ minWidth: '16px', minHeight: '16px' }}
        >
          {isVoted ? (
            <motion.div
              animate={{ 
                filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"],
              }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              <PiArrowFatLineUpFill 
                size={14} 
                className="sm:w-4 sm:h-4 text-blue-400"
                style={{ color: '#60a5fa', display: 'block' }} 
              />
            </motion.div>
          ) : (
            <LuArrowBigUpDash 
              size={14} 
              className="sm:w-4 sm:h-4 text-gray-300"
              style={{ color: 'currentColor', display: 'block' }} 
            />
          )}
        </motion.div>

        {/* Vote count with enhanced animation */}
        <motion.span 
          className="font-bold text-xs sm:text-sm relative z-10"
          animate={
            isVoted 
              ? { scale: [1, 1.2, 1], color: ["#60a5fa", "#93c5fd", "#60a5fa"] } 
              : animationTrigger 
                ? { scale: [1, 1.3, 1] }
                : {}
          }
          transition={{ duration: isVoted ? 0.4 : 0.6 }}
        >
          {voteCount}
        </motion.span>

        {/* Sparkle effect */}
        <AnimatePresence>
          {animationTrigger && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-blue-400 rounded-full"
                  style={{
                    top: `${20 + Math.random() * 60}%`,
                    left: `${20 + Math.random() * 60}%`,
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    rotate: 360
                  }}
                  transition={{
                    duration: 1,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
};

const SongCard = ({ 
  item, 
  index, 
  isCurrentlyPlaying, 
  isAdmin, 
  hasUserVoted,
  onVote, 
  onRemove, 
  onPlayInstant 
}: {
  item: QueueItem;
  index: number;
  isCurrentlyPlaying: boolean;
  isAdmin: boolean;
  hasUserVoted: boolean;
  onVote: () => void;
  onRemove: () => void;
  onPlayInstant: () => void;
}) => {
  // Simple click handlers that work on both desktop and mobile
  const handleCardClick = (e: any) => {
    if (!isCurrentlyPlaying && isAdmin) {
      e.preventDefault();
      e.stopPropagation();
      onPlayInstant();
    }
  };

  const handleRemoveClick = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ 
        layout: { duration: 0.8, ease: [0.23, 1, 0.32, 1] },
        opacity: { duration: 0.4 },
        y: { duration: 0.4 }
      }}
      className="group"
    >
      <Card
        onClick={handleCardClick}
        className={`transition-all duration-500 backdrop-blur-xl shadow-xl w-full max-w-full queue-card ${
          isCurrentlyPlaying 
            ? 'border-blue-500/40 bg-blue-900/20 shadow-2xl shadow-blue-500/25 ring-1 ring-blue-500/20' 
            : isAdmin 
              ? 'bg-[#1C1E1F] cursor-pointer hover:shadow-2xl hover:shadow-black/30 hover:ring-white/10'
              : 'bg-[#1C1E1F] cursor-not-allowed opacity-75'
        }`}
        role={!isCurrentlyPlaying && isAdmin ? "button" : undefined}
        tabIndex={!isCurrentlyPlaying && isAdmin ? 0 : undefined}
        title={
          !isCurrentlyPlaying 
            ? (isAdmin ? "Click to play instantly (Admin only)" : "Play instantly (Admin only)")
            : undefined
        }
      >
        <CardContent className="p-2 sm:p-3 w-full max-w-full">
          <div className="flex items-center space-x-3 sm:space-x-4 w-full max-w-full min-w-0">
      
            
            <motion.div 
              className="relative flex-shrink-0"
              layout
              transition={{ duration: 0.6 }}
            >
              <motion.img 
                src={item.smallImg} 
                alt={item.title}
                className={`rounded-xl object-cover shadow-2xl ${
                  isCurrentlyPlaying ? 'w-12 h-12 sm:w-16 sm:h-16' : 'w-12 h-12 sm:w-16 sm:h-16'
                }`}
                whileHover={!isCurrentlyPlaying ? { scale: 1.05 } : {}}
                transition={{ duration: 0.3 }}
              />
              {isCurrentlyPlaying && <PlayingAnimation />}
            </motion.div>
            
            <motion.div 
              className="flex-1 min-w-0 max-w-full overflow-hidden" 
              layout
              transition={{ duration: 0.6 }}
            >
              <motion.h4 
                className={`font-semibold text-white truncate w-full queue-text ${
                  isCurrentlyPlaying ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
                }`}
                layout
              >
                {item.title}
              </motion.h4>
              {item.artist && (
                <motion.p 
                  className="text-xs sm:text-sm text-gray-400 truncate w-full queue-text"
                  layout
                >
                  {item.artist}
                </motion.p>
              )}
             
            </motion.div>
            
            <motion.div 
              className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0"
              layout
              transition={{ duration: 0.6 }}
            >
              {!isCurrentlyPlaying && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                >
                  <UpvoteButton
                    onClick={onVote}
                    isVoted={hasUserVoted}
                    voteCount={item.voteCount}
                  />
                </motion.div>
              )}
              
              {isAdmin && (
                <motion.div
                  initial={{ opacity: 1, scale: 1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    size="sm"
                    onClick={handleRemoveClick}
                    className={`px-2 sm:px-3 py-1.5 sm:py-2 bg-red-500/20 hover:bg-red-500/30 border-2 border-red-500/30 hover:border-red-500/50 backdrop-blur-xl shadow-xl ring-1 ring-red-500/20 hover:ring-red-500/30 min-w-[44px] min-h-[44px] flex items-center justify-center ${outfit.className} font-medium`}
                  >
                    <div className="text-current">
                      <DeleteIcon width={12} height={12} className="sm:w-3.5 sm:h-3.5" />
                    </div>
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const QueueManager: React.FC<QueueManagerProps> = ({ spaceId, isAdmin = false }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentPlaying, setCurrentPlaying] = useState<QueueItem | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [showChatOverlay, setShowChatOverlay] = useState(false);
  
  // New state for direct link and playlist features
  const [directUrl, setDirectUrl] = useState('');
  const [isAddingDirectUrl, setIsAddingDirectUrl] = useState(false);
  const [showDirectUrlDialog, setShowDirectUrlDialog] = useState(false);
  
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [isProcessingPlaylist, setIsProcessingPlaylist] = useState(false);
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);
  const [playlistProgress, setPlaylistProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
    currentTrack: string;
    status: string;
  } | null>(null);
  
  const { sendMessage, socket } = useSocket();
  const { user, isAdmin: userIsAdmin } = useUserStore();
  const { voteOnSong, addToQueue, play, currentSong: audioCurrentSong } = useAudio();
  const { showToast } = useToast();

  // Use admin status from user store, fallback to prop for backward compatibility
  const adminStatus = userIsAdmin || isAdmin;

  const sortedQueue = useMemo(() => {
    return [...queue].sort((a, b) => {
      if (b.voteCount !== a.voteCount) {
        return b.voteCount - a.voteCount;
      }
      
      return new Date(a.createAt || 0).getTime() - new Date(b.createAt || 0).getTime();
    });
  }, [queue]);

  const cleanUrl = (url: string): string => {
    if (!url) return '';
    
    let cleanedUrl = url.trim();
    if (cleanedUrl.startsWith('"') && cleanedUrl.endsWith('"')) {
      cleanedUrl = cleanedUrl.slice(1, -1);
    }
    if (cleanedUrl.startsWith("'") && cleanedUrl.endsWith("'")) {
      cleanedUrl = cleanedUrl.slice(1, -1);
    }
    
    return cleanedUrl;
  };

  const extractYouTubeVideoId = (url: string): string => {
    if (!url) return '';
    
    const cleanedUrl = cleanUrl(url);
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = cleanedUrl.match(regExp);
    
    if (match && match[7].length === 11) {
      return match[7];
    }
    
    if (cleanedUrl.length === 11 && /^[a-zA-Z0-9_-]+$/.test(cleanedUrl)) {
      return cleanedUrl;
    }
    
    console.warn('Could not extract YouTube video ID from:', cleanedUrl);
    return cleanedUrl;
  };

  useEffect(() => {
    if (!socket) {
      setConnectionStatus('disconnected');
      return;
    }

    const updateConnectionStatus = () => {
      switch (socket.readyState) {
        case WebSocket.CONNECTING:
          setConnectionStatus('connecting');
          break;
        case WebSocket.OPEN:
          setConnectionStatus('connected');
          break;
        case WebSocket.CLOSING:
        case WebSocket.CLOSED:
          setConnectionStatus('disconnected');
          break;
        default:
          setConnectionStatus('disconnected');
      }
    };

    updateConnectionStatus();

    const handleOpen = () => setConnectionStatus('connected');
    const handleClose = () => setConnectionStatus('disconnected');
    const handleError = () => setConnectionStatus('disconnected');

    socket.addEventListener('open', handleOpen);
    socket.addEventListener('close', handleClose);
    socket.addEventListener('error', handleError);

    return () => {
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('close', handleClose);
      socket.removeEventListener('error', handleError);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, data } = JSON.parse(event.data);
      console.log('QueueManager received message:', { type, data });
      
      switch (type) {
        case 'queue-update':
          console.log('Queue update received:', data.queue);
          setQueue(data.queue || []);
          break;
        case 'current-song-update':
          console.log('Current song update:', data.song);
          setCurrentPlaying(data.song || null);
          
          if (data.song) {
            console.log('Starting playback of new current song:', data.song.title);
            
            const isSameSong = audioCurrentSong?.id === data.song.id;
            const { isPlaying } = useAudioStore.getState();
            
            if (isSameSong && isPlaying) {
              console.log('Same song already playing, skipping playback restart');
              
              const { pendingSync } = useAudioStore.getState();
              if (pendingSync) {
                console.log('Applying pending sync for existing song');
                const { handleRoomSync } = useAudioStore.getState();
                const youtubeVideoId = extractYouTubeVideoId(data.song.youtubeUrl || data.song.url);
                const existingAudioSong = {
                  id: data.song.id,
                  name: data.song.title,
                  url: cleanUrl(data.song.youtubeUrl || data.song.url),
                  artistes: {
                    primary: [{
                      id: 'unknown',
                      name: data.song.artist || 'Unknown Artist',
                      role: 'primary_artist',
                      image: [] as any,
                      type: 'artist' as const,
                      url: ''
                    }]
                  },
                  image: [
                    { quality: 'high', url: cleanUrl(data.song.bigImg || data.song.smallImg || '') },
                    { quality: 'medium', url: cleanUrl(data.song.smallImg || data.song.bigImg || '') }
                  ],
                  addedBy: data.song.addedByUser?.username || 'Unknown',
                  downloadUrl: youtubeVideoId ? 
                    [{ quality: 'auto', url: youtubeVideoId }] : 
                    [{ quality: 'auto', url: cleanUrl(data.song.url) }],
                  addedByUser: data.song.addedByUser,
                  voteCount: data.song.voteCount || 0,
                  isVoted: false,
                  source: data.song.type === 'Youtube' ? 'youtube' as const : undefined,
                  video: true
                };
                setTimeout(() => {
                  handleRoomSync(pendingSync.timestamp, pendingSync.isPlaying, existingAudioSong, true);
                }, 500);
              }
              break;
            }
            
            const youtubeVideoId = extractYouTubeVideoId(data.song.youtubeUrl || data.song.url);
            
            const audioSong: any = {
              id: data.song.id,
              name: data.song.title,
              url: cleanUrl(data.song.youtubeUrl || data.song.url),
              artistes: {
                primary: [{
                  id: 'unknown',
                  name: data.song.artist || 'Unknown Artist',
                  role: 'primary_artist',
                  image: [] as any,
                  type: 'artist' as const,
                  url: ''
                }]
              },
              image: [
                { quality: 'high', url: cleanUrl(data.song.bigImg || data.song.smallImg || '') },
                { quality: 'medium', url: cleanUrl(data.song.smallImg || data.song.bigImg || '') }
              ],
              addedBy: data.song.addedByUser?.username || 'Unknown',
              downloadUrl: youtubeVideoId ? 
                [{ quality: 'auto', url: youtubeVideoId }] : 
                [{ quality: 'auto', url: cleanUrl(data.song.url) }],
              addedByUser: data.song.addedByUser,
              voteCount: data.song.voteCount || 0,
              isVoted: false,
              source: data.song.type === 'Youtube' ? 'youtube' as const : undefined,
              video: true
            };
            
            play(audioSong);
            
            setTimeout(() => {
              const { pendingSync, youtubePlayer } = useAudioStore.getState();
              if (pendingSync) {
                console.log('Applying pending sync after song load for new user');
                
                if (youtubePlayer && youtubePlayer.seekTo) {
                  console.log('YouTube player ready, applying sync directly');
                  youtubePlayer.seekTo(pendingSync.timestamp, true);
                  if (pendingSync.isPlaying) {
                    youtubePlayer.playVideo();
                  } else {
                    youtubePlayer.pauseVideo();
                  }
                  const { handleRoomSync } = useAudioStore.getState();
                  handleRoomSync(pendingSync.timestamp, pendingSync.isPlaying, audioSong, true);
                } else {
                  console.log('YouTube player not ready yet, pending sync will be applied when ready');
                }
              }
            }, 1500);
          } else {
            console.log('No current song to play');
          }
          break;
        case 'song-added':
          console.log('Song added to queue:', data.song);
          setQueue(prev => {
            const newQueue = [...prev, data.song];
            console.log('Updated queue length:', newQueue.length);
            return newQueue;
          });
          break;
        case 'vote-updated':
          console.log('Vote updated:', { streamId: data.streamId, voteCount: data.voteCount });
          setQueue(prev => prev.map(item => 
            item.id === data.streamId 
              ? { ...item, voteCount: data.voteCount, upvotes: data.upvotes }
              : item
          ));
          break;
      }
    };

    socket.addEventListener('message', handleMessage);
    
    console.log('Requesting initial queue for space:', spaceId);
    sendMessage('get-queue', { spaceId });

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, sendMessage, spaceId, currentPlaying, adminStatus]);

  const handleVote = (streamId: string) => {
    const item = queue.find(q => q.id === streamId);
    const hasVoted = item?.upvotes?.some(vote => vote.userId === user?.id) || false;
    
    console.log('Vote action:', { 
      streamId, 
      hasVoted, 
      action: hasVoted ? 'downvote' : 'upvote',
      userId: user?.id,
      currentUpvotes: item?.upvotes 
    });
    
    if (hasVoted) {
      voteOnSong(streamId, 'downvote');
    } else {
      voteOnSong(streamId, 'upvote');
    }
  };

  const handlePlayInstant = (songId: string) => {
    if (!adminStatus) {
      console.log('[QueueManager] Play instant action denied - user is not admin');
      return;
    }
    console.log('[QueueManager] Admin playing song instantly:', songId);
    sendMessage("play-instant", { spaceId, songId });
  };

  const handlePlayNext = () => {
    if (!adminStatus) return;
    console.log('Admin playing next song for space:', spaceId);
    sendMessage('play-next', { spaceId });
  };

  const handleRemoveSong = (streamId: string) => {
    if (!adminStatus) return;
    console.log('Admin removing song:', streamId);
    sendMessage('remove-song', { spaceId, streamId });
  }

  const handleEmptyQueue = () => {
    if (!adminStatus) return;
    console.log('Admin emptying queue for space:', spaceId);
    sendMessage('empty-queue', { spaceId });
  };

  const hasUserVoted = (item: QueueItem) => {
    const voted = item.upvotes?.some(vote => vote.userId === user?.id) || false;
    console.log('hasUserVoted check:', { 
      songId: item.id, 
      songTitle: item.title,
      voted, 
      userId: user?.id, 
      upvotes: item.upvotes 
    });
    return voted;
  };

  // Direct URL/Link adding functionality
  const isValidYouTubeUrl = (url: string): boolean => {
    const patterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]{11}/,
      /^[a-zA-Z0-9_-]{11}$/ // Direct video ID
    ];
    return patterns.some(pattern => pattern.test(url.trim()));
  };

  const isValidSpotifyUrl = (url: string): boolean => {
    const patterns = [
      /^(https?:\/\/)?(open\.)?spotify\.com\/track\/[a-zA-Z0-9]+/,
      /^spotify:track:[a-zA-Z0-9]+$/
    ];
    return patterns.some(pattern => pattern.test(url.trim()));
  };

  const handleAddDirectUrl = async () => {
    if (!directUrl.trim()) return;
    if (!adminStatus) {
      console.log('[QueueManager] Direct URL add denied - user is not admin');
      return;
    }

    setIsAddingDirectUrl(true);
    try {
      const trimmedUrl = directUrl.trim();
      
      if (isValidYouTubeUrl(trimmedUrl) || isValidSpotifyUrl(trimmedUrl)) {
        console.log('[QueueManager] Adding direct URL:', trimmedUrl);
        
        const success = sendMessage('add-to-queue', {
          spaceId,
          url: trimmedUrl,
          userId: user?.id,
          autoPlay: false
        });

        if (success) {
          console.log('✅ Direct URL sent for processing');
          showToast('Link added to queue successfully!', 'success');
          setDirectUrl('');
          setShowDirectUrlDialog(false);
        } else {
          throw new Error('Failed to send URL to server');
        }
      } else {
        throw new Error('Invalid URL format. Please provide a valid YouTube or Spotify link.');
      }
    } catch (error: any) {
      console.error('Error adding direct URL:', error);
      showToast(error.message || 'Failed to add link', 'error');
    } finally {
      setIsAddingDirectUrl(false);
    }
  };

  // Spotify Playlist processing functionality
  const isValidSpotifyPlaylistUrl = (url: string): boolean => {
    const patterns = [
      /^(https?:\/\/)?(open\.)?spotify\.com\/playlist\/[a-zA-Z0-9]+/,
      /^spotify:playlist:[a-zA-Z0-9]+$/,
      /^[a-zA-Z0-9]+$/ // Direct playlist ID
    ];
    return patterns.some(pattern => pattern.test(url.trim()));
  };

  const handleProcessSpotifyPlaylist = async () => {
    if (!playlistUrl.trim()) return;
    if (!adminStatus) {
      console.log('[QueueManager] Playlist processing denied - user is not admin');
      return;
    }

    setIsProcessingPlaylist(true);
    setPlaylistProgress({ current: 0, total: 0, percentage: 0, currentTrack: '', status: 'Initializing...' });

    try {
      const trimmedUrl = playlistUrl.trim();
      
      if (!isValidSpotifyPlaylistUrl(trimmedUrl)) {
        throw new Error('Invalid Spotify playlist URL. Please provide a valid Spotify playlist link.');
      }

      console.log('[QueueManager] Processing Spotify playlist:', trimmedUrl);
      
      // Step 1: Get playlist tracks
      setPlaylistProgress(prev => prev ? { ...prev, status: 'Fetching playlist tracks...' } : null);
      
      const response = await axios.get(`/api/spotify/playlist?url=${encodeURIComponent(trimmedUrl)}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch playlist');
      }

      const tracks = response.data.data.tracks;
      console.log(`Retrieved ${tracks.length} tracks from playlist`);

      if (tracks.length === 0) {
        throw new Error('No tracks found in playlist');
      }

      // Step 2: Convert tracks to simplified format for backend worker pool processing
      setPlaylistProgress(prev => prev ? { 
        ...prev, 
        total: tracks.length, 
        status: 'Preparing tracks for worker pool processing...' 
      } : null);

      const songsForBatch = tracks.map((track: any, index: number) => ({
        // Send minimal data - let backend worker pool handle YouTube search
        title: track.name,
        artist: track.artists.map((a: any) => a.name).join(', '),
        album: track.album.name,
        spotifyId: track.id,
        spotifyUrl: `https://open.spotify.com/track/${track.id}`,
        smallImg: track.album.images?.[track.album.images.length - 1]?.url || '',
        bigImg: track.album.images?.[0]?.url || '',
        duration: track.duration_ms,
        source: 'Spotify' // Source is Spotify, backend will convert to YouTube
      }));

      // Step 3: Send batch request with worker pool processing
      setPlaylistProgress(prev => prev ? { 
        ...prev, 
        status: 'Sending to optimized processing system...' 
      } : null);

      const success = sendMessage('add-batch-to-queue', {
        spaceId,
        songs: songsForBatch,
        userId: user?.id,
        autoPlay: false
      });

      if (success) {
        console.log(`✅ Playlist batch sent: ${songsForBatch.length} tracks`);
        setPlaylistProgress(prev => prev ? { 
          ...prev, 
          status: 'Processing playlist with worker pool...',
          percentage: 0
        } : null);
      } else {
        throw new Error('Failed to send playlist to processing system');
      }
      
    } catch (error: any) {
      console.error('Error processing Spotify playlist:', error);
      showToast(error.message || 'Failed to process playlist', 'error');
      setPlaylistProgress(prev => prev ? { 
        ...prev, 
        status: `Error: ${error.message}` 
      } : null);
      setTimeout(() => {
        setIsProcessingPlaylist(false);
        setPlaylistProgress(null);
      }, 3000);
    }
  };

  // Listen for playlist processing progress updates
  useEffect(() => {
    if (!socket || !isProcessingPlaylist) return;

    const handleProgressUpdate = (event: MessageEvent) => {
      const { type, data } = JSON.parse(event.data);
      
      if (type === 'processing-progress') {
        console.log('📊 Playlist processing progress:', data);
        setPlaylistProgress({
          current: data.current || 0,
          total: data.total || 0,
          percentage: data.percentage || 0,
          currentTrack: data.currentTrack || '',
          status: data.status || 'Processing...'
        });
      } else if (type === 'batch-processing-result') {
        console.log('🎉 Playlist processing completed:', data);
        const successCount = data.successful || 0;
        const failedCount = data.failed || 0;
        
        setPlaylistProgress(prev => prev ? {
          ...prev,
          percentage: 100,
          status: `Completed! ${successCount} tracks added successfully.`
        } : null);
        
        // Show success toast
        if (successCount > 0) {
          showToast(
            `Successfully added ${successCount} tracks from playlist!${failedCount > 0 ? ` (${failedCount} failed)` : ''}`, 
            failedCount > 0 ? 'warning' : 'success'
          );
        } else {
          showToast('No tracks were added from the playlist', 'error');
        }
        
        setTimeout(() => {
          setIsProcessingPlaylist(false);
          setPlaylistProgress(null);
          setPlaylistUrl('');
          setShowPlaylistDialog(false);
        }, 2000);
      }
    };

    socket.addEventListener('message', handleProgressUpdate);
    return () => socket.removeEventListener('message', handleProgressUpdate);
  }, [socket, isProcessingPlaylist]);

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full md:w-[32rem] md:max-w-[32rem] flex-shrink-0 queue-container h-[calc(100vh-8rem)] flex flex-col">
      <motion.div 
        className="space-y-4 sm:space-y-6 w-full max-w-full flex flex-col h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 flex-shrink-0"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.div
              whileHover={{ rotate: 5, scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-white">
                <PlayListIcon width={24} height={24} className="sm:w-7 sm:h-7 text-white" />
              </div>
            </motion.div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Music Queue</h2>
          </div>
          
          {/* Admin Action Buttons - Add Direct URL and Playlist */}
          <div className="flex items-center gap-2">
            {/* Chat Button - Available to all users */}
            <Button
              onClick={() => setShowChatOverlay(true)}
              variant="outline"
              size="sm"
              className="bg-cyan-500/20 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 hover:text-cyan-200 transition-all duration-200"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </Button>
            
            {/* Admin Only Buttons */}
            {adminStatus && (
              <>
                {/* Direct URL/Link Button */}
                <Dialog open={showDirectUrlDialog} onOpenChange={setShowDirectUrlDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-green-500/20 border-green-500/30 text-green-300 hover:bg-green-500/30 hover:text-green-200 transition-all duration-200"
                  >
                    <Link className="w-4 h-4 mr-2" />
                    Add Link
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl p-0 max-w-md">
                  <div className="p-8">
                    <DialogHeader className="mb-8">
                      <DialogTitle className={`text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-3 text-center ${spaceGrotesk.className}`}>
                        Add Direct Link
                      </DialogTitle>
                      <p className={`text-white/70 text-base leading-relaxed text-center ${spaceGrotesk.className}`}>
                        Paste a YouTube video or Spotify track URL to add it instantly to the queue
                      </p>
                    </DialogHeader>
                    <div className="space-y-6">
                      <Input
                        value={directUrl}
                        onChange={(e) => setDirectUrl(e.target.value)}
                        placeholder="Paste YouTube video URL or Spotify track URL..."
                        className={`w-full py-3 px-4 bg-white/5 backdrop-blur-sm border border-white/20 hover:bg-white/10 transition-all duration-300 text-white placeholder-white/50 text-base h-12 rounded-xl focus:border-green-400/50 focus:ring-1 focus:ring-green-400/20 ${spaceGrotesk.className}`}
                        disabled={isAddingDirectUrl}
                      />
                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowDirectUrlDialog(false);
                            setDirectUrl('');
                          }}
                          disabled={isAddingDirectUrl}
                          className={`bg-white/5 backdrop-blur-sm border border-white/20 hover:bg-white/10 transition-all duration-300 text-white hover:text-white text-base h-12 rounded-xl px-6 ${spaceGrotesk.className}`}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddDirectUrl}
                          disabled={!directUrl.trim() || isAddingDirectUrl}
                          className={`bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-base h-12 rounded-xl px-6 transition-all duration-300 shadow-lg hover:shadow-green-500/25 ${spaceGrotesk.className}`}
                        >
                          {isAddingDirectUrl && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Add to Queue
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Spotify Playlist Button */}
              <Dialog open={showPlaylistDialog} onOpenChange={setShowPlaylistDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-purple-500/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/30 hover:text-purple-200 transition-all duration-200"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Playlist
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl p-0 max-w-md">
                  <div className="p-8">
                    <DialogHeader className="mb-8">
                      <div className="flex items-center justify-center mb-4">
                        <div className="p-3 bg-green-500/10 rounded-full border border-green-500/20">
                          <SpotifyLogo className="w-8 h-8 text-green-500" />
                        </div>
                      </div>
                      <DialogTitle className={`text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-3 text-center ${spaceGrotesk.className}`}>
                        Add Spotify Playlist
                      </DialogTitle>
                      <p className={`text-white/70 text-base leading-relaxed text-center ${spaceGrotesk.className}`}>
                        Import an entire Spotify playlist to the queue with optimized processing
                      </p>
                    </DialogHeader>
                    <div className="space-y-6">
                      <Input
                        value={playlistUrl}
                        onChange={(e) => setPlaylistUrl(e.target.value)}
                        placeholder="Paste Spotify playlist URL..."
                        className={`w-full py-3 px-4 bg-white/5 backdrop-blur-sm border border-white/20 hover:bg-white/10 transition-all duration-300 text-white placeholder-white/50 text-base h-12 rounded-xl focus:border-green-400/50 focus:ring-1 focus:ring-green-400/20 ${spaceGrotesk.className}`}
                        disabled={isProcessingPlaylist}
                      />
                      
                      {/* Progress Display */}
                      {playlistProgress && (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className={`text-white/80 ${spaceGrotesk.className}`}>{playlistProgress.status}</span>
                            <span className={`text-white/60 ${spaceGrotesk.className}`}>
                              {playlistProgress.total > 0 && 
                                `${playlistProgress.current}/${playlistProgress.total}`
                              }
                            </span>
                          </div>
                          {playlistProgress.total > 0 && (
                            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300 shadow-lg"
                                style={{ width: `${playlistProgress.percentage}%` }}
                              />
                            </div>
                          )}
                          {playlistProgress.currentTrack && (
                            <p className={`text-xs text-white/60 truncate ${spaceGrotesk.className}`}>
                              Processing: {playlistProgress.currentTrack}
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowPlaylistDialog(false);
                            setPlaylistUrl('');
                            setPlaylistProgress(null);
                          }}
                          disabled={isProcessingPlaylist}
                          className={`bg-white/5 backdrop-blur-sm border border-white/20 hover:bg-white/10 transition-all duration-300 text-white hover:text-white text-base h-12 rounded-xl px-6 ${spaceGrotesk.className}`}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleProcessSpotifyPlaylist}
                          disabled={!playlistUrl.trim() || isProcessingPlaylist}
                          className={`bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-base h-12 rounded-xl px-6 transition-all duration-300 shadow-lg hover:shadow-green-500/25 ${spaceGrotesk.className}`}
                        >
                          {isProcessingPlaylist && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Process Playlist
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              </>
            )}
          </div>
          
        
        </motion.div>

        <AnimatePresence mode="wait">
        {currentPlaying && (
          <motion.div
            key="currently-playing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="flex-shrink-0"
          >
            <div className="mb-3 sm:mb-4">
              <motion.h3 
                className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3 flex items-center gap-2"
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
              >
                <div className="text-green-400">
                  <PlayIcon width={18} height={18} className="sm:w-5 sm:h-5 text-green-400" />
                </div>
                Now Playing
              </motion.h3>
              
              <SongCard
                item={currentPlaying}
                index={0}
                isCurrentlyPlaying={true}
                isAdmin={adminStatus}
                hasUserVoted={hasUserVoted(currentPlaying)}
                onVote={() => handleVote(currentPlaying.id)}
                onRemove={() => handleRemoveSong(currentPlaying.id)}
                onPlayInstant={() => {}}
              />
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        <div className="space-y-3 sm:space-y-4 flex flex-col h-full flex-1 min-h-0">
        <motion.h3 
          className="text-base sm:text-lg font-semibold text-white flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-shrink-0"
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span>Up Next</span>
          <motion.span 
            className="text-xs sm:text-sm font-normal text-gray-400"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ({sortedQueue.length} songs)
          </motion.span>
        </motion.h3>
        
        {/* Scrollable Queue Container */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500 pr-1">
          <AnimatePresence mode="popLayout">
            {sortedQueue.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="bg-[#1C1E1F] border-[#424244]">
                  <CardContent className="py-8 sm:py-12 text-center text-gray-400">
                    <motion.div 
                      className="flex flex-col items-center gap-3 sm:gap-4"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <motion.div
                        animate={{ 
                          rotate: [0, 5, -5, 0],
                          scale: [1, 1.05, 1]
                        }}
                        transition={{ 
                          duration: 4, 
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <div className="text-gray-600">
                          <PlayListIcon width={48} height={48} className="sm:w-16 sm:h-16 text-gray-600" />
                        </div>
                      </motion.div>
                      <div>
                        <p className="text-base sm:text-lg font-medium mb-2">No songs in queue</p>
                        <p className="text-sm">Add some music to get the party started!</p>
                      </div>
                      <motion.div 
                        className="flex items-center gap-2 text-xs sm:text-sm"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <div className="text-current">
                          <SearchIcon width={14} height={14} className="sm:w-4 sm:h-4" />
                        </div>
                        <span className="text-center">Search and add your favorite tracks</span>
                      </motion.div>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="space-y-2 sm:space-y-3 pb-2">
                {sortedQueue.map((item, index) => (
                  <SongCard
                    key={item.id}
                    item={item}
                    index={index}
                    isCurrentlyPlaying={false}
                    isAdmin={adminStatus}
                    hasUserVoted={hasUserVoted(item)}
                    onVote={() => handleVote(item.id)}
                    onRemove={() => handleRemoveSong(item.id)}
                    onPlayInstant={() => handlePlayInstant(item.id)}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
    
    <style jsx>{`
      /* Custom Scrollbar Styles */
      .scrollbar-thin {
        scrollbar-width: thin;
        scrollbar-color: #4b5563 transparent;
      }
      
      .scrollbar-thin::-webkit-scrollbar {
        width: 6px;
      }
      
      .scrollbar-thin::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 3px;
      }
      
      .scrollbar-thin::-webkit-scrollbar-thumb {
        background: #4b5563;
        border-radius: 3px;
        transition: background-color 0.2s ease;
      }
      
      .scrollbar-thin::-webkit-scrollbar-thumb:hover {
        background: #6b7280;
      }
      
      /* Ensure smooth scrolling */
      .scrollbar-thin {
        scroll-behavior: smooth;
      }

      .text-current svg path {
        stroke: currentColor !important;
      }
      .text-green-400 svg path {
        stroke: #4ade80 !important;
      }
      .text-gray-500 svg path {
        stroke: #6b7280 !important;
      }
      .text-gray-600 svg path {
        stroke: #4b5563 !important;
      }
      .text-white svg path {
        stroke: #ffffff !important;
      }
      .text-blue-400 svg path {
        stroke: #60a5fa !important;
      }
      button:hover .text-current svg path {
        stroke: currentColor !important;
      }
      button:hover .text-white svg path {
        stroke: #ffffff !important;
      }
      
      /* Simplified mobile optimizations */
      button, [role="button"] {
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        user-select: none;
      }
      
      /* Enhanced mobile feedback */
      button:active, [role="button"]:active {
        transform: scale(0.95) !important;
        transition: transform 0.1s ease !important;
      }
      
      /* Ensure minimum touch targets */
      @media (max-width: 640px) {
        button {
          min-height: 44px !important;
          min-width: 44px !important;
          position: relative !important;
        }
        
        /* Prevent horizontal overflow on mobile */
        .queue-container {
          max-width: 100vw !important;
          overflow-x: hidden !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          height: calc(100vh - 6rem) !important; /* Adjusted for mobile */
        }
        
        /* Ensure cards don't overflow */
        .queue-card {
          max-width: 100% !important;
          box-sizing: border-box !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }
        
        /* Prevent text overflow */
        .queue-text {
          word-break: break-word !important;
          overflow-wrap: break-word !important;
          max-width: 100% !important;
        }
        
        /* Mobile specific container adjustments */
        .queue-container * {
          box-sizing: border-box !important;
        }
        
        /* Ensure mobile containers don't squeeze */
        .queue-container .space-y-4 {
          width: 100% !important;
          max-width: 100% !important;
        }
        
        /* Mobile scrollbar adjustments */
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
      }

      /* Force hardware acceleration for smoother animations */
      button, [role="button"], .group {
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        will-change: transform;
      }
      
      /* Prevent accidental zoom on double tap for specific elements only */
      button, [role="button"], .group {
        touch-action: manipulation !important;
      }
      
      /* Admin-only queue card states */
      .queue-card.cursor-not-allowed:hover {
        transform: none !important;
        background-color: #1C1E1F !important;
        box-shadow: none !important;
        ring: none !important;
      }
      
      .queue-card.cursor-not-allowed:active {
        transform: none !important;
      }
    `}</style>
    
    {/* Chat Overlay */}
    {showChatOverlay && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowChatOverlay(false)}
        />
        
        {/* Chat Container */}
        <div className="relative w-full max-w-md h-[80vh] mx-4">
          <Chat 
            spaceId={spaceId} 
            className="w-full h-full"
            isOverlay={true}
            onClose={() => setShowChatOverlay(false)}
          />
        </div>
      </div>
    )}
  </div>
  );
};