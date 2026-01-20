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

        let lastTimeHtml = '';
        if (lastStats) {
            // Find weight/reps for first set as a summary or show range
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

    // Tech Upgrade: Calculate and show analytics
    updateAnalytics(logs);

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

function updateAnalytics(logs) {
    const totalSessions = logs.length;

    // Calculate consistency for the current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyLogs = logs.filter(log => {
        const logDate = new Date(log.date);
        return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
    });

    const sessionsThisMonth = monthlyLogs.length;

    // Total scheduled sessions this month so far
    const totalDaysSoFar = now.getDate();
    let scheduledWorkoutsSoFar = 0;
    const schedule = getSchedule();
    const templates = getTemplates();

    for (let i = 1; i <= totalDaysSoFar; i++) {
        const d = new Date(currentYear, currentMonth, i);
        const dayIdx = d.getDay();
        const templateId = schedule[dayIdx];
        if (templateId && templates[templateId] && templates[templateId].id !== 'rest') {
            scheduledWorkoutsSoFar++;
        }
    }

    const consistency = scheduledWorkoutsSoFar > 0
        ? Math.round((sessionsThisMonth / scheduledWorkoutsSoFar) * 100)
        : 100;

    const missed = Math.max(0, scheduledWorkoutsSoFar - sessionsThisMonth);

    // Update UI
    document.getElementById('stats-total-sessions').textContent = totalSessions;
    document.getElementById('stats-monthly-progress').textContent = `${consistency}%`;
    document.getElementById('stats-missed-workouts').textContent = missed;
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
                <input type="text" class="editor-exercise-input" 
                    value="${ex.name}" 
                    onchange="updateExerciseName('${templateId}', ${exIndex}, this.value)">
                
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
