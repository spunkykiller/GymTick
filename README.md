# 🏋️ GymTick - Workout Tracker PWA

> Ultra-simple workout completion tracking. Zero friction, offline-first gym to-do list.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/spunkykiller/GymTick)

## ✨ Features

- **✓ One-Tap Tracking** - Check off exercises as you complete them
- **📱 Mobile-First PWA** - Install on your phone, works offline
- **☁️ Cloud Sync** - Login with Google to sync across devices
- **📊 Progress Tracking** - See your workout history and consistency
- **⚡ Lightning Fast** - Loads in under 1 second
- **🎨 Clean UI** - Dark mode, minimal design, zero clutter

## 🚀 Live Demo

**[Try GymTick Now →](https://gym-tick.vercel.app/)**

Experience the app live! Works on mobile, tablet, and desktop. Install as a PWA for the best experience.

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Supabase (PostgreSQL + Auth)
- **Hosting**: Vercel
- **PWA**: Service Worker, Web App Manifest

## 📦 Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/spunkykiller/GymTick.git
cd GymTick

# Install dependencies
npm install

# Start local server
npx http-server -p 3000
```

Visit `http://localhost:3000`

### Deploy to Vercel

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 🔧 Configuration

### Environment Variables

Create a `config.js` file (or set in Vercel):

```javascript
window.ENV_CONFIG = {
  SUPABASE_URL: "your-supabase-url",
  SUPABASE_ANON_KEY: "your-anon-key"
};
```

### Database Setup

Run the SQL migration in your Supabase dashboard:
```bash
node run-migration.js
```

Or manually execute `supabase_migration.sql` in the SQL Editor.

## 📱 Install as PWA

1. Open the app in Chrome/Safari
2. Click "Add to Home Screen"
3. Launch from your home screen like a native app

## 🎯 Usage

1. **View Today's Workout** - Automatically shows your scheduled routine
2. **Check Off Exercises** - Tap to mark complete
3. **Track Sets** - Log weight and reps for each set
4. **Complete Workout** - Save your progress
5. **View History** - See past workouts and stats

## 🔐 Privacy & Security

- **Row Level Security** - Users can only see their own data
- **Google OAuth** - Secure authentication via Supabase
- **No Tracking** - Zero analytics or third-party scripts

## 📄 License

MIT License - feel free to use for personal or commercial projects

## 🤝 Contributing

Contributions welcome! Feel free to open issues or submit PRs.

---

Made with 💪 by [spunkykiller](https://github.com/spunkykiller)
