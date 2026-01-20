# 🚀 Deploy GymTick to Vercel

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/spunkykiller/GymTick)

## Manual Deployment Steps

### 1. Connect GitHub Repository

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Click "Import Project"
3. Select "Import Git Repository"
4. Choose `spunkykiller/GymTick`
5. Click "Import"

### 2. Configure Environment Variables

In the Vercel project settings, add these environment variables:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://aftrouxqaqswiyfflopk.supabase.co` |
| `SUPABASE_ANON_KEY` | `sb_publishable_O8PEdRPQjEjn1txooLPPiA_siupCdSn` |

### 3. Deploy

1. Click "Deploy"
2. Wait for build to complete (~1-2 minutes)
3. Your app will be live at `https://gymtick-[random].vercel.app`

## Build Configuration

Vercel will automatically:
- Detect it's a static site
- Run `generate-config.js` during build (via `vercel.json`)
- Serve all static files
- Enable HTTPS automatically

## Post-Deployment

### Update Supabase OAuth Settings

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/aftrouxqaqswiyfflopk/auth/url-configuration)
2. Add your Vercel URL to "Redirect URLs":
   - `https://your-app.vercel.app`
   - `https://your-app.vercel.app/**`

### Test the Deployment

1. Visit your Vercel URL
2. Click "Login with Google"
3. Complete a workout
4. Verify data syncs to Supabase

## Custom Domain (Optional)

1. Go to Vercel Project Settings → Domains
2. Add your custom domain (e.g., `gymtick.com`)
3. Update DNS records as instructed
4. Update Supabase redirect URLs with your custom domain

---

✨ Your GymTick app is now live and accessible to anyone!
