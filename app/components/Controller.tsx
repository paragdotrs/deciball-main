import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart,
  MoreHorizontal
} from 'lucide-react';
import { 
  PlayIcon, 
  PauseIcon, 
  PreviousIcon, 
  NextIcon, 
  ForwardTenSecondIcon,
  BackTenSecondIcon,
  MuteIcon,
  MoreVolumeIcon,
  LessVolumeIcon
} from '@/components/icons';
import { useAudio } from '@/store/audioStore';
import VolumeBar from '@/components/VolumeBar';
import { inter, outfit } from '@/lib/font';

interface AudioControllerProps {
  customTogglePlayPause?: () => void;
  spaceId?: string;
  userId?: string;
  isAdmin?: boolean; // Add admin permission check
}

const AudioController: React.FC<AudioControllerProps> = ({ 
  customTogglePlayPause,
  spaceId,
  userId,
  isAdmin = false
}) => {
  const {
    isPlaying,
    isMuted,
    volume,
    progress,
    duration,
    currentSong,
    togglePlayPause,
    mute,
    unmute,
    playNext,
    playPrev,
    seek,
    setVolume
  } = useAudio();
  const playerRef = useRef<any>(null);
  console.log("IS Playing :::>>", isPlaying)

  const handleTogglePlayPause = () => {
    console.log('[AudioController] handleTogglePlayPause called');
    console.log('[AudioController] customTogglePlayPause provided:', !!customTogglePlayPause);
    
    if (customTogglePlayPause) {
      customTogglePlayPause();
    } else {
      togglePlayPause();
    }
  };

  const handlePlayPauseClick = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[AudioController] Play/Pause button clicked/touched');
    handleTogglePlayPause();
  };

  // Simple unified click handler that works on both desktop and mobile
  const handleClick = (callback: () => void) => (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  };

  const [isDragging, setIsDragging] = useState(false);
  const [tempProgress, setTempProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0);
  const [isSeeking, setIsLocalSeeking] = useState(false);
  const [lastSeekTime, setLastSeekTime] = useState(0);

  const formatTime = (seconds: any) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isProgressActive, setIsProgressActive] = useState(false);

  const getEventPosition = (e: any) => {
    // Handle both mouse and touch events
    if (e.touches && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  };

  const calculateProgress = (e: any) => {
    if (!progressBarRef.current) return 0;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const position = getEventPosition(e);
    const percent = ((position.clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(100, percent));
  };

  const handleProgressStart = (e: any) => {
    if (!isAdmin) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    setIsProgressActive(true);
    
    const percent = calculateProgress(e);
    setTempProgress(percent);
    
    // Add visual feedback immediately
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = 'scaleY(1.5)';
      progressBarRef.current.style.transition = 'transform 0.1s ease';
    }
  };

  const handleProgressMove = (e: any) => {
    if (!isDragging || !progressBarRef.current || !isAdmin) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const percent = calculateProgress(e);
    setTempProgress(percent);
  };

  const handleProgressEnd = (e?: any) => {
    if (!isDragging || !isAdmin) return;
    
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const newTime = (tempProgress / 100) * duration;
    const currentTime = Date.now();
    
    // Throttle seeking to prevent too many rapid calls
    if (currentTime - lastSeekTime > 100) {
      setIsLocalSeeking(true);
      setTimeout(() => setIsLocalSeeking(false), 1500);
      
      seek(newTime);
      setLastSeekTime(currentTime);
    }
    
    setIsDragging(false);
    setIsProgressActive(false);
    
    // Reset visual feedback
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = 'scaleY(1)';
      progressBarRef.current.style.transition = 'transform 0.2s ease';
    }
  };

  const handleProgressClick = (e: any) => {
    if (!isAdmin || isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const percent = calculateProgress(e);
    const newTime = (percent / 100) * duration;
    const currentTime = Date.now();
    
    // Throttle seeking for clicks too
    if (currentTime - lastSeekTime > 100) {
      setIsLocalSeeking(true);
      setTimeout(() => setIsLocalSeeking(false), 1500);
      
      seek(newTime);
      setLastSeekTime(currentTime);
      
      // Visual feedback for click
      setTempProgress(percent);
      setTimeout(() => setTempProgress(0), 100);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      unmute();
    } else {
      mute();
    }
  };

  useEffect(() => {
    const handleKeyPress = (e : any) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          handleTogglePlayPause();
          break;
        case 'ArrowLeft':
          if (e.ctrlKey) {
            e.preventDefault();
            playPrev();
          } else {
            const newTime = Math.max(0, progress - 10);
            seek(newTime);
          }
          break;
        case 'ArrowRight':
          if (e.ctrlKey) {
            e.preventDefault();
            playNext();
          } else {
            const newTime = Math.min(duration, progress + 10);
            seek(newTime);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
        case 'm':
          toggleMute();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleTogglePlayPause, playNext, playPrev, seek, progress, duration, volume, toggleMute, setVolume]);

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        handleProgressMove(e);
      };
      const handleMouseUp = (e: MouseEvent) => {
        e.preventDefault();
        handleProgressEnd(e);
      };
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault(); // Prevent scrolling
        handleProgressMove(e);
      };
      const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        handleProgressEnd(e);
      };
      
      // Add both pointer and touch events for better mobile support
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });
      
      // Also handle when touch goes outside the viewport
      document.addEventListener('touchcancel', handleTouchEnd, { passive: false });
      
      // Prevent context menu on mobile
      const preventContextMenu = (e: Event) => e.preventDefault();
      document.addEventListener('contextmenu', preventContextMenu);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);
        document.removeEventListener('contextmenu', preventContextMenu);
      };
    }
  }, [isDragging, tempProgress, duration, isAdmin, seek]);

  if (!currentSong) {
    return (
      <div className="bg-[#1C1E1F] border-t border-[#424244] p-4">
        <div className="text-center text-gray-500">No song playing</div>
      </div>
    );
  }

  const progressPercent = isDragging ? tempProgress : (progress / duration) * 100;

  return (
    <div className="bg-gradient-to-r from-[#1C1E1F] via-[#1C1E1F] to-[#1C1E1F] border-t border-[#424244] rounded-xl p-3 sm:p-4 shadow-2xl">
      <div className="max-w-6xl mx-auto">
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center gap-1 sm:gap-2 text-xs text-gray-400 mb-1">
            <span className="text-xs sm:text-sm">{formatTime(progress)}</span>
            <div 
              ref={progressBarRef}
              data-progress-bar
              className={`flex-1 bg-gray-600 rounded-full relative group transition-all duration-200 select-none ${
                isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
              } ${
                isSeeking ? 'ring-2 ring-gray-400 ring-opacity-50' : ''
              } ${
                isDragging || isProgressActive ? 'ring-2 ring-white ring-opacity-30' : ''
              }`}
              style={{
                height: isDragging || isProgressActive ? '6px' : '4px',
                touchAction: 'none', // Prevent default touch behaviors
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none'
              }}
              onMouseDown={handleProgressStart}
              onTouchStart={handleProgressStart}
              onClick={handleProgressClick}
              title={
                isSeeking ? 'Seeking...' : 
                isAdmin ? 'Drag to seek (Admin only)' : 'Only admin can seek'
              }
            >
              <div 
                className={`bg-gradient-to-r from-gray-300 to-white rounded-full relative transition-all duration-100 ${
                  isDragging ? 'transition-none' : ''
                } ${
                  isSeeking ? 'animate-pulse' : ''
                } ${
                  isProgressActive ? 'shadow-lg' : ''
                }`}
                style={{ 
                  height: '100%',
                  width: `${progressPercent}%`,
                  willChange: 'width'
                }}
              >
                {/* Enhanced progress thumb for mobile */}
                <div 
                  className={`absolute right-0 top-1/2 transform -translate-y-1/2 bg-white rounded-full shadow-lg transition-all duration-150 ${
                    isDragging || isSeeking || (isAdmin && progressPercent > 0) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  } ${
                    isDragging || isProgressActive ? 'scale-125' : 'scale-100'
                  } ${
                    isSeeking ? 'ring-2 ring-gray-400 ring-opacity-50 animate-pulse' : ''
                  }`}
                  style={{
                    width: isDragging || isProgressActive ? '16px' : '12px',
                    height: isDragging || isProgressActive ? '16px' : '12px',
                    marginRight: isDragging || isProgressActive ? '-8px' : '-6px',
                    touchAction: 'none',
                    willChange: 'transform, width, height'
                  }}
                />
              </div>
              
              {/* Mobile touch area enhancement */}
              {isAdmin && (
                <div 
                  className="absolute inset-0 -top-2 -bottom-2 bg-transparent"
                  style={{ 
                    touchAction: 'none',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                />
              )}
            </div>
            <span className="text-xs sm:text-sm">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="flex flex-col gap-3 sm:hidden">
          {/* Main Controls Row */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleClick(playPrev)}
              style={{ touchAction: 'manipulation' }}
              className={`p-2 text-gray-300 hover:text-white transition-colors rounded-full hover:bg-gray-700 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center ${inter.className}`}
              title="Previous"
            >
              <div className="text-current">
                <PreviousIcon width={16} height={16} />
              </div>
            </button>

            <button
              onClick={handleClick(() => {
                const newTime = Math.max(0, progress - 10);
                seek(newTime);
              })}
              style={{ touchAction: 'manipulation' }}
              className={`p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center ${inter.className}`}
              title="Back 10s"
            >
              <div className="text-current">
                <BackTenSecondIcon width={14} height={14} />
              </div>
            </button>

            <button
              onClick={handleClick(handleTogglePlayPause)}
              style={{ touchAction: 'manipulation' }}
              className={`text-black p-1 rounded-full hover:scale-105 transition-transform shadow-lg flex items-center justify-center min-w-[48px] min-h-[48px] active:scale-95 ${outfit.className} font-medium`}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <div className="text-black">
                  <PauseIcon width={32} className='w-8' height={32} />
                </div>
              ) : (
                <div className="text-black">
                  <PlayIcon width={32} className='w-8' height={32} />
                </div>
              )}
            </button>

            <button
              onClick={handleClick(() => {
                const newTime = Math.min(duration, progress + 10);
                seek(newTime);
              })}
              style={{ touchAction: 'manipulation' }}
              className={`p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center ${inter.className}`}
              title="Forward 10s"
            >
              <div className="text-current">
                <ForwardTenSecondIcon width={14} height={14} />
              </div>
            </button>

            <button
              onClick={handleClick(playNext)}
              style={{ touchAction: 'manipulation' }}
              className={`p-2 text-gray-300 hover:text-white transition-colors rounded-full hover:bg-gray-700 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center ${inter.className}`}
              title="Next"
            >
              <div className="text-current">
                <NextIcon width={16} height={16} />
              </div>
            </button>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`p-1 rounded-full transition-colors ${inter.className} ${
                isLiked ? 'text-red-500 hover:text-red-400' : 'text-gray-400 hover:text-white'
              }`}
              style={{ 
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                userSelect: 'none'
              }}
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2 mx-6 justify-center">
            <button
              onClick={handleClick(playPrev)}
              style={{ touchAction: 'manipulation' }}
              className={`p-2 text-gray-300 hover:text-white transition-colors rounded-full hover:bg-gray-700 active:scale-95 ${inter.className}`}
              title="Previous (Ctrl + ←)"
            >
              <div className="text-current">
                <PreviousIcon width={20} height={20} />
              </div>
            </button>

            <button
              onClick={handleClick(() => {
                const newTime = Math.max(0, progress - 10);
                seek(newTime);
              })}
              style={{ touchAction: 'manipulation' }}
              className={`p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700 active:scale-95 ${inter.className}`}
              title="Back 10 seconds"
            >
              <div className="text-current">
                <BackTenSecondIcon width={16} height={16} />
              </div>
            </button>

            <button
              onClick={handleClick(handleTogglePlayPause)}
              style={{ touchAction: 'manipulation' }}
              className={`text-black p-1 rounded-full hover:scale-105 transition-transform shadow-lg flex items-center justify-center min-w-[56px] min-h-[56px] active:scale-95 ${outfit.className} font-medium`}
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? (
                <div className="text-black">
                  <PauseIcon width={40} className='w-10' height={40} />
                </div>
              ) : (
                <div className="text-black">
                  <PlayIcon width={40} className='w-10' height={40} />
                </div>
              )}
            </button>

            <button
              onClick={handleClick(() => {
                const newTime = Math.min(duration, progress + 10);
                seek(newTime);
              })}
              style={{ touchAction: 'manipulation' }}
              className={`p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700 active:scale-95 ${inter.className}`}
              title="Forward 10 seconds"
            >
              <div className="text-current">
                <ForwardTenSecondIcon width={16} height={16} />
              </div>
            </button>

            <button
              onClick={handleClick(playNext)}
              style={{ touchAction: 'manipulation' }}
              className={`p-2 text-gray-300 hover:text-white transition-colors rounded-full hover:bg-gray-700 active:scale-95 ${inter.className}`}
              title="Next (Ctrl + →)"
            >
              <div className="text-current">
                <NextIcon width={20} height={20} />
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
            <div className="w-32 max-w-32">
              <VolumeBar
                defaultValue={volume * 100}
                startingValue={0}
                maxValue={100}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        /* Enhanced mobile optimizations for progress bar */
        [data-progress-bar] {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          touch-action: none !important;
          will-change: transform, height !important;
        }
        
        /* Smooth progress bar animations */
        [data-progress-bar] > div {
          will-change: width !important;
          backface-visibility: hidden !important;
          -webkit-backface-visibility: hidden !important;
          transform: translateZ(0) !important;
          -webkit-transform: translateZ(0) !important;
        }
        
        /* Enhanced touch targets for mobile */
        @media (max-width: 640px) {
          [data-progress-bar] {
            min-height: 20px !important;
            padding: 8px 0 !important;
            margin: -8px 0 !important;
            cursor: pointer !important;
          }
          
          [data-progress-bar]:active {
            transform: scaleY(1.2) !important;
            transition: transform 0.1s ease !important;
          }
        }
        
        /* Button optimizations */
        button {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none !important;
          touch-action: manipulation !important;
          user-select: none !important;
          transform: translateZ(0) !important;
          -webkit-transform: translateZ(0) !important;
          will-change: transform !important;
        }
        
        /* Enhanced mobile feedback with better performance */
        button:active {
          transform: scale(0.95) translateZ(0) !important;
          transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        /* Icon color fixes */
        .text-black svg path {
          stroke: #000000 !important;
        }
        .text-current svg path {
          stroke: currentColor !important;
        }
        .text-gray-300 svg path,
        .text-gray-400 svg path {
          stroke: currentColor !important;
        }
        button:hover .text-current svg path {
          stroke: currentColor !important;
        }
        
        /* Minimum touch targets */
        @media (max-width: 640px) {
          button {
            min-height: 44px !important;
            min-width: 44px !important;
            position: relative !important;
          }
        }

        /* Disable text selection and highlight */
        * {
          -webkit-tap-highlight-color: transparent !important;
        }
        
        /* Hardware acceleration for smooth performance */
        [data-progress-bar], button {
          transform: translateZ(0) !important;
          -webkit-transform: translateZ(0) !important;
          backface-visibility: hidden !important;
          -webkit-backface-visibility: hidden !important;
        }
        
        /* Progress bar smooth dragging */
        [data-progress-bar].dragging {
          transition: none !important;
        }
        
        /* Improved mobile progress thumb */
        @media (max-width: 640px) {
          [data-progress-bar] .progress-thumb {
            width: 20px !important;
            height: 20px !important;
            margin-right: -10px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AudioController;