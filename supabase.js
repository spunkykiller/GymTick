// Supabase Integration for GymTick
// These are populated from Vercel Environment Variables via generate-config.js
const SUPABASE_URL = window.ENV_CONFIG ? window.ENV_CONFIG.SUPABASE_URL : '';
const SUPABASE_ANON_KEY = window.ENV_CONFIG ? window.ENV_CONFIG.SUPABASE_ANON_KEY : '';

let supabaseClient = null;
let currentUser = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Listen for auth state changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null;
        updateAuthUI(currentUser);

        if (event === 'SIGNED_IN' && currentUser) {
            SyncService.pullAllData();
        }
    });
}

function updateAuthUI(user) {
    const loginBtn = document.getElementById('profile-login-btn');
    const userBadge = document.getElementById('user-profile-badge');
    const syncStatus = document.getElementById('sync-status');
    const nameSmall = document.getElementById('user-name-small');

    if (user) {
        if (loginBtn) loginBtn.classList.add('hidden');
        if (userBadge) {
            userBadge.classList.remove('hidden');
            userBadge.onclick = () => {
                if (confirm(`Logout from ${user.user_metadata.full_name || user.email}?`)) {
                    SyncService.signOut();
                }
            };
        }
        if (nameSmall) nameSmall.textContent = user.user_metadata.full_name || 'User';

        if (syncStatus) {
            syncStatus.classList.replace('offline', 'online');
            syncStatus.querySelector('.sync-label').textContent = 'Online';
        }
    } else {
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (userBadge) userBadge.classList.add('hidden');
        if (syncStatus) {
            syncStatus.classList.replace('online', 'offline');
            syncStatus.querySelector('.sync-label').textContent = 'Offline';
        }
    }
}

const SyncService = {
    async signInWithCode(profile, code) {
        if (!supabaseClient) return;

        const email = profile === 'mohit' ? 'mohit@gymtick.app' : 'yasaswi@gymtick.app';
        const fullName = profile === 'mohit' ? 'Mohit Silla' : 'Yasaswi';

        try {
            // Try to sign in
            let { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: code
            });

            // If user doesn't exist, sign them up (auto-provisioning for these two users)
            if (error && error.message.includes('Invalid login credentials')) {
                console.log('User not found, attempting auto-signup...');
                const signup = await supabaseClient.auth.signUp({
                    email: email,
                    password: code,
                    options: {
                        data: {
                            full_name: fullName
                        }
                    }
                });

                if (signup.error) throw signup.error;

                // If signup successful, sign in again (or signup might auto-sign in depending on config)
                if (signup.data.user) {
                    ({ data, error } = await supabaseClient.auth.signInWithPassword({
                        email: email,
                        password: code
                    }));
                }
            }

            if (error) throw error;

            showToast(`Welcome back, ${fullName}!`);
            return { data, error: null };

        } catch (err) {
            console.error('Login error:', err.message);
            alert(`Login failed: ${err.message}`);
            return { data: null, error: err };
        }
    },

    async signOut() {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.auth.signOut();
        if (error) console.error('Error signing out:', error.message);
        else {
            localStorage.clear(); // Clear local data on logout for privacy between profiles
            window.location.reload();
        }
    },

    async syncWorkoutLog(log) {
        if (!supabaseClient || !currentUser) return;

        try {
            const { error } = await supabaseClient
                .from('workout_logs')
                .upsert({
                    id: `${currentUser.id}-${log.completedAt}`,
                    user_id: currentUser.id,
                    log_id: log.completedAt,
                    date: log.date,
                    workout_name: log.workoutTemplateId,
                    completed_exercises: log.completedExercises,
                    set_data: log.setData,
                    created_at: new Date(log.completedAt).toISOString()
                });

            if (error) throw error;
        } catch (err) {
            console.error('Error syncing log:', err.message);
        }
    },

    async syncTemplates(templates) {
        if (!supabaseClient || !currentUser) return;

        try {
            const { error } = await supabaseClient
                .from('user_settings')
                .upsert({
                    id: currentUser.id,
                    user_id: currentUser.id,
                    data: templates,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (err) {
            console.error('Error syncing templates:', err.message);
        }
    },

    async pullAllData() {
        if (!supabaseClient || !currentUser) return;

        try {
            // Pull Logs
            const { data: logs, error: logsError } = await supabaseClient
                .from('workout_logs')
                .select('*')
                .eq('user_id', currentUser.id);

            if (logsError) throw logsError;

            // Pull Templates
            const { data: settings, error: settingsError } = await supabaseClient
                .from('user_settings')
                .select('data')
                .eq('user_id', currentUser.id)
                .single();

            if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

            // Merge with local storage
            let needsReload = false;

            if (logs && logs.length > 0) {
                const localLogs = JSON.parse(localStorage.getItem('gymtick_workout_logs') || '[]');
                const mergedLogs = [...localLogs];
                let added = false;

                logs.forEach(cloudLog => {
                    const exists = mergedLogs.some(l => l.completedAt == cloudLog.log_id);
                    if (!exists) {
                        mergedLogs.push({
                            completedAt: cloudLog.log_id,
                            date: cloudLog.date,
                            workoutTemplateId: cloudLog.workout_name,
                            completedExercises: cloudLog.completed_exercises,
                            setData: cloudLog.set_data
                        });
                        added = true;
                    }
                });

                if (added) {
                    localStorage.setItem('gymtick_workout_logs', JSON.stringify(mergedLogs));
                    needsReload = true;
                }
            }

            if (settings && settings.data) {
                const localTemplates = localStorage.getItem('gymtick_workout_templates');
                if (JSON.stringify(settings.data) !== localTemplates) {
                    localStorage.setItem('gymtick_workout_templates', JSON.stringify(settings.data));
                    needsReload = true;
                }
            }

            if (needsReload) {
                console.log('Successfully synced cloud data to local storage. Refreshing...');
                if (window.loadTodayView) window.loadTodayView();
            }
        } catch (err) {
            console.error('Error pulling data:', err.message);
        }
    }
};

// Auto-expose to window
window.SyncService = SyncService;
