export type AudioTrigger = 'SUCCESS' | 'FAILURE' | 'NONE' | 'COUNTDOWN';

export interface AudioPlayerState {
  isReady: boolean;
  isPlaying: boolean;
  lastPlayed: AudioTrigger;
  lastPlayedTimestamp: number;
}

