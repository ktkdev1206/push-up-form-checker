export type AudioTrigger = 'SUCCESS' | 'FAILURE' | 'NONE';

export interface AudioPlayerState {
  isReady: boolean;
  isPlaying: boolean;
  lastPlayed: AudioTrigger;
  lastPlayedTimestamp: number;
}

