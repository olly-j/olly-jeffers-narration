document.getElementById("year").textContent = new Date().getFullYear();

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
  const currentTime = player.querySelector("[data-current-time]");
  const duration = player.querySelector("[data-duration]");
  const title = player.querySelector("h3").textContent.trim();

  const setPlayingState = (isPlaying) => {
    player.classList.toggle("is-playing", isPlaying);
    symbol.textContent = isPlaying ? "Ⅱ" : "▶";
    action.textContent = isPlaying ? "Pause" : "Play";
    toggle.setAttribute("aria-label", `${isPlaying ? "Pause" : "Play"} ${title}`);
  };

  const updateProgress = () => {
    const progress = audio.duration ? audio.currentTime / audio.duration : 0;
    seek.value = String(Math.round(progress * 1000));
    played.style.width = `${progress * 100}%`;
    currentTime.textContent = formatTime(audio.currentTime);
  };

  toggle.addEventListener("click", async () => {
    if (audio.paused) {
      players.forEach((otherPlayer) => {
        const otherAudio = otherPlayer.querySelector("audio");
        if (otherAudio !== audio) otherAudio.pause();
      });

      try {
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
  audio.addEventListener("play", () => setPlayingState(true));
  audio.addEventListener("pause", () => setPlayingState(false));
  audio.addEventListener("ended", () => {
    audio.currentTime = 0;
    updateProgress();
  });
});
