// GymTick - Main Application Logic
// Handles UI rendering, user interactions, and state management

// ==================== STATE ====================
let currentView = 'today';
let currentWorkout = null;
let manualWorkout = null; // State for manually selected workout
let completedExercises = [];

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeStorage();
    GymTimer.initTimer(); // Tech Upgrade: Initialize Rest Timer
    loadTodayView();
    setupNavigation();
    setupEventListeners();
    setupQuickAdd(); // NEW: Quick add exercise
    setupVoiceNotes(); // NEW: Voice notes
});

// ==================== NAVIGATION ====================
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = item.getAttribute('data-view');

            // If clicking Today but we were viewing a manual workout, keep the manual workout?
            // Or reset to today's actual workout?
            // Decision: If user explicitly clicks "Today", we should probably show the *active* workout.
            // If manualWorkout is set, that IS the active workout.

            switchView(viewName);
        });
    });
}

function switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    // Show selected view
    document.getElementById(`${viewName}-view`).classList.add('active');

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.getElementById(`nav-${viewName}`).classList.add('active');

    currentView = viewName;

    // Load view-specific content
    if (viewName === 'today') {
        loadTodayView();
    } else if (viewName === 'history') {
        loadHistoryView();
    } else if (viewName === 'editor') {
        loadEditorView();
    }
}

// ==================== TODAY VIEW ====================
function loadTodayView() {
    const today = new Date();
    const dayIndex = today.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Determine which workout to show
    let displayWorkout;
    let isManual = false;

    if (manualWorkout) {
        displayWorkout = manualWorkout;
        // Update date display to show it's a manual session or just keep today's date?
        // Let's keep today's date but maybe subtitle the context
        // Actually simplicity is key. Just show the workout.
        isManual = true;
    } else {
        displayWorkout = getWorkoutForDay(dayIndex);
    }

    currentWorkout = displayWorkout;

    // Update date display
    const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    document.getElementById('today-date').textContent = today.toLocaleDateString('en-US', dateOptions);

    // Handle rest day (only if NOT manually overridden)
    if (currentWorkout.id === 'rest' && !isManual) {
        showRestDay();
        return;
    }

    // Check if we already completed this SPECIFIC workout today
    // If manual, we might want to allow re-doing it, or check log.
    // Let's check if there is a log for today with this templateId
    if (isWorkoutCompletedToday(currentWorkout.id) && !isManual) {
        // Only auto-show "Already Completed" if it's the default daily workflow.
        // If user manually started a routine, they probably want to do it even if they did it before?
        // Or maybe they want to see it's done.
        // Let's stick to: if completed today, show complete screen.
        showWorkoutAlreadyCompleted();
        return;
    }

    // Show workout
    document.getElementById('rest-day-container').classList.add('hidden');
    document.getElementById('workout-container').classList.remove('hidden');
    document.getElementById('today-workout-name').textContent = currentWorkout.name;

    // Load saved progress
    const savedProgress = getCurrentProgress();
    completedExercises = savedProgress.completedExercises || [];

    // Render exercises
    renderExercises();
    updateProgress();

    // NEW: Update streak counter
    updateStreakDisplay();

    // Render Weekly Plan (Horizontal Schedule)
    renderHorizontalSchedule();
}

function renderHorizontalSchedule() {
    const schedule = getSchedule();
    const templates = getTemplates();
    const scheduleContainer = document.getElementById('schedule-container');
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    scheduleContainer.innerHTML = '<div class="schedule-list"></div>';
    const list = scheduleContainer.querySelector('.schedule-list');

    dayNames.forEach((dayLabel, index) => {
        const templateId = schedule[index];
        const workout = templates[templateId];
        const isToday = index === new Date().getDay() && !manualWorkout;

        const dayDiv = document.createElement('div');
        dayDiv.className = `schedule-item ${isToday ? 'active' : ''}`;
        dayDiv.innerHTML = `
            <div class="schedule-day-label">${dayLabel}</div>
            <div class="schedule-workout-bubble" onclick="startManualWorkout('${templateId}')">
                ${workout.name.split(' ')[0]}
            </div>
        `;
        list.appendChild(dayDiv);
    });
}

function showRestDay() {
    document.getElementById('today-workout-name').textContent = 'Rest Day';
    document.getElementById('rest-day-container').classList.remove('hidden');
    document.getElementById('workout-container').classList.add('hidden');
}

function showWorkoutAlreadyCompleted() {
    document.getElementById('today-workout-name').textContent = currentWorkout.name;
    document.getElementById('rest-day-container').innerHTML = `
    <div class="rest-day-emoji">✅</div>
    <h2 class="rest-day-title">Workout Complete!</h2>
    <p class="rest-day-subtitle">You've already completed this workout today. Great job!</p>
    <button id="redo-btn" class="btn btn-primary" style="margin-top: 1rem;">Do it again</button>
  `;
    document.getElementById('rest-day-container').classList.remove('hidden');
    document.getElementById('workout-container').classList.add('hidden');

    // Add listener for redo
    document.getElementById('redo-btn').addEventListener('click', () => {
        // Allow re-doing
        manualWorkout = currentWorkout; // Force manual mode effectively
        document.getElementById('rest-day-container').classList.add('hidden');
        document.getElementById('workout-container').classList.remove('hidden');
        loadTodayView();
    });
}

function renderExercises() {
    const exerciseList = document.getElementById('exercise-list');
    exerciseList.innerHTML = '';

    const todayProgress = getCurrentProgress();
    const currentSetData = todayProgress.setData || {};

    currentWorkout.exercises.forEach(exercise => {
        const isCompleted = completedExercises.includes(exercise.id);
        const setNum = exercise.sets || 1;
        const lastStats = getLastStats(exercise.id);

        // NEW: Get last session data for progressive overload
        const lastSession = getLastExerciseSession(exercise.id);
        let lastTimeHtml = '';

        if (lastSession) {
            const suggestion = suggestProgression(lastSession.weight, lastSession.reps);
            lastTimeHtml = `
                <div class="exercise-last-time">
                    Last: ${lastSession.weight}kg × ${lastSession.reps} reps
                    <span class="progression-hint">${suggestion.message}</span>
                </div>
            `;
        } else if (lastStats) {
            // Fallback to old stats display
            const w = lastStats[`${exercise.id}-set-1-weight`];
            const r = lastStats[`${exercise.id}-set-1-reps`];
            if (w || r) {
                lastTimeHtml = `<div class="exercise-last-time">Last: ${w ? w + 'kg' : ''}${w && r ? ' x ' : ''}${r ? r + ' reps' : ''}</div>`;
            }
        }

        const li = document.createElement('li');
        li.className = `exercise-item-container ${isCompleted ? 'completed' : ''}`;
        li.setAttribute('data-exercise-id', exercise.id);

        let setsHtml = '';
        if (setNum > 1) {
            setsHtml = `
                <div class="set-list">
                    ${Array.from({ length: setNum }).map((_, i) => {
                const setId = `${exercise.id}-set-${i + 1}`;
                const isSetDone = completedExercises.includes(setId);
                const weight = currentSetData[`${setId}-weight`] || '';
                const reps = currentSetData[`${setId}-reps`] || '';

                return `
                            <div class="set-item ${isSetDone ? 'completed' : ''}" onclick="event.stopPropagation(); toggleSet('${exercise.id}', ${i + 1})">
                                <div class="set-checkbox"></div>
                                <div class="set-label">Set ${i + 1}</div>
                                <div class="set-inputs" onclick="event.stopPropagation()">
                                    <input type="number" placeholder="kg" value="${weight}" 
                                        oninput="saveSetData('${setId}', 'weight', this.value)" 
                                        class="set-input-field">
                                    <span class="set-input-divider">×</span>
                                    <input type="number" placeholder="reps" value="${reps}" 
                                        oninput="saveSetData('${setId}', 'reps', this.value)" 
                                        class="set-input-field">
                                </div>
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        } else {
            // If single set, still show inputs in a subtle way or in header?
            // Let's keep it simple: for now, inputs only show for multi-set exercises or add a generic one
            // Recommendation: Burpees (15x3) has sets. Warmup/Stretching don't really need kg/reps.
        }

        li.innerHTML = `
      <div class="exercise-item" onclick="toggleExercise('${exercise.id}')">
        <div class="exercise-checkbox"></div>
        <div class="exercise-content">
          <div class="exercise-name">${exercise.name}</div>
          ${exercise.notes ? `<div class="exercise-notes">${exercise.notes}</div>` : ''}
          ${lastTimeHtml}
        </div>
      </div>
      ${setsHtml}
    `;

        exerciseList.appendChild(li);
    });
}

function saveSetData(setId, type, value) {
    saveExerciseProgress(`${setId}-${type}`, value);
}

function toggleSet(exerciseId, setIndex) {
    const setId = `${exerciseId}-set-${setIndex}`;
    const isCompleted = completedExercises.includes(setId);

    if (isCompleted) {
        completedExercises = completedExercises.filter(id => id !== setId);
    } else {
        completedExercises.push(setId);
        GymTimer.handleExerciseChecked(); // Auto-start rest timer
        if ('vibrate' in navigator) navigator.vibrate(50);
    }

    // Check if ALL sets are completed to auto-check the main exercise
    const exercise = currentWorkout.exercises.find(e => e.id === exerciseId);
    const totalSets = exercise.sets || 1;
    let completedSetsForEx = 0;
    for (let i = 1; i <= totalSets; i++) {
        if (completedExercises.includes(`${exerciseId}-set-${i}`)) completedSetsForEx++;
    }

    if (completedSetsForEx === totalSets && !completedExercises.includes(exerciseId)) {
        completedExercises.push(exerciseId);
    } else if (completedSetsForEx < totalSets && completedExercises.includes(exerciseId)) {
        completedExercises = completedExercises.filter(id => id !== exerciseId);
    }

    saveExerciseProgress(setId, !isCompleted);
    // Also save exercise status if it changed
    saveExerciseProgress(exerciseId, completedExercises.includes(exerciseId));

    // Update UI partially if possible, but renderExercises is safest
    renderExercises();
    updateProgress();
}

function toggleExercise(exerciseId) {
    const isCompleted = completedExercises.includes(exerciseId);
    const exercise = currentWorkout.exercises.find(e => e.id === exerciseId);
    const totalSets = exercise.sets || 1;

    if (isCompleted) {
        // Uncomplete exercise and ALL its sets
        completedExercises = completedExercises.filter(id => id !== exerciseId && !id.startsWith(`${exerciseId}-set-`));
    } else {
        // Complete exercise and ALL its sets
        completedExercises.push(exerciseId);
        for (let i = 1; i <= totalSets; i++) {
            const setId = `${exerciseId}-set-${i}`;
            if (!completedExercises.includes(setId)) completedExercises.push(setId);
        }

        GymTimer.handleExerciseChecked();
        if ('vibrate' in navigator) navigator.vibrate(50);
    }

    // Save main exercise state
    saveExerciseProgress(exerciseId, !isCompleted);
    // Save all sets state
    for (let i = 1; i <= totalSets; i++) {
        saveExerciseProgress(`${exerciseId}-set-${i}`, !isCompleted);
    }

    renderExercises();
    updateProgress();
}

function updateProgress() {
    // Total sets across all exercises
    const totalSetsCount = currentWorkout.exercises.reduce((sum, ex) => sum + (ex.sets || 1), 0);

    // Count completed sets
    let completedSetsCount = 0;
    currentWorkout.exercises.forEach(ex => {
        const setNum = ex.sets || 1;
        if (setNum === 1) {
            if (completedExercises.includes(ex.id)) completedSetsCount++;
        } else {
            for (let i = 1; i <= setNum; i++) {
                if (completedExercises.includes(`${ex.id}-set-${i}`)) completedSetsCount++;
            }
        }
    });

    const percentage = totalSetsCount > 0 ? (completedSetsCount / totalSetsCount) * 100 : 0;

    document.getElementById('progress-text').textContent = `${completedSetsCount}/${totalSetsCount} sets completed`;
    document.getElementById('progress-bar').style.width = `${percentage}%`;

    // Enable/disable complete button
    const completeBtn = document.getElementById('complete-btn');
    if (completedSetsCount === totalSetsCount && totalSetsCount > 0) {
        completeBtn.disabled = false;
    } else {
        completeBtn.disabled = true;
    }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    document.getElementById('complete-btn').addEventListener('click', handleCompleteWorkout);

    // Tech Feature: Data Portability
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.onclick = exportData;
    }

    const importInput = document.getElementById('import-input');
    if (importInput) {
        importInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                importData(e.target.files[0]).then(() => {
                    alert('Data imported successfully! The app will reload.');
                    window.location.reload();
                }).catch(err => {
                    alert('Import failed: ' + err);
                });
            }
        };
    }

    // Auth Event Listeners
    const loginBtn = document.getElementById('login-google-btn');
    if (loginBtn) {
        loginBtn.onclick = () => {
            if (window.SyncService) window.SyncService.signInWithGoogle();
        };
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            if (window.SyncService && confirm('Sign out of your account?')) {
                window.SyncService.signOut();
            }
        };
    }
}

function handleCompleteWorkout() {
    // Confirmation dialog
    const confirmed = confirm('Complete this workout? This will log your progress.');

    if (!confirmed) {
        return;
    }

    // Log workout
    completeWorkout(currentWorkout.id, completedExercises);

    // Reset manual workout state after completion
    manualWorkout = null;

    // Vibration feedback
    if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
    }

    // Show success animation
    showSuccessAnimation();
}

function showSuccessAnimation() {
    const overlay = document.getElementById('success-overlay');
    overlay.classList.remove('hidden');

    // Auto-hide after 2.5 seconds
    setTimeout(() => {
        overlay.classList.add('hidden');

        // Reload today view to show completed state
        loadTodayView();
    }, 2500);
}

// ==================== HISTORY VIEW ====================
function loadHistoryView() {
    const logs = getWorkoutLogs();
    const historyList = document.getElementById('history-list');
    const emptyState = document.getElementById('empty-history');

    if (logs.length === 0) {
        historyList.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    historyList.innerHTML = '';

    // NEW: Enhanced stats dashboard
    updateStatsDisplay(logs);

    // Sort logs by date (newest first)
    const sortedLogs = logs.sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedLogs.forEach(log => {
        const templates = getTemplates();
        const workout = templates[log.workoutTemplateId];
        const date = new Date(log.date);

        const li = document.createElement('li');
        li.className = 'history-item';

        const dateOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        const formattedDate = date.toLocaleDateString('en-US', dateOptions);

        const completedTime = new Date(log.completedAt).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });

        li.innerHTML = `
      <div class="history-content">
        <div class="history-date">${formattedDate}</div>
        <div class="history-workout">${workout ? workout.name : 'Unknown Workout'}</div>
        <div class="history-status">✓ Completed at ${completedTime}</div>
      </div>
      <button class="btn-delete" data-timestamp="${log.completedAt}">×</button>
    `;

        const deleteBtn = li.querySelector('.btn-delete');
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Delete this workout log?')) {
                deleteWorkoutLog(log.completedAt);
                loadHistoryView();
            }
        };

        historyList.appendChild(li);
    });
}

// NEW: Enhanced stats display
function updateStatsDisplay(logs) {
    const stats = getQuickStats();

    document.getElementById('stats-total-sessions').textContent = stats.totalWorkouts;
    document.getElementById('stats-monthly-sessions').textContent = stats.monthlyWorkouts;
    document.getElementById('stats-current-streak').textContent = stats.currentStreak;
    document.getElementById('stats-consistent-day').textContent = stats.mostConsistentDay;

    // NEW: Update consistency
    updateConsistencyDisplay();

    // NEW: Update badges
    updateBadgesDisplay();
}

// ==================== EDITOR VIEW (New) ====================
function loadEditorView() {
    const schedule = getSchedule();
    const templates = getTemplates();
    const editorContainer = document.getElementById('editor-container');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    editorContainer.innerHTML = '';

    dayNames.forEach((dayName, index) => {
        const templateId = schedule[index];
        const workout = templates[templateId];

        if (!workout || workout.id === 'rest') {
            // For now, let's allow editing routines. Rest day is fixed.
            return;
        }

        const dayCard = document.createElement('div');
        dayCard.className = 'editor-day-card';

        const exercisesHtml = workout.exercises.map((ex, exIndex) => `
            <div class="editor-exercise-item">
                <div class="editor-exercise-header">
                    <input type="text" class="editor-exercise-input" 
                        value="${ex.name}" 
                        onchange="updateExerciseName('${templateId}', ${exIndex}, this.value)">
                    <button class="btn-voice-note" data-exercise-id="${ex.id}" title="Voice Note">
                        <span class="voice-icon">🎤</span>
                    </button>
                </div>
                
                <div class="editor-sets-control">
                    <span class="editor-sets-label">Sets</span>
                    <button class="editor-btn-icon" onclick="updateExerciseSets('${templateId}', ${exIndex}, -1)">-</button>
                    <span class="editor-sets-value">${ex.sets || 1}</span>
                    <button class="editor-btn-icon" onclick="updateExerciseSets('${templateId}', ${exIndex}, 1)">+</button>
                </div>

                <button class="editor-btn-icon delete" onclick="deleteExercise('${templateId}', ${exIndex})">
                    🗑️
                </button>
            </div>
        `).join('');

        dayCard.innerHTML = `
            <div class="editor-day-header">
                <div class="editor-day-name">${dayName} - ${workout.name}</div>
            </div>
            <div class="editor-exercise-list">
                ${exercisesHtml || '<div class="editor-empty-day">No exercises added yet</div>'}
            </div>
            <button class="editor-add-btn" onclick="addExerciseToTemplate('${templateId}')">
                <span>+</span> Add Exercise
            </button>
        `;

        editorContainer.appendChild(dayCard);
    });
}

function updateExerciseName(templateId, exIndex, newName) {
    const templates = getTemplates();
    if (templates[templateId] && templates[templateId].exercises[exIndex]) {
        templates[templateId].exercises[exIndex].name = newName;
        updateTemplates(templates);
    }
}

function updateExerciseSets(templateId, exIndex, delta) {
    const templates = getTemplates();
    if (templates[templateId] && templates[templateId].exercises[exIndex]) {
        let currentSets = templates[templateId].exercises[exIndex].sets || 1;
        templates[templateId].exercises[exIndex].sets = Math.max(1, currentSets + delta);
        updateTemplates(templates);
        loadEditorView(); // Re-render
    }
}

function deleteExercise(templateId, exIndex) {
    if (!confirm('Delete this exercise from the routine?')) return;

    const templates = getTemplates();
    if (templates[templateId]) {
        templates[templateId].exercises.splice(exIndex, 1);
        updateTemplates(templates);
        loadEditorView();
    }
}

function addExerciseToTemplate(templateId) {
    const templates = getTemplates();
    if (templates[templateId]) {
        templates[templateId].exercises.push({
            id: `${templateId}-${Date.now()}`,
            name: 'New Exercise',
            sets: 3,
            notes: ''
        });
        updateTemplates(templates);
        loadEditorView();
    }
}

function startManualWorkout(workoutId) {
    const templates = getTemplates();
    const workout = templates[workoutId];
    if (workout) {
        manualWorkout = workout;
        switchView('today');
        window.scrollTo(0, 0);
    }
}

// ==================== UTILITY FUNCTIONS ====================
function formatDate(date) {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}
// NEW: Update streak display
function updateStreakDisplay() {
    const streak = calculateWorkoutStreak();
    const streakBadge = document.getElementById('streak-badge');
    const streakCount = document.getElementById('streak-count');

    if (streak > 0) {
        streakBadge.classList.remove('hidden');
        streakCount.textContent = streak;
        streakBadge.title = `${streak} day${streak > 1 ? 's' : ''} in a row!`;
    } else {
        streakBadge.classList.add('hidden');
    }
}
// NEW: Update consistency display
function updateConsistencyDisplay() {
    const percentage = getWeeklyConsistency();
    const bar = document.getElementById('consistency-bar');
    const text = document.getElementById('consistency-percentage');

    bar.style.width = `${percentage}%`;
    text.textContent = `${percentage}%`;

    // Color based on percentage
    if (percentage >= 80) {
        bar.style.background = 'linear-gradient(90deg, var(--success), #34D399)';
    } else if (percentage >= 50) {
        bar.style.background = 'linear-gradient(90deg, var(--accent-primary), var(--accent-hover))';
    } else {
        bar.style.background = 'linear-gradient(90deg, #EF4444, #F87171)';
    }
}

// NEW: Update badges display
function updateBadgesDisplay() {
    const badges = getAchievementBadges();
    const container = document.getElementById('badges-container');
    const noBadges = document.getElementById('no-badges');

    if (badges.length === 0) {
        container.classList.add('hidden');
        noBadges.classList.remove('hidden');
        return;
    }

    container.classList.remove('hidden');
    noBadges.classList.add('hidden');
    container.innerHTML = '';

    badges.forEach(badge => {
        const badgeEl = document.createElement('div');
        badgeEl.className = 'badge-card';
        badgeEl.innerHTML = `
            <div class="badge-icon">${badge.icon}</div>
            <div class="badge-name">${badge.name}</div>
            <div class="badge-description">${badge.description}</div>
        `;
        container.appendChild(badgeEl);
    });
}
// NEW: Quick Add Exercise functionality
function setupQuickAdd() {
    const quickAddBtn = document.getElementById('quick-add-btn');
    const modal = document.getElementById('quick-add-modal');
    const closeBtn = document.getElementById('close-modal');
    const searchInput = document.getElementById('exercise-search');
    const exerciseList = document.getElementById('exercise-list');

    quickAddBtn.onclick = () => {
        modal.classList.remove('hidden');
        populateExercisePicker();
        searchInput.focus();
    };

    closeBtn.onclick = () => {
        modal.classList.add('hidden');
        searchInput.value = '';
    };

    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            searchInput.value = '';
        }
    };

    // Search filter
    searchInput.oninput = () => {
        const query = searchInput.value.toLowerCase();
        populateExercisePicker(query);
    };
}

function populateExercisePicker(searchQuery = '') {
    const templates = getTemplates();
    const exerciseList = document.getElementById('exercise-list');
    exerciseList.innerHTML = '';

    // Collect all unique exercises from all templates
    const allExercises = new Set();
    Object.values(templates).forEach(template => {
        if (template.exercises) {
            template.exercises.forEach(ex => {
                allExercises.add(JSON.stringify({
                    id: ex.id,
                    name: ex.name,
                    sets: ex.sets || 3
                }));
            });
        }
    });

    // Convert back to array and filter by search
    const exercises = Array.from(allExercises)
        .map(str => JSON.parse(str))
        .filter(ex => ex.name.toLowerCase().includes(searchQuery))
        .sort((a, b) => a.name.localeCompare(b.name));

    if (exercises.length === 0) {
        exerciseList.innerHTML = '<div class="empty-state"><p>No exercises found</p></div>';
        return;
    }

    exercises.forEach(exercise => {
        const item = document.createElement('div');
        item.className = 'exercise-picker-item';
        item.innerHTML = `
            <div class="exercise-picker-name">${exercise.name}</div>
            <div class="exercise-picker-sets">${exercise.sets} sets</div>
        `;
        item.onclick = () => addExerciseToWorkout(exercise);
        exerciseList.appendChild(item);
    });
}

function addExerciseToWorkout(exercise) {
    // Add to current workout
    if (!currentWorkout || !currentWorkout.exercises) return;

    // Check if already exists
    if (currentWorkout.exercises.some(ex => ex.id === exercise.id)) {
        alert('Exercise already in workout!');
        return;
    }

    currentWorkout.exercises.push(exercise);

    // Close modal
    document.getElementById('quick-add-modal').classList.add('hidden');
    document.getElementById('exercise-search').value = '';

    // Re-render exercises
    renderExercises();
    updateProgress();

    // Show success toast
    showToast(`Added ${exercise.name} to workout!`);
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}
// NEW: Voice Notes functionality
let mediaRecorder = null;
let audioChunks = [];
let currentRecordingExercise = null;

function setupVoiceNotes() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-voice-note')) {
            const btn = e.target.closest('.btn-voice-note');
            const exerciseId = btn.dataset.exerciseId;

            if (mediaRecorder && mediaRecorder.state === 'recording') {
                stopRecording();
            } else {
                startRecording(exerciseId, btn);
            }
        }
    });
}

async function startRecording(exerciseId, btn) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        currentRecordingExercise = exerciseId;

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await saveVoiceNote(currentRecordingExercise, audioBlob);

            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());

            // Reset UI
            btn.classList.remove('recording');
            btn.querySelector('.voice-icon').textContent = '🎤';

            showToast('Voice note saved!');
        };

        mediaRecorder.start();

        // Update UI
        btn.classList.add('recording');
        btn.querySelector('.voice-icon').textContent = '⏺️';

        showToast('Recording... Tap again to stop');

    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Could not access microphone. Please grant permission.');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
}

async function saveVoiceNote(exerciseId, audioBlob) {
    // Convert blob to base64
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);

    reader.onloadend = async () => {
        const base64Audio = reader.result;

        // Save to localStorage
        const notes = JSON.parse(localStorage.getItem('gymtick_voice_notes') || '{}');
        if (!notes[exerciseId]) {
            notes[exerciseId] = [];
        }

        notes[exerciseId].push({
            audio: base64Audio,
            timestamp: new Date().toISOString(),
            duration: audioBlob.size
        });

        localStorage.setItem('gymtick_voice_notes', JSON.stringify(notes));

        // TODO: Sync to Supabase exercise_notes table
        if (window.SyncService && window.SyncService.isAuthenticated()) {
            try {
                await window.SyncService.saveExerciseNote({
                    exercise_id: exerciseId,
                    note_type: 'voice',
                    voice_url: base64Audio,
                    content: 'Voice note'
                });
            } catch (error) {
                console.error('Failed to sync voice note:', error);
            }
        }
    };
}

// Play voice note
function playVoiceNote(base64Audio) {
    const audio = new Audio(base64Audio);
    audio.play();
}
