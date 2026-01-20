// GymTick - Rest Timer Utility
// Handles countdown logic and UI updates for resting between sets

const timerState = {
    duration: 90, // Default 90 seconds
    remaining: 0,
    interval: null,
    isActive: false,
    isPaused: false,
    pausedAt: null,
    audioEnabled: true // NEW: Audio cues toggle
};

// NEW: Audio cue system
const audioContext = typeof AudioContext !== 'undefined' ? new AudioContext() : null;

function playBeep(frequency = 800, duration = 100) {
    if (!timerState.audioEnabled || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
}

function initTimer() {
    const timerHtml = `
        <div id="rest-timer-overlay" class="timer-overlay hidden">
            <div class="timer-card">
                <div class="timer-label">RESTING</div>
                <div id="timer-display" class="timer-display">01:30</div>
                <div class="timer-controls">
                    <button id="timer-subtract" class="btn-timer">-15s</button>
                    <button id="timer-toggle" class="btn-timer-main">SKIP</button>
                    <button id="timer-add" class="btn-timer">+15s</button>
                </div>
                <div class="timer-presets">
                    <button class="btn-preset" data-seconds="30">30s</button>
                    <button class="btn-preset" data-seconds="60">60s</button>
                    <button class="btn-preset" data-seconds="90">90s</button>
                    <button class="btn-preset" data-seconds="120">120s</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', timerHtml);

    document.getElementById('timer-subtract').onclick = () => adjustTimer(-15);
    document.getElementById('timer-add').onclick = () => adjustTimer(15);
    document.getElementById('timer-toggle').onclick = () => {
        if (timerState.isPaused) {
            resumeTimer();
        } else {
            stopTimer();
        }
    };

    // NEW: Preset buttons
    document.querySelectorAll('.btn-preset').forEach(btn => {
        btn.onclick = () => {
            const seconds = parseInt(btn.dataset.seconds);
            startTimer(seconds);
        };
    });

    // Auto-pause when page becomes hidden (user switches apps)
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

function handleVisibilityChange() {
    if (document.hidden && timerState.isActive && !timerState.isPaused) {
        // Page hidden - auto-pause
        pauseTimer();
    } else if (!document.hidden && timerState.isPaused) {
        // Page visible again - auto-resume
        resumeTimer();
    }
}

function startTimer(seconds = 90) {
    if (timerState.interval) clearInterval(timerState.interval);

    timerState.remaining = seconds;
    timerState.isActive = true;
    timerState.isPaused = false;

    updateTimerDisplay();
    document.getElementById('rest-timer-overlay').classList.remove('hidden');

    timerState.interval = setInterval(() => {
        if (!timerState.isPaused) {
            timerState.remaining--;
            updateTimerDisplay();

            // NEW: Audio cues
            if (timerState.remaining === 10) {
                playBeep(600, 150); // Low beep at 10s
            } else if (timerState.remaining === 5) {
                playBeep(800, 150); // Mid beep at 5s
            } else if (timerState.remaining === 0) {
                playBeep(1000, 300); // High beep at 0s
                stopTimer();
                notifyTimerEnd();
            }
        }
    }, 1000);
}

function pauseTimer() {
    timerState.isPaused = true;
    timerState.pausedAt = Date.now();
    document.getElementById('timer-toggle').textContent = 'RESUME';
    document.querySelector('.timer-label').textContent = 'PAUSED';
}

function resumeTimer() {
    timerState.isPaused = false;
    timerState.pausedAt = null;
    document.getElementById('timer-toggle').textContent = 'SKIP';
    document.querySelector('.timer-label').textContent = 'RESTING';
}

function stopTimer() {
    clearInterval(timerState.interval);
    timerState.interval = null;
    timerState.isActive = false;
    timerState.isPaused = false;
    document.getElementById('rest-timer-overlay').classList.add('hidden');
    document.getElementById('timer-toggle').textContent = 'SKIP';
    document.querySelector('.timer-label').textContent = 'RESTING';
}

function adjustTimer(seconds) {
    timerState.remaining = Math.max(0, timerState.remaining + seconds);
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const min = Math.floor(timerState.remaining / 60);
    const sec = timerState.remaining % 60;
    document.getElementById('timer-display').textContent =
        `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function notifyTimerEnd() {
    if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
    }
}

// Auto-trigger timer when an exercise is checked
function handleExerciseChecked() {
    // Only start if not already active
    if (!timerState.isActive) {
        startTimer(90);
    }
}

// NEW: Toggle audio cues
function toggleAudio(enabled) {
    timerState.audioEnabled = enabled;
}

// Export for use in app.js
window.GymTimer = { initTimer, startTimer, stopTimer, handleExerciseChecked, toggleAudio };
