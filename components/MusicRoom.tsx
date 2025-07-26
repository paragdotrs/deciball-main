'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/socket-context';
import { useUserStore } from '@/store/userStore';
import { useIsMobile } from '@/app/hooks/use-mobile';
import { useAudio } from '@/store/audioStore';
import { QueueManager } from './QueueManager';
import { Player } from './Player';
import SearchSongPopup from '@/app/components/Search';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Users, Music, Settings, VolumeX, Volume2, Play, Pause, LogOut, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import ListenerSidebar from '@/app/components/ListenerSidebar';
import { SidebarProvider } from '@/app/components/ui/sidebar';
// import { DiscordPresence } from './DiscordPresence';
import { ElectronDetector } from './ElectronDetector';
import HalftoneWavesBackground from './Background';
import BlurText, { BlurComponent } from './ui/BlurEffects';
import { RecommendationPanel } from './RecommendationPanel';
import { lexend, poppins, signikaNegative, inter, manrope, spaceGrotesk, jetBrainsMono, outfit } from '@/lib/font';

interface MusicRoomProps {
  spaceId: string;
}

export const MusicRoom: React.FC<MusicRoomProps> = ({ spaceId }) => {
  const { data: session } = useSession();
  const { user, setUser } = useUserStore();
  const { setVolume,  setCurrentSpaceId } = useAudio();
  const { sendMessage, socket, loading, connectionError } = useSocket();
  const router = useRouter();
  const isMobile = useIsMobile();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [roomName, setRoomName] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showQueue, setShowQueue] = useState(true);
  const [showPlayer, setShowPlayer] = useState(true);
  const [userDetails, setUserDetails] = useState<any[]>([]);
  const [spaceInfo, setSpaceInfo] = useState<{ spaceName: string; hostId: string } | null>(null);

  const getProfilePicture = () => {
    return user?.imageUrl || (session?.user as any)?.image || session?.user?.pfpUrl || null;
  };

  const getUserInitials = () => {
    const name =session?.user?.name|| "User Not Found";
    return name.charAt(0).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/signin' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    console.log('UserDetails state changed:', userDetails);
    console.log('UserDetails length:', userDetails.length);
  }, [userDetails]);

  useEffect(() => {
    if (session?.user && !user) {
      console.log("[katana] MusicRoom session user:", session.user);
      console.log("[katana] HostID", spaceInfo?.hostId);  
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        name: (session.user as any).name || session.user.username || '',
        username: session.user.username || '',
        imageUrl: (session.user as any).image || '',
       role: session.user.id === spaceInfo?.hostId ? 'admin' : 'listener',
        token: (session.user as any).token || '',
        isBookmarked: '',
        spotifyAccessToken: (session.user as any).spotifyAccessToken,
        spotifyRefreshToken: (session.user as any).spotifyRefreshToken
      });
    }
     setIsAdmin(session?.user.id === spaceInfo?.hostId);


     console.log("[katana] MusicRoom session user:", user);
  }, [session, user, setUser]);

  useEffect(() => {
    if (spaceId) {
      console.log("[MusicRoom] Setting spaceId in audio store:", spaceId);
      setCurrentSpaceId(spaceId);
    }
  }, [spaceId, setCurrentSpaceId]);

  useEffect(() => {
    const fetchSpaceInfo = async () => {
      try {
        const response = await fetch(`/api/spaces?spaceId=${spaceId}`);
        const data = await response.json();
        console.log("Space Data ::", data)
        if (data.success) {
          setSpaceInfo({
            spaceName: data.spaceName,
            hostId: data.hostId
          });
          setRoomName(data.spaceName);
        } else {
          console.error('Failed to fetch space info:', data.message);
          setRoomName("Unknown Space");
        }
      } catch (error) {
        console.error('Error fetching space info:', error);
        setRoomName("Unknown Space");
      }
    };

    if (spaceId) {
      fetchSpaceInfo();
    }
  }, [spaceId]);

  const handleBatchAddToQueue = async (tracks: any[]) => {
    console.log('Batch add completed by Search component:', { 
      tracksCount: tracks.length, 
      trackNames: tracks.map(t => t.name)
    });
  };

  useEffect(() => {
    if (!socket || !user) return;

    let authErrorCount = 0;
    const maxAuthErrors = 3;

    const handleMessage = (event: MessageEvent) => {
      try {
        const { type, data } = JSON.parse(event.data);
        console.log('MusicRoom received message:', type, data);
        
        switch (type) {
          case 'room-info':
            setIsAdmin(data.isAdmin || false);
            setConnectedUsers(data.userCount || 0);
            setRoomName(data.spaceName );
            console.log('Room info updated:', { isAdmin: data.isAdmin, userCount: data.userCount });
            break;
          case 'room-joined':
            console.log('Successfully joined room:', data);
            console.log('   - SpaceId:', data.spaceId);
            console.log('   - UserId:', data.userId);
            console.log('   - Message:', data.message);
            authErrorCount = 0; // Reset on successful join
            break;
          case 'current-song-update':
            console.log('Current song update received in MusicRoom:', data);
            // Dispatch to window for Player component to handle
            window.dispatchEvent(new CustomEvent('current-song-update', {
              detail: data
            }));
            break;
          case 'space-image-response':
            console.log('Space image update received in MusicRoom:', data);
            // Dispatch to window for components that need the image
          window.dispatchEvent(new CustomEvent('space-image-update', {
            detail: data
          }));
          break;
        case 'user-update':
          setConnectedUsers(data.userCount || data.connectedUsers || 0);
          if (data.userDetails) {
            console.log('Updating userDetails:', data.userDetails);
            setUserDetails(data.userDetails);
          }
          console.log('Updated user count:', data.userCount || data.connectedUsers || 0);
          console.log('Current userDetails state:', userDetails);
          break;
        case 'user-joined':
          setConnectedUsers(prev => prev + 1);
          console.log('User joined - new count will be:', connectedUsers + 1);
          if (socket?.readyState === WebSocket.OPEN) {
            sendMessage('get-room-users', { spaceId });
          }
          break;
        case 'user-left':
          setConnectedUsers(prev => Math.max(0, prev - 1));
          console.log('User left - new count will be:', Math.max(0, connectedUsers - 1));
          if (socket?.readyState === WebSocket.OPEN) {
            sendMessage('get-room-users', { spaceId });
          }
          break;

      

        case 'queue-update':
          console.log('Queue update received in MusicRoom:', data);
          break;
          case 'error':
            console.error('Room error:', {
              message: data.message || 'Unknown error',
              data: data,
              timestamp: new Date().toISOString()
            });
            
            if (data.message === 'You are unauthorized to perform this action') {
              authErrorCount++;
              console.error(`Authorization error (${authErrorCount}/${maxAuthErrors}) - this might be due to:`);
              console.error('   - Invalid or expired authentication token');
              console.error('   - User not properly joined to the room');
              console.error('   - User ID mismatch between token and request');
              console.error('   - Room connection lost');
              console.error('Current user info:', { 
                userId: user?.id, 
                hasToken: !!user?.token,
                tokenLength: user?.token?.length 
              });
              console.error('Socket info:', { 
                connected: socket?.readyState === WebSocket.OPEN,
                readyState: socket?.readyState 
              });
              
              // Only attempt to rejoin if under max attempts and have valid credentials
              if (authErrorCount < maxAuthErrors && user?.token && socket?.readyState === WebSocket.OPEN) {
                console.log(`Attempting to rejoin room due to authorization error (attempt ${authErrorCount}/${maxAuthErrors})...`);
                setTimeout(() => {
                  sendMessage('join-room', { 
                    spaceId, 
                    token: user.token,
                    spaceName: spaceInfo?.spaceName
                  });
                }, 2000 * authErrorCount); // Exponential backoff
              } else if (authErrorCount >= maxAuthErrors) {
                console.error('Max auth error attempts reached. Stopping reconnection attempts.');
              }
            }
            break;
          default:
            console.log('Unhandled message type in MusicRoom:', type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message in MusicRoom:', error);
      }
    };

    socket.addEventListener('message', handleMessage);

    if (spaceInfo) {
      console.log('Attempting to join room:', { 
        spaceId, 
        spaceName: spaceInfo.spaceName,
        userId: user.id, 
        hasToken: !!user.token,
        tokenLength: user.token?.length,
        tokenPreview: user.token?.substring(0, 20) + '...'
      });
      
      const roomJoined = sendMessage('join-room', { 
        spaceId, 
        token: user.token,
        spaceName: spaceInfo?.spaceName
      });
      
      if (!roomJoined) {
        console.error('Failed to join room - connection issue');
      } else {
        console.log('Join room message sent successfully with space name:', spaceInfo.spaceName);
        
        // Request current song after joining (fallback mechanism)
        setTimeout(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            console.log('Requesting current song as fallback...');
            sendMessage('get-current-song', { spaceId });
            sendMessage('get-space-image', { spaceId });
          }
        }, 1000);
      }
    } else {
      console.log('Waiting for space info before joining room...');
    }

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, user, spaceId, sendMessage, spaceInfo]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume, true);
  };
  
  if (loading || !user) {
    return (
      <HalftoneWavesBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-gray-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className={`text-lg text-gray-200 ${inter.className}`}>Connecting to music room...</p>
          </div>
        </div>
      </HalftoneWavesBackground>
    );
  }

  return (
    <HalftoneWavesBackground>
      <div className="flex min-h-screen text-white relative">
        {/* <DiscordPresence /> */}
        
        <ElectronDetector />
        
        {/* Sidebar - Only render on desktop, completely hidden on mobile */}
        {!isMobile && (
          <div className="flex-shrink-0 relative z-10">
            <SidebarProvider>
              <ListenerSidebar 
                listeners={userDetails.length > 0 ? userDetails : [
                  ...Array.from({ length: connectedUsers }, (_, i) => ({
                    userId: `user-${i}`,
                    isCreator: i === 0,
                    name: i === 0 ? 'Room Creator' : `Listener ${i}`,
                    imageUrl: ''
                  }))
                ]} 
              />
            </SidebarProvider>
          </div>
        )}

        {/* Main content with proper positioning */}
        <div className="flex-1 flex flex-col min-w-0 relative z-20 touch-auto music-room-main-content"
             style={{ isolation: 'isolate' }}>
          <div className="flex items-center justify-center p-2 sm:p-3 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 md:gap-8 bg-black/20 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl px-3 sm:px-6 md:px-12 py-3 sm:py-3 md:py-4 shadow-2xl w-full max-w-[95%] sm:max-w-[400px] md:min-w-[900px] md:max-w-5xl">
              
              {/* Mobile Layout - Header with profile picture and room name */}
              <div className="flex items-center justify-between w-full sm:hidden">
                <div className="flex-1 flex justify-center">
                  <BlurText 
                    text={roomName} 
                    animateBy="words"
                    className={`text-lg font-bold text-white text-center ${spaceGrotesk.className}`}
                    delay={150}
                    direction="top"
                  />
                </div>
                <div className="flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-white/10 transition-all duration-300 shadow-lg bg-black/40 backdrop-blur-xl border border-white/20 hover:border-white/30">
                        <Avatar className="h-9 w-9 ring-1 ring-cyan-400/30 hover:ring-cyan-400/50 transition-all duration-300">
                          <AvatarImage 
                            src={getProfilePicture() || undefined} 
                            alt={String(session?.user?.name || session?.user?.username || 'User')} 
                            className="object-cover"
                          />
                          <AvatarFallback className={`bg-gradient-to-br from-cyan-500 to-purple-500 text-white font-semibold text-sm ${outfit.className}`}>
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-black/90 border-white/20 backdrop-blur-xl" align="end" forceMount>
                      <DropdownMenuLabel className={`font-normal ${inter.className}`}>
                        <div className="flex flex-col space-y-1">
                          <p className={`text-sm font-medium leading-none text-white ${manrope.className}`}>
                            {session?.user?.name || session?.user?.username || 'User'}
                          </p>
                          <p className={`text-xs leading-none text-gray-400 ${jetBrainsMono.className} font-mono`}>
                            {session?.user?.email}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={isAdmin ? 'default' : 'secondary'} className={`text-xs bg-gradient-to-r from-cyan-500 to-purple-500 border-0 ${outfit.className} font-medium`}>
                              {isAdmin ? 'Admin' : 'Listener'}
                            </Badge>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-white/20" />
                      <DropdownMenuItem 
                        className={`text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer ${inter.className}`}
                        onClick={() => router.push('/profile')}
                      >
                        <User className="mr-2 h-4 w-4" />
                        <span className={`${outfit.className} font-medium`}>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer ${inter.className}`}
                        onClick={() => router.push('/settings')}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        <span className={`${outfit.className} font-medium`}>Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/20" />
                      <DropdownMenuItem 
                        className={`text-red-400 hover:text-red-300 hover:bg-red-900/20 cursor-pointer ${inter.className}`}
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span className={`${outfit.className} font-medium text-red-400`}>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Desktop Layout - Original layout */}
              <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-4 md:gap-8 w-full">
                <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                  <BlurText 
                    text={roomName} 
                    animateBy="words"
                    className={`text-base sm:text-lg md:text-xl font-bold text-white text-left truncate flex-1 sm:flex-none ${spaceGrotesk.className}`}
                    delay={150}
                    direction="top"
                  />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Connection Status Badge with monospace font for technical info */}
                    {/* <Badge 
                      variant={
                        loading ? 'secondary' :
                        connectionError ? 'destructive' :
                        socket?.readyState === WebSocket.OPEN ? 'default' : 'secondary'
                      }
                      className={`flex items-center gap-1 sm:gap-1.5 bg-black/30 border-white/20 text-gray-200 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs ${jetBrainsMono.className}`}
                    >
                      <div 
                        className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${
                          loading ? 'bg-yellow-400 animate-pulse' :
                          connectionError ? 'bg-red-400' :
                          socket?.readyState === WebSocket.OPEN ? 'bg-emerald-400' : 'bg-gray-400'
                        }`}
                      />
                      <span className="hidden sm:inline">
                        {loading ? 'Connecting' :
                         connectionError ? 'Error' :
                         socket?.readyState === WebSocket.OPEN ? 'Live' : 'Offline'}
                      </span>
                      <span className="sm:hidden">
                        {loading ? '...' :
                         connectionError ? '!' :
                         socket?.readyState === WebSocket.OPEN ? '●' : '○'}
                      </span>
                    </Badge> */}
                  </div>
                </div>
                
                <div className="flex-1 w-full sm:max-w-xs md:max-w-xl">
                  <SearchSongPopup 
                    onSelect={(track) => {
                      console.log('Song selected:', track.name);
                    }}
                    onBatchSelect={handleBatchAddToQueue}
                    buttonClassName={`w-full bg-black/40 hover:bg-black/50 border-white/20 hover:border-white/30 text-gray-200 rounded-full px-3 sm:px-4 md:px-6 py-2 sm:py-2 md:py-2.5 backdrop-blur-sm transition-all duration-300 text-xs sm:text-sm md:text-base ${inter.className}`}
                    maxResults={12}
                    isAdmin={true}
                    enableBatchSelection={true}
                    spaceId={spaceId}
                  />
                </div>

                <div className="flex items-center justify-center sm:justify-end gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-white/10 transition-all duration-300">
                        <Avatar className="h-10 w-10 ring-2 ring-cyan-400/30 hover:ring-cyan-400/50 transition-all duration-300">
                          <AvatarImage 
                            src={getProfilePicture() || undefined} 
                            alt={String(session?.user?.name || session?.user?.username || 'User')} 
                            className="object-cover"
                          />
                          <AvatarFallback className={`bg-gradient-to-br from-cyan-500 to-purple-500 text-white font-semibold ${outfit.className}`}>
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-black/90 border-white/20 backdrop-blur-xl" align="end" forceMount>
                      <DropdownMenuLabel className={`font-normal ${inter.className}`}>
                        <div className="flex flex-col space-y-1">
                          <p className={`text-sm font-medium leading-none text-white ${manrope.className}`}>
                            {session?.user?.name || session?.user?.username || 'User'}
                          </p>
                          <p className={`text-xs leading-none text-gray-400 ${jetBrainsMono.className} font-mono`}>
                            {session?.user?.email}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={isAdmin ? 'default' : 'secondary'} className={`text-xs bg-gradient-to-r from-cyan-500 to-purple-500 border-0 ${outfit.className} font-medium`}>
                              {isAdmin ? 'Admin' : 'Listener'}
                            </Badge>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-white/20" />
                      <DropdownMenuItem 
                        className={`text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer ${inter.className}`}
                        onClick={() => router.push('/profile')}
                      >
                        <User className="mr-2 h-4 w-4" />
                        <span className={`${outfit.className} font-medium`}>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={`text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer ${inter.className}`}
                        onClick={() => router.push('/settings')}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        <span className={`${outfit.className} font-medium`}>Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/20" />
                      <DropdownMenuItem 
                        className={`text-red-400 hover:text-red-300 hover:bg-red-900/20 cursor-pointer ${inter.className}`}
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span className={`${outfit.className} font-medium text-red-400`}>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Mobile Search - Full width below room info */}
              <div className="w-full sm:hidden">
                <SearchSongPopup 
                  onSelect={(track) => {
                    console.log('Song selected:', track.name);
                  }}
                  onBatchSelect={handleBatchAddToQueue}
                  buttonClassName={`w-full bg-black/40 hover:bg-black/50 border-white/20 hover:border-white/30 text-gray-200 rounded-full px-4 py-2.5 backdrop-blur-sm transition-all duration-300 text-sm ${inter.className}`}
                  maxResults={12}
                  isAdmin={true}
                  enableBatchSelection={true}
                  spaceId={spaceId}
                />
              </div>
            </div>
          </div>

            <div className="flex p-2 sm:p-4 justify-center">
              <div className="w-full max-w-[95%] sm:max-w-[400px] md:max-w-[98rem] mx-auto h-full">
                <div className="flex flex-col md:flex-row md:flex gap-4 md:justify-between h-full min-h-[calc(100vh-200px)]">
                  {/* Left Column */}
                  <div className="flex flex-col gap-4 order-1 md:order-1 w-full md:w-auto ml-2 md:ml-0">
                    <BlurComponent 
                      delay={500} 
                      direction="top"
                      className="flex-shrink-0"
                      stepDuration={0.4}
                    >
                      {showPlayer && (
                        <div className="backdrop-blur-sm rounded-2xl shadow-lg border border-gray-600/50 p-4 sm:p-6 min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] w-full md:min-w-[625px]">
                          <Player 
                            spaceId={spaceId}
                            isAdmin={isAdmin}
                            userCount={connectedUsers}
                            userDetails={userDetails}
                            className="w-full h-full"
                          />
                        </div>
                      )}
                    </BlurComponent>

                    <BlurComponent
                      delay={700}
                      direction="bottom"
                      className="flex-1 hidden md:block"
                      stepDuration={0.4}
                    >
                      <RecommendationPanel 
                        spaceId={spaceId}
                        isAdmin={isAdmin}
                        className="w-full"
                      />
                    </BlurComponent>
                  </div>
                  {/* Right Column */}
                  <div className="w-full md:min-w-[625px] order-2 md:order-2 ml-2 md:ml-0">
                    <BlurComponent
                      delay={600}
                      direction="top"
                      className="h-full"
                      stepDuration={0.4}
                    >
                      {showQueue && (
                        <div className="backdrop-blur-sm rounded-2xl shadow-lg border border-gray-600/50 p-4 sm:p-6 h-full min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] w-full">
                          <QueueManager 
                            spaceId={spaceId} 
                            isAdmin={isAdmin}
                          />
                        </div>
                      )}
                    </BlurComponent>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
    </HalftoneWavesBackground>
  
  );
};