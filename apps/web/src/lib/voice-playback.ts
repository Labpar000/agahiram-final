/** Pause any other in-chat voice clip when a new one starts. */
let activeVoiceAudio: HTMLAudioElement | null = null;

export function setActiveVoiceAudio(audio: HTMLAudioElement | null): void {
  if (activeVoiceAudio && activeVoiceAudio !== audio && !activeVoiceAudio.paused) {
    activeVoiceAudio.pause();
  }
  activeVoiceAudio = audio;
}

export function clearActiveVoiceAudio(audio: HTMLAudioElement): void {
  if (activeVoiceAudio === audio) activeVoiceAudio = null;
}
