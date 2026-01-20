// GymTick - Local Storage Management
// Handles all data persistence with localStorage

const STORAGE_KEYS = {
    SCHEDULE: 'gymtick_schedule',
    WORKOUT_LOGS: 'gymtick_workout_logs',
    CURRENT_PROGRESS: 'gymtick_current_progress',
    TEMPLATES: 'gymtick_templates'
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
    }
};

if (typeof window !== 'undefined') {
    Object.assign(window, StorageExports);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageExports;
}
