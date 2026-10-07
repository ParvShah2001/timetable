# Deployment Guide

This guide covers deploying the **Timetable** application to various production platforms.

---

## 1. Environment Variables

Before deploying, ensure you have your Supabase credentials ready:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase Project URL | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon / public API key | `eyJhbGciOi...` |

*(Note: Supabase anon keys are designed for client-side use and are protected by Row-Level Security).*

---

## 2. Deploy to GitHub Pages (Automated via Actions)

The repository includes a ready-to-use GitHub Actions workflow in `.github/workflows/deploy.yml`.

### Steps:

1. Push your code to your GitHub repository (`main` branch).
2. In your GitHub repository, navigate to **Settings -> Secrets and variables -> Actions**.
3. Under **Repository secrets**, click **New repository secret** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Update `.github/workflows/deploy.yml` to supply these secrets during the build step:
   ```yaml
   - name: Build
     run: npm run build
     env:
       VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
       VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
   ```
5. In **Settings -> Pages**, under **Build and deployment**, set **Source** to **GitHub Actions**.
6. Every push to `main` will build and publish your site automatically.

---

## 3. Deploy to Vercel

1. Push your repository to GitHub / GitLab / Bitbucket.
2. Sign in to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your `timetable` repository.
4. Set the build settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy**.

---

## 4. Deploy to Netlify

1. Sign in to [Netlify](https://netlify.com) and click **Add new site -> Import an existing project**.
2. Select your repository.
3. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Under **Site configuration -> Environment variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Click **Deploy site**.

---

## 5. Self-Hosting with Docker / Nginx

You can serve the static build output using Nginx:

### Sample Dockerfile:

```dockerfile
# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

# Production Stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:

```bash
docker build \
  --build-arg VITE_SUPABASE_URL="https://your-project.supabase.co" \
  --build-arg VITE_SUPABASE_ANON_KEY="your-anon-key" \
  -t timetable-app .

docker run -d -p 8080:80 timetable-app
```
Access the application at `http://localhost:8080`.
