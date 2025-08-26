# Ceilinx Deployment Guide for Coolify

This guide will help you deploy the Ceilinx quote management application on Coolify.

## Prerequisites

1. **Coolify instance** running and accessible
2. **Supabase project** set up with the required database schema
3. **Environment variables** for your Supabase connection

## Deployment Steps

### 1. Prepare Your Repository

Ensure your repository contains all the deployment files:
- ✅ `Dockerfile` - Multi-stage build configuration
- ✅ `nginx.conf` - Production web server configuration  
- ✅ `.dockerignore` - Optimized build context
- ✅ `env.example` - Environment variable template

### 2. Set Up Environment Variables in Coolify

In your Coolify application settings, add these environment variables:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**How to get these values:**
- Go to your Supabase project dashboard
- Navigate to Settings → API
- Copy the Project URL and anon/public key

### 3. Configure Coolify Application

1. **Create New Application** in Coolify
2. **Set Source**: Connect your Git repository
3. **Set Build Pack**: Choose "Docker" 
4. **Port**: Set to `80` (nginx serves on port 80)
5. **Environment Variables**: Add the Supabase variables above
6. **Health Check**: Use `/health` endpoint

### 4. Deploy

1. Click **Deploy** in Coolify
2. Monitor the build logs for any issues
3. Once deployed, test the application

### 5. Verify Deployment

Check these endpoints:
- `https://your-app.coolify.io/` - Main application
- `https://your-app.coolify.io/health` - Health check
- `https://your-app.coolify.io/?id=test-form-id` - Test with form ID

## Application Architecture

```
Internet → Coolify → Nginx → React App → Supabase
                                      → N8N Webhook
```

## Build Process

The Dockerfile uses a multi-stage build:

1. **Build Stage**: 
   - Node.js 18 Alpine
   - Installs dependencies
   - Builds the React app with Vite

2. **Production Stage**:
   - Nginx Alpine (lightweight)
   - Serves static files
   - Handles client-side routing

## Performance Features

- **Gzip compression** enabled
- **Static asset caching** (1 year)
- **Code splitting** for optimal loading
- **Minified production build**

## Security Features

- Security headers (XSS, CSRF protection)
- No source maps in production
- NGINX configured for SPA routing

## Troubleshooting

### Build Fails
- Check environment variables are set correctly
- Verify Node.js version compatibility
- Check for TypeScript errors in the code

### App Loads but Forms Don't Work
- Verify Supabase environment variables
- Check Supabase project is accessible
- Verify RLS policies are configured

### Supabase Connection Issues
- Test Supabase URL and key in browser
- Check CORS settings in Supabase
- Verify network connectivity from Coolify

## Monitoring

Monitor these metrics:
- **Response time** - Should be < 100ms for static assets
- **Error rate** - Watch for 4xx/5xx errors
- **Health endpoint** - Should return "healthy"
- **Form submissions** - Check Supabase for data persistence

## Updates and Maintenance

To update the application:
1. Push changes to your Git repository
2. Trigger redeploy in Coolify
3. Monitor the health endpoint post-deployment

## Environment-Specific Notes

### Production
- Source maps disabled for security
- Aggressive caching enabled
- Error reporting should be configured

### Staging
- Can enable source maps for debugging
- Use separate Supabase project for testing
- Consider basic auth protection
