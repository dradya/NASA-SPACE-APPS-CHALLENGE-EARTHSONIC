# src/state — playback state

`PlaybackController` (plain TypeScript class) owns time: status, step, speed, loop, volume, intensity, mode.
React reads it through `useSyncExternalStore`. While playing, the audio transport clock is the master and the step is derived from it.
Created in Phase 6/7.
