// Theme toggle
const toggle = document.getElementById('themeToggle');
const html = document.documentElement;

// Load saved theme or default to dark
const saved = localStorage.getItem('theme');
if (saved) {
  html.setAttribute('data-theme', saved);
}

toggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// Background audio player
// State is kept in localStorage so the track survives page navigation.
const audio = document.getElementById('bgAudio');
const player = document.getElementById('audioPlayer');

if (audio && player) {
  const playToggle = document.getElementById('audioToggle');
  const muteToggle = document.getElementById('audioMute');
  const volumeSlider = document.getElementById('audioVolume');

  const STORE = {
    volume: 'bgVolume',
    muted: 'bgMuted',
    time: 'bgTime',
    playing: 'bgPlaying',
  };

  const read = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  };

  const write = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable (private mode) — playback still works */
    }
  };

  // Restore volume and mute
  const savedVolume = parseFloat(read(STORE.volume, '0.4'));
  const volume = Number.isFinite(savedVolume) ? Math.min(Math.max(savedVolume, 0), 1) : 0.4;
  const muted = read(STORE.muted, '0') === '1';

  audio.volume = volume;
  audio.muted = muted;
  volumeSlider.value = volume;
  player.classList.toggle('is-muted', muted);

  const paintSlider = () => {
    volumeSlider.style.setProperty('--volume', `${volumeSlider.value * 100}%`);
  };
  paintSlider();

  const seekTo = (seconds) => {
    if (audio.readyState >= 1) {
      audio.currentTime = seconds;
    } else {
      audio.addEventListener('loadedmetadata', () => { audio.currentTime = seconds; }, { once: true });
    }
  };

  const savedTime = parseFloat(read(STORE.time, '0'));
  if (Number.isFinite(savedTime) && savedTime > 0) {
    seekTo(savedTime);
  }

  playToggle.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().catch(() => { /* playback blocked */ });
    } else {
      audio.pause();
    }
  });

  muteToggle.addEventListener('click', () => {
    audio.muted = !audio.muted;
    player.classList.toggle('is-muted', audio.muted);
    write(STORE.muted, audio.muted ? '1' : '0');
  });

  volumeSlider.addEventListener('input', () => {
    const next = parseFloat(volumeSlider.value);
    audio.volume = next;
    paintSlider();
    write(STORE.volume, next);

    // Dragging the slider off zero is an implicit unmute
    if (next > 0 && audio.muted) {
      audio.muted = false;
      player.classList.toggle('is-muted', false);
      write(STORE.muted, '0');
    }
  });

  const reflectState = (isPlaying) => {
    player.classList.toggle('is-playing', isPlaying);
    playToggle.setAttribute('aria-pressed', String(isPlaying));
    playToggle.setAttribute('aria-label', isPlaying ? 'Pause background music' : 'Play background music');
  };

  audio.addEventListener('play', () => {
    reflectState(true);
    write(STORE.playing, '1');
  });

  audio.addEventListener('pause', () => {
    reflectState(false);
    write(STORE.playing, '0');
  });

  // Persist position at most once every two seconds, plus on the way out.
  // A page the visitor never played on leaves currentTime at 0, and writing
  // that would wipe the position saved by an earlier page.
  const saveTime = () => {
    if (audio.currentTime > 0) {
      write(STORE.time, audio.currentTime);
    }
  };

  let lastSaved = 0;
  audio.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (now - lastSaved > 2000) {
      lastSaved = now;
      saveTime();
    }
  });

  window.addEventListener('pagehide', saveTime);

  // Resume across navigation. Browsers may reject this until the visitor has
  // interacted with the site, in which case the player just stays paused.
  if (read(STORE.playing, '0') === '1') {
    audio.play().catch(() => reflectState(false));
  }
}
