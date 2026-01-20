// GymTick - Workout Data Model
// Preloaded weekly workout schedule

const WORKOUT_TEMPLATES = {
  legs: {
    id: 'legs',
    name: 'Legs',
    exercises: [
      { id: 'legs-1', name: 'Warmup: Cycling', notes: '10 minutes', sets: 1 },
      { id: 'legs-2', name: 'Stretching', notes: '', sets: 1 },
      { id: 'legs-3', name: 'Leg curls', notes: '', sets: 3 },
      { id: 'legs-4', name: 'Leg extensions', notes: '', sets: 3 },
      { id: 'legs-5', name: 'Burpees', notes: '15 x 3', sets: 3 }
    ]
  },
  chestTriceps1: {
    id: 'chestTriceps1',
    name: 'Chest + Triceps',
    exercises: [
      { id: 'ct1-1', name: 'Chest workout', notes: '' },
      { id: 'ct1-2', name: 'Triceps workout', notes: '' }
    ]
  },
  chestTriceps2: {
    id: 'chestTriceps2',
    name: 'Chest + Triceps',
    exercises: [
      { id: 'ct2-1', name: 'Inclined flyes', notes: '2.5kg dumbbells' },
      { id: 'ct2-2', name: 'Chest press', notes: '' },
      { id: 'ct2-3', name: 'Declined chest press', notes: '' },
      { id: 'ct2-4', name: 'Tricep close bar pulldown', notes: '' },
      { id: 'ct2-5', name: 'Tricep overhead extension', notes: '' }
    ]
  },
  shoulders: {
    id: 'shoulders',
    name: 'Shoulders',
    exercises: [
      { id: 'shoulders-1', name: 'Side raises', notes: '4 sets' },
      { id: 'shoulders-2', name: 'Shoulder dumbbell overhead press', notes: '' },
      { id: 'shoulders-3', name: 'Isolated press', notes: '' },
      { id: 'shoulders-4', name: 'Shrugs', notes: '' }
    ]
  },
  cardioBackBiceps: {
    id: 'cardioBackBiceps',
    name: 'Cardio + Back + Biceps',
    exercises: [
      { id: 'cbb-1', name: 'Cycling', notes: '10 min' },
      { id: 'cbb-2', name: 'Treadmill', notes: '20 min' },
      { id: 'cbb-3', name: 'Walker', notes: '20 min' },
      { id: 'cbb-4', name: 'Assisted pull-ups', notes: '' },
      { id: 'cbb-5', name: 'Biceps', notes: '' },
      { id: 'cbb-6', name: 'Dumbbell curls', notes: '' },
      { id: 'cbb-7', name: 'Barbell curls', notes: '' }
    ]
  },
  chestVariation: {
    id: 'chestVariation',
    name: 'Chest',
    exercises: [
      { id: 'cv-1', name: 'Incline dumbbell flyes', notes: '' },
      { id: 'cv-2', name: 'Chest press', notes: '' },
      { id: 'cv-3', name: 'Flat bench press', notes: '' }
    ]
  },
  rest: {
    id: 'rest',
    name: 'Rest Day',
    exercises: []
  }
};

// Weekly schedule (0 = Sunday, 1 = Monday, etc.)
const DEFAULT_SCHEDULE = {
  0: 'rest',              // Sunday
  1: 'legs',              // Monday
  2: 'chestTriceps1',     // Tuesday
  3: 'chestTriceps2',     // Wednesday
  4: 'shoulders',         // Thursday
  5: 'cardioBackBiceps',  // Friday
  6: 'chestVariation'     // Saturday
};

// Get workout for a specific day
function getWorkoutForDay(dayIndex) {
  const templateId = DEFAULT_SCHEDULE[dayIndex];
  return WORKOUT_TEMPLATES[templateId];
}

// Get today's workout
function getTodaysWorkout() {
  const today = new Date().getDay();
  return getWorkoutForDay(today);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WORKOUT_TEMPLATES,
    DEFAULT_SCHEDULE,
    getWorkoutForDay,
    getTodaysWorkout
  };
}
