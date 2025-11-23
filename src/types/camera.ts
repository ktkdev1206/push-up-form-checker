export type CameraStatus = 'INITIALIZING' | 'PERMISSION_DENIED' | 'POSITIONING' | 'READY';

export type PositionQuality = 'GOOD' | 'POOR' | 'NOT_DETECTED';

export interface CameraSetupState {
  status: CameraStatus;
  positionQuality: PositionQuality;
  message: string;
  canProceed: boolean;
}

export interface CameraConfig {
  width: number;
  height: number;
  facingMode: 'user' | 'environment';
  frameRate: number;
}

