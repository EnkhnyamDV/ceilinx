# Ceilinx Quote Form

A modern German quote request management system built with React, TypeScript, and Supabase. This application allows suppliers to receive quote requests via unique URLs, input prices, and submit their offers through a professional web interface.

## 🚀 Features

- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **German Localization**: Complete German UI and number formatting
- **Real-time Data**: Powered by Supabase for instant data synchronization
- **Professional UI**: Modern design with Tailwind CSS
- **Form Validation**: Comprehensive input validation and error handling
- **Position Management**: Handle multiple line items with descriptions and units
- **Comment System**: Per-position and general comments
- **Status Tracking**: Draft and submitted form states
- **External Integration**: N8N webhook integration for data synchronization

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **Deployment**: Docker, Nginx

## 📋 Prerequisites

- Node.js 18+
- Supabase project
- Docker (for deployment)

## 🏁 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/EnkhnyamDV/ceilinx.git
   cd ceilinx
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 🚀 Deployment

### With Coolify

1. Connect your GitHub repository
2. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Configure Custom Docker Options:
   ```
   --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
   ```
4. Deploy

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 📊 Database Schema

### Tables
- `form_meta`: Form metadata and status
- `form_positionen`: Individual line items and prices

See migration files in `supabase/migrations/` for complete schema.

## 🔗 Usage

Access forms using the URL pattern:
```
https://your-domain.com/?id=form-uuid
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

Private repository - All rights reserved

## 🆘 Support

For questions or issues, please contact the development team.
