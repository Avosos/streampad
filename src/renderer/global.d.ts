import type { StreamPadAPI } from '../preload';

declare global {
  interface Window {
    streampad: StreamPadAPI;
  }
}
