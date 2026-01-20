// GymTick - Rest Timer Utility
// Handles countdown logic and UI updates for resting between sets

const timerState = {
    duration: 90, // Default 90 seconds
    remaining: 0,
    interval: null,
    isActive: false
};

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
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', timerHtml);

    document.getElementById('timer-subtract').onclick = () => adjustTimer(-15);
    document.getElementById('timer-add').onclick = () => adjustTimer(15);
    document.getElementById('timer-toggle').onclick = stopTimer;
}

function startTimer(seconds = 90) {
    if (timerState.interval) clearInterval(timerState.interval);

    timerState.remaining = seconds;
    timerState.isActive = true;

    updateTimerDisplay();
    document.getElementById('rest-timer-overlay').classList.remove('hidden');

    timerState.interval = setInterval(() => {
        timerState.remaining--;
        updateTimerDisplay();

        if (timerState.remaining <= 0) {
            stopTimer();
            notifyTimerEnd();
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timerState.interval);
    timerState.interval = null;
    timerState.isActive = false;
    document.getElementById('rest-timer-overlay').classList.add('hidden');
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
    // Optional: play a subtle beep
}

// Auto-trigger timer when an exercise is checked
function handleExerciseChecked() {
    // Only start if not already active or if user prefers auto-timer
    startTimer(90);
}

// Export for use in app.js
window.GymTimer = { initTimer, startTimer, stopTimer, handleExerciseChecked };
