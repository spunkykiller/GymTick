-- GymTick Advanced Features Migration
-- Adds tables for progressive overload, notes, and preferences

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Exercise History Table (for progressive overload tracking)
CREATE TABLE IF NOT EXISTS public.exercise_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL,
    workout_log_id TEXT REFERENCES public.workout_logs(id) ON DELETE CASCADE,
    weight DECIMAL(6,2),
    reps INTEGER,
    volume DECIMAL(10,2), -- weight × reps
    set_number INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exercise Notes Table (for form cues, injuries, modifications)
CREATE TABLE IF NOT EXISTS public.exercise_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL,
    note_type TEXT CHECK (note_type IN ('form_cue', 'injury', 'modification', 'general')),
    content TEXT NOT NULL,
    voice_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Preferences Table (for custom settings)
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    custom_rest_times JSONB DEFAULT '{}'::jsonb,
    audio_cues_enabled BOOLEAN DEFAULT true,
    streak_notifications BOOLEAN DEFAULT true,
    theme_preference TEXT DEFAULT 'dark',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.exercise_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exercise_history
CREATE POLICY "Users can view their own exercise history"
    ON public.exercise_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercise history"
    ON public.exercise_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise history"
    ON public.exercise_history FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise history"
    ON public.exercise_history FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for exercise_notes
CREATE POLICY "Users can view their own exercise notes"
    ON public.exercise_notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercise notes"
    ON public.exercise_notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise notes"
    ON public.exercise_notes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise notes"
    ON public.exercise_notes FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences"
    ON public.user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
    ON public.user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON public.user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
    ON public.user_preferences FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_exercise_history_user_exercise 
    ON public.exercise_history(user_id, exercise_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exercise_history_workout 
    ON public.exercise_history(workout_log_id);

CREATE INDEX IF NOT EXISTS idx_exercise_notes_user_exercise 
    ON public.exercise_notes(user_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_exercise_notes_type 
    ON public.exercise_notes(user_id, note_type);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for exercise_notes
CREATE TRIGGER update_exercise_notes_updated_at
    BEFORE UPDATE ON public.exercise_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_preferences
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
