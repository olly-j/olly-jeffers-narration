document.getElementById("year").textContent = new Date().getFullYear();

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const sectionLabels = [...document.querySelectorAll(".section-label")];
const fitItems = [...document.querySelectorAll(".fit__item")];
const storyImage = document.querySelector(".story__image");
const storySection = document.querySelector(".story");

if ("IntersectionObserver" in window && !reducedMotion.matches) {
  document.documentElement.dataset.motionReady = "";

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (entry.target === storySection) {
          storyImage.dataset.entered = "";
          sectionObserver.unobserve(entry.target);
          return;
        }
        entry.target.dataset.entered = "";
        sectionObserver.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -12%", threshold: 0.2 },
  );

  sectionLabels.forEach((label) => {
    label.dataset.motion = "pending";
    sectionObserver.observe(label);
  });

  fitItems.forEach((item) => {
    item.dataset.motion = "glyph";
    sectionObserver.observe(item);
  });

  if (storyImage && storySection) {
    storyImage.dataset.motion = "reveal";
    sectionObserver.observe(storySection);
  }

  reducedMotion.addEventListener("change", ({ matches }) => {
    if (!matches) return;
    sectionLabels.forEach((label) => {
      label.dataset.entered = "";
      sectionObserver.unobserve(label);
    });
    fitItems.forEach((item) => {
      item.dataset.entered = "";
      sectionObserver.unobserve(item);
    });
    if (storyImage && storySection) {
      storyImage.dataset.entered = "";
      sectionObserver.unobserve(storySection);
    }
  });
}

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
};

const players = [...document.querySelectorAll("[data-audio-player]")];

players.forEach((player) => {
  const audio = player.querySelector("audio");
  const toggle = player.querySelector(".player__toggle");
  const symbol = player.querySelector(".player__symbol");
  const action = player.querySelector(".player__action");
  const seek = player.querySelector(".waveform__seek");
  const played = player.querySelector(".waveform__played");
  const liveWaveform = player.querySelector(".waveform__live");
  const currentTime = player.querySelector("[data-current-time]");
  const duration = player.querySelector("[data-duration]");
  const title = player.querySelector("h3").textContent.trim();
  let audioContext;
  let analyser;
  let frequencyData;
  let animationFrame;
  let clearTimer;
  let lastPaint = 0;
  let playerIsVisible = true;
  let waveformGradient;

  const resizeLiveWaveform = () => {
    if (!liveWaveform) return;
    const { width, height } = liveWaveform.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    liveWaveform.width = Math.max(1, Math.round(width * pixelRatio));
    liveWaveform.height = Math.max(1, Math.round(height * pixelRatio));
    const context = liveWaveform.getContext("2d");
    waveformGradient = context.createLinearGradient(0, 0, liveWaveform.width, 0);
    waveformGradient.addColorStop(0, "rgba(233, 125, 97, 0.88)");
    waveformGradient.addColorStop(0.52, "rgba(243, 189, 119, 0.96)");
    waveformGradient.addColorStop(1, "rgba(198, 213, 171, 0.9)");
  };

  const clearLiveWaveform = () => {
    if (!liveWaveform) return;
    liveWaveform.getContext("2d").clearRect(0, 0, liveWaveform.width, liveWaveform.height);
  };

  const drawLiveWaveform = (timestamp) => {
    if (
      !analyser ||
      !liveWaveform ||
      audio.paused ||
      document.hidden ||
      !playerIsVisible ||
      reducedMotion.matches
    ) {
      animationFrame = undefined;
      return;
    }

    animationFrame = requestAnimationFrame(drawLiveWaveform);
    if (timestamp - lastPaint < 33) return;
    lastPaint = timestamp;

    analyser.getByteFrequencyData(frequencyData);

    const context = liveWaveform.getContext("2d");
    const width = liveWaveform.width;
    const height = liveWaveform.height;
    const barCount = 36;
    const gap = Math.max(2, width * 0.004);
    const barWidth = Math.max(2, (width - gap * (barCount - 1)) / barCount);

    context.clearRect(0, 0, width, height);
    context.fillStyle = waveformGradient;

    for (let index = 0; index < barCount; index += 1) {
      const frequencyIndex = Math.floor((index / barCount) * frequencyData.length * 0.72);
      const strength = frequencyData[frequencyIndex] / 255;
      const barHeight = Math.max(height * 0.055, strength * height * 0.76);
      const x = index * (barWidth + gap);
      const y = (height - barHeight) / 2;
      const radius = Math.min(barWidth / 2, barHeight / 2);

      if ("roundRect" in context) {
        context.beginPath();
        context.roundRect(x, y, barWidth, barHeight, radius);
        context.fill();
      } else {
        context.fillRect(x, y, barWidth, barHeight);
      }
    }
  };

  const startLiveWaveform = () => {
    if (!analyser || reducedMotion.matches || !playerIsVisible || document.hidden) return;
    window.clearTimeout(clearTimer);
    if (!animationFrame) animationFrame = requestAnimationFrame(drawLiveWaveform);
  };

  const stopLiveWaveform = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = undefined;
    if (!analyser) return;
    window.clearTimeout(clearTimer);
    clearTimer = window.setTimeout(clearLiveWaveform, reducedMotion.matches ? 0 : 180);
  };

  const prepareLiveWaveform = async () => {
    if (!liveWaveform || reducedMotion.matches || analyser) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    try {
      audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(audio);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.82;
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      resizeLiveWaveform();
      if ("ResizeObserver" in window) {
        const resizeObserver = new ResizeObserver(resizeLiveWaveform);
        resizeObserver.observe(liveWaveform);
      }
      player.classList.add("has-live-visualiser");
    } catch {
      analyser = undefined;
      player.classList.remove("has-live-visualiser");
    }
  };

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      playerIsVisible = entry.isIntersecting;
      if (!audio.paused && playerIsVisible) startLiveWaveform();
      if (!playerIsVisible) stopLiveWaveform();
    }).observe(player);
  }

  document.addEventListener("visibilitychange", () => {
    if (!audio.paused && !document.hidden) startLiveWaveform();
    if (document.hidden) stopLiveWaveform();
  });

  reducedMotion.addEventListener("change", ({ matches }) => {
    if (matches) {
      player.classList.remove("has-live-visualiser");
      stopLiveWaveform();
    } else if (analyser) {
      player.classList.add("has-live-visualiser");
      if (!audio.paused) startLiveWaveform();
    }
  });

  const setPlayingState = (isPlaying) => {
    player.classList.toggle("is-playing", isPlaying);
    symbol.textContent = isPlaying ? "Ⅱ" : "▶";
    action.textContent = isPlaying ? "Pause" : "Play";
    toggle.setAttribute("aria-label", `${isPlaying ? "Pause" : "Play"} ${title}`);
  };

  const updateProgress = () => {
    const progress = audio.duration ? audio.currentTime / audio.duration : 0;
    seek.value = String(Math.round(progress * 1000));
    played.style.clipPath = `inset(0 ${100 - progress * 100}% 0 0)`;
    currentTime.textContent = formatTime(audio.currentTime);
  };

  toggle.addEventListener("click", async () => {
    if (audio.paused) {
      players.forEach((otherPlayer) => {
        const otherAudio = otherPlayer.querySelector("audio");
        if (otherAudio !== audio) otherAudio.pause();
      });

      try {
        await prepareLiveWaveform();
        if (audioContext?.state === "suspended") await audioContext.resume();
        await audio.play();
      } catch {
        setPlayingState(false);
      }
    } else {
      audio.pause();
    }
  });

  seek.addEventListener("input", () => {
    if (!audio.duration) return;
    audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
    updateProgress();
  });

  audio.addEventListener("loadedmetadata", () => {
    duration.textContent = formatTime(Math.ceil(audio.duration));
    updateProgress();
  });
  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("play", () => {
    setPlayingState(true);
    startLiveWaveform();
  });
  audio.addEventListener("pause", () => {
    setPlayingState(false);
    stopLiveWaveform();
  });
  audio.addEventListener("ended", () => {
    audio.currentTime = 0;
    updateProgress();
  });
});
