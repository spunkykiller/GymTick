// GymTick - Enhanced Storage with Progressive Overload & Streaks
// Handles all data persistence with localStorage + advanced features

const STORAGE_KEYS = {
    SCHEDULE: 'gymtick_schedule',
    WORKOUT_LOGS: 'gymtick_workout_logs',
    CURRENT_PROGRESS: 'gymtick_current_progress',
    TEMPLATES: 'gymtick_templates',
    EXERCISE_HISTORY: 'gymtick_exercise_history' // NEW: For progressive overload
};

// Initialize storage with default data if empty
function initializeStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.SCHEDULE)) {
        localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(DEFAULT_SCHEDULE));
    }

    if (!localStorage.getItem(STORAGE_KEYS.TEMPLATES)) {
        localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(WORKOUT_TEMPLATES));
    }

    if (!localStorage.getItem(STORAGE_KEYS.WORKOUT_LOGS)) {
        localStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify([]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_PROGRESS)) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_PROGRESS, JSON.stringify({}));
    }

    if (!localStorage.getItem(STORAGE_KEYS.EXERCISE_HISTORY)) {
        localStorage.setItem(STORAGE_KEYS.EXERCISE_HISTORY, JSON.stringify([]));
    }
}

// Get current schedule
function getSchedule() {
    const schedule = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
    return schedule ? JSON.parse(schedule) : DEFAULT_SCHEDULE;
}

// Update schedule
function updateSchedule(schedule) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
}

// Get workout templates
function getTemplates() {
    const templates = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    return templates ? JSON.parse(templates) : WORKOUT_TEMPLATES;
}

// Update workout templates
function updateTemplates(templates) {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));

    // Tech Upgrade: Sync to Cloud
    if (window.SyncService) {
        window.SyncService.syncTemplates(templates);
    }
}

// Get current progress for today
function getCurrentProgress() {
    const today = new Date().toDateString();
    const allProgress = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_PROGRESS) || '{}');
    return allProgress[today] || { completedExercises: [], setData: {} };
}

// Save progress for an exercise, set, or specific set data (weight/reps)
function saveExerciseProgress(id, value) {
    const today = new Date().toDateString();
    const allProgress = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_PROGRESS) || '{}');

    if (!allProgress[today]) {
        allProgress[today] = { completedExercises: [], setData: {} };
    }

    if (!allProgress[today].setData) allProgress[today].setData = {};

    if (typeof value === 'boolean') {
        // Handle completion toggle
        if (value && !allProgress[today].completedExercises.includes(id)) {
            allProgress[today].completedExercises.push(id);
        } else if (!value) {
            allProgress[today].completedExercises = allProgress[today].completedExercises.filter(
                itemId => itemId !== id
            );
        }
    } else {
        // Handle data update (weight/reps)
        allProgress[today].setData[id] = value;
    }

    localStorage.setItem(STORAGE_KEYS.CURRENT_PROGRESS, JSON.stringify(allProgress));
}

// NEW: Save exercise history for progressive overload
function saveExerciseHistory(exerciseId, setNumber, weight, reps) {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.EXERCISE_HISTORY) || '[]');

    history.push({
        exerciseId,
        setNumber,
        weight: parseFloat(weight) || 0,
        reps: parseInt(reps) || 0,
        volume: (parseFloat(weight) || 0) * (parseInt(reps) || 0),
        date: new Date().toISOString()
    });

    localStorage.setItem(STORAGE_KEYS.EXERCISE_HISTORY, JSON.stringify(history));
}

// NEW: Get last session data for an exercise
function getLastExerciseSession(exerciseId) {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.EXERCISE_HISTORY) || '[]');
    const exerciseHistory = history
        .filter(h => h.exerciseId === exerciseId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (exerciseHistory.length === 0) return null;

    // Get the most recent session's first set
    const lastSet = exerciseHistory[0];
    return {
        weight: lastSet.weight,
        reps: lastSet.reps,
        date: new Date(lastSet.date).toLocaleDateString()
    };
}

// NEW: Suggest progressive overload
function suggestProgression(lastWeight, lastReps) {
    // Simple progression logic:
    // If reps >= 12, suggest +2.5kg
    // If reps < 12, suggest +1 rep
    if (lastReps >= 12) {
        return {
            type: 'weight',
            suggested: lastWeight + 2.5,
            message: `+2.5kg (${lastWeight + 2.5}kg)`
        };
    } else {
        return {
            type: 'reps',
            suggested: lastReps + 1,
            message: `+1 rep (${lastReps + 1} reps)`
        };
    }
}

// NEW: Calculate workout streak
function calculateWorkoutStreak() {
    const logs = getWorkoutLogs();
    if (logs.length === 0) return 0;

    // Sort logs by date descending
    const sortedLogs = logs.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

    // Get unique dates
    const uniqueDates = [...new Set(sortedLogs.map(log => new Date(log.date).toDateString()))];

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < uniqueDates.length; i++) {
        const logDate = new Date(uniqueDates[i]);
        logDate.setHours(0, 0, 0, 0);

        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);
        expectedDate.setHours(0, 0, 0, 0);

        if (logDate.getTime() === expectedDate.getTime()) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

// NEW: Get quick stats
function getQuickStats() {
    const logs = getWorkoutLogs();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Total workouts this month
    const monthlyLogs = logs.filter(log => {
        const logDate = new Date(log.date);
        return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
    });

    // Most consistent day of week
    const dayCount = {};
    logs.forEach(log => {
        const day = new Date(log.date).getDay();
        dayCount[day] = (dayCount[day] || 0) + 1;
    });

    const mostConsistentDay = Object.keys(dayCount).length > 0
        ? parseInt(Object.keys(dayCount).reduce((a, b) => dayCount[a] > dayCount[b] ? a : b))
        : null;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
        totalWorkouts: logs.length,
        monthlyWorkouts: monthlyLogs.length,
        currentStreak: calculateWorkoutStreak(),
        mostConsistentDay: mostConsistentDay !== null ? dayNames[mostConsistentDay] : 'N/A'
    };
}

// Complete workout and log it
function completeWorkout(workoutTemplateId, completedExercises) {
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKOUT_LOGS) || '[]');
    const today = new Date().toDateString();
    const allProgress = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_PROGRESS) || '{}');
    const currentDayData = allProgress[today] || {};

    const newLog = {
        date: new Date().toISOString(),
        dateString: today,
        workoutTemplateId: workoutTemplateId,
        completedExercises: completedExercises,
        setData: currentDayData.setData || {},
        completedAt: new Date().toISOString()
    };

    logs.push(newLog);
    localStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(logs));

    // NEW: Save exercise history for progressive overload
    if (currentDayData.setData) {
        Object.keys(currentDayData.setData).forEach(key => {
            const match = key.match(/^(.+)-set-(\d+)-(weight|reps)$/);
            if (match) {
                const exerciseId = match[1];
                const setNumber = parseInt(match[2]);
                const type = match[3];

                // Only save when we have both weight and reps for a set
                const weightKey = `${exerciseId}-set-${setNumber}-weight`;
                const repsKey = `${exerciseId}-set-${setNumber}-reps`;

                if (currentDayData.setData[weightKey] && currentDayData.setData[repsKey]) {
                    saveExerciseHistory(
                        exerciseId,
                        setNumber,
                        currentDayData.setData[weightKey],
                        currentDayData.setData[repsKey]
                    );
                }
            }
        });
    }

    // Tech Upgrade: Sync to Cloud
    if (window.SyncService) {
        window.SyncService.syncWorkoutLog(newLog);
    }

    // Clear today's progress
    delete allProgress[today];
    localStorage.setItem(STORAGE_KEYS.CURRENT_PROGRESS, JSON.stringify(allProgress));

    return newLog;
}

// Get all workout logs
function getWorkoutLogs() {
    const logs = localStorage.getItem(STORAGE_KEYS.WORKOUT_LOGS);
    return logs ? JSON.parse(logs) : [];
}

// Get logs for a specific date
function getLogsForDate(dateString) {
    const logs = getWorkoutLogs();
    return logs.filter(log => log.dateString === dateString);
}

// Check if workout was completed today
function isWorkoutCompletedToday(specificTemplateId = null) {
    const today = new Date().toDateString();
    const logs = getWorkoutLogs();

    if (specificTemplateId) {
        return logs.some(log => log.dateString === today && log.workoutTemplateId === specificTemplateId);
    }

    return logs.some(log => log.dateString === today);
}

// Tech Feature: Export all data as JSON
function exportData() {
    const data = {
        schedule: getSchedule(),
        templates: getTemplates(),
        logs: getWorkoutLogs(),
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gymtick_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Tech Feature: Import data from JSON
function importData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.schedule && data.templates && data.logs) {
                    updateSchedule(data.schedule);
                    updateTemplates(data.templates);
                    localStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(data.logs));
                    resolve(true);
                } else {
                    reject('Invalid backup file structure');
                }
            } catch (err) {
                reject('Error parsing JSON');
            }
        };
        reader.onerror = () => reject('Error reading file');
        reader.readAsText(file);
    });
}

// Tech Feature: Delete a specific log
function deleteWorkoutLog(timestamp) {
    const logs = getWorkoutLogs();
    const updatedLogs = logs.filter(log => log.completedAt !== timestamp);
    localStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(updatedLogs));
}

// Storage Exports
const StorageExports = {
    initializeStorage,
    getSchedule,
    updateSchedule,
    getTemplates,
    updateTemplates,
    getCurrentProgress,
    saveExerciseProgress,
    completeWorkout,
    getWorkoutLogs,
    getLogsForDate,
    isWorkoutCompletedToday,
    isSetCompleted: (exerciseId, setIndex) => {
        const progress = getCurrentProgress();
        return progress.completedExercises.includes(`${exerciseId}-set-${setIndex}`);
    },
    getLastStats: (exerciseId) => {
        const logs = getWorkoutLogs();
        const sortedLogs = logs.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
        for (const log of sortedLogs) {
            if (log.completedExercises && log.completedExercises.includes(exerciseId)) {
                const stats = {};
                if (log.setData) {
                    Object.keys(log.setData).forEach(key => {
                        if (key.startsWith(`${exerciseId}-set-`)) {
                            stats[key] = log.setData[key];
                        }
                    });
                }
                return stats;
            }
        }
        return null;
    },
    // NEW: Progressive overload functions
    getLastExerciseSession,
    suggestProgression,
    saveExerciseHistory,
    // NEW: Streak & stats functions
    calculateWorkoutStreak,
    getQuickStats
};

if (typeof window !== 'undefined') {
    Object.assign(window, StorageExports);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageExports;
}
