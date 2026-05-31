'use client';

export type VideoPlaybackKind = 'reel' | 'feed' | 'story';

type RegisteredVideo = {
  id: string;
  video: HTMLVideoElement;
  kind: VideoPlaybackKind;
  userPaused: boolean;
  onPlayingChange?: (playing: boolean) => void;
};

type PlaybackListener = (activeId: string | null, playing: boolean) => void;

class VideoPlaybackControllerImpl {
  private videos = new Map<string, RegisteredVideo>();
  private activeId: string | null = null;
  private playbackEnabled = true;
  private listeners = new Set<PlaybackListener>();

  register(
    id: string,
    video: HTMLVideoElement,
    kind: VideoPlaybackKind,
    onPlayingChange?: (playing: boolean) => void,
  ) {
    const prevPaused = this.videos.get(id)?.userPaused ?? false;
    this.videos.set(id, { id, video, kind, userPaused: prevPaused, onPlayingChange });
    const onPlay = () => this.syncPlayingState(id, true);
    const onPause = () => this.syncPlayingState(id, false);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      if (this.activeId === id) this.activeId = null;
      this.videos.delete(id);
    };
  }

  private syncPlayingState(id: string, playing: boolean) {
    const entry = this.videos.get(id);
    entry?.onPlayingChange?.(playing);
    if (playing && this.activeId !== id) {
      this.pauseExcept(id);
      this.activeId = id;
    }
    if (!playing && this.activeId === id) {
      this.activeId = null;
    }
    this.notifyListeners();
  }

  private notifyListeners() {
    const playing = this.activeId ? !this.videos.get(this.activeId)?.video.paused : false;
    for (const fn of this.listeners) fn(this.activeId, playing);
  }

  subscribe(listener: PlaybackListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getActiveId() {
    return this.activeId;
  }

  setPlaybackEnabled(enabled: boolean) {
    this.playbackEnabled = enabled;
    if (!enabled) this.pauseAll();
  }

  isPlaybackEnabled() {
    return this.playbackEnabled;
  }

  setUserPaused(id: string, paused: boolean) {
    const entry = this.videos.get(id);
    if (!entry) return;
    entry.userPaused = paused;
  }

  isUserPaused(id: string) {
    return this.videos.get(id)?.userPaused ?? false;
  }

  pauseAll(resetTime = false) {
    for (const entry of this.videos.values()) {
      entry.video.pause();
      if (resetTime) {
        try {
          entry.video.currentTime = 0;
        } catch {
          /* noop */
        }
      }
      entry.onPlayingChange?.(false);
    }
    this.activeId = null;
    this.notifyListeners();
  }

  pauseExcept(id: string) {
    for (const entry of this.videos.values()) {
      if (entry.id === id) continue;
      entry.video.pause();
      entry.onPlayingChange?.(false);
    }
  }

  pauseVideo(id: string) {
    const entry = this.videos.get(id);
    if (!entry) return;
    entry.video.pause();
    entry.onPlayingChange?.(false);
    if (this.activeId === id) this.activeId = null;
    this.notifyListeners();
  }

  async requestPlay(id: string, opts?: { resetUserPaused?: boolean }) {
    if (!this.playbackEnabled) return false;
    const entry = this.videos.get(id);
    if (!entry) return false;
    if (opts?.resetUserPaused) entry.userPaused = false;
    if (entry.userPaused) {
      entry.onPlayingChange?.(false);
      return false;
    }
    this.pauseExcept(id);
    try {
      await entry.video.play();
      this.activeId = id;
      entry.onPlayingChange?.(true);
      this.notifyListeners();
      return true;
    } catch {
      entry.onPlayingChange?.(false);
      return false;
    }
  }

  togglePlay(id: string) {
    const entry = this.videos.get(id);
    if (!entry) return;
    if (entry.video.paused) {
      entry.userPaused = false;
      void this.requestPlay(id);
    } else {
      entry.userPaused = true;
      entry.video.pause();
      entry.onPlayingChange?.(false);
      if (this.activeId === id) this.activeId = null;
      this.notifyListeners();
    }
  }

  resumeActive() {
    if (!this.playbackEnabled || !this.activeId) return;
    const entry = this.videos.get(this.activeId);
    if (!entry || entry.userPaused) return;
    if (entry.video.readyState < 2) return;
    void this.requestPlay(this.activeId);
  }
}

export const videoPlaybackController = new VideoPlaybackControllerImpl();
