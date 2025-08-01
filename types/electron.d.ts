interface ElectronAPI {
  updateDiscordActivity: (songData: {
    title: string;
    artist: string;
    image?: string;
    duration?: number;
    currentTime?: number;
    startTime?: number;
    isPlaying?: boolean;
    spaceId?: string;
    spaceName?: string;
  }) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
