# StudyCare AI

Intelligent study assistant designed to help students learn faster and study smarter using AI.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- OpenAI API key
- Supabase project

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd studycare
```

2. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Set up Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - In SQL Editor, run `supabase/migrations/001_initial_schema.sql`
   - Run `supabase/migrations/002_caregiver_relationships.sql`
   - Create storage bucket `studycare-uploads` (Public)

4. **Configure environment variables**

Create `backend/.env`:
```env
OPENAI_API_KEY=sk-your-key-here
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
SUPABASE_ANON_KEY=eyJ...your-anon-key
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your-secret-key-change-in-production
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

5. **Start development servers**
```bash
# Backend (Terminal 1)
cd backend
npm run dev

# Frontend (Terminal 2)
cd frontend
npm run dev
```

## 📚 Documentation

### Setup & Configuration

#### Database Setup
1. Run migrations in order:
   - `001_initial_schema.sql` - Core tables, RLS policies, and functions
   - `002_caregiver_relationships.sql` - Caregiver features

2. Create storage bucket:
   - Name: `studycare-uploads`
   - Set to Public (or configure RLS)

#### Environment Variables
- **OpenAI API Key**: Get from [platform.openai.com](https://platform.openai.com)
- **Supabase Keys**: Dashboard → Settings → API
  - URL: Project URL
  - Service Role Key: Keep secret!
  - Anon Key: Public key

### API Reference

**Base URL**: `http://localhost:5000/api`

**Authentication**: All protected endpoints require:
```
Authorization: Bearer YOUR_TOKEN
```

#### Authentication Endpoints
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get profile
- `PUT /api/auth/profile` - Update profile

#### Chat Endpoints
- `POST /api/chat/session` - Create chat session
- `POST /api/chat/message` - Send message
- `GET /api/chat/session/:id` - Get session history
- `GET /api/chat/sessions` - List sessions

#### Image Analysis
- `POST /api/image/upload` - Upload & analyze image
- `GET /api/image/:sessionId` - Get analysis

#### Teacher Dashboard
- `POST /api/teacher/classes` - Create class
- `GET /api/teacher/classes` - List classes
- `GET /api/teacher/classes/:id/students` - Get students
- `GET /api/teacher/classes/:id/stats` - Get activity stats

#### Student Endpoints
- `POST /api/student/join-class` - Join class
- `GET /api/student/classes` - List classes

#### Caregiver Endpoints
- `POST /api/caregiver/link-child` - Link child account
- `GET /api/caregiver/children` - Get linked children
- `GET /api/caregiver/child/:id/activity` - Get child activity
- `DELETE /api/caregiver/unlink/:id` - Unlink child

#### Other Features
- `POST /api/voice/transcribe` - Speech-to-text
- `POST /api/voice/synthesize` - Text-to-speech
- `POST /api/pods` - Create study pod
- `POST /api/notes` - Create note
- `POST /api/symptom/check` - Symptom guidance

See full API documentation in code comments or use the `/health` and `/metrics` endpoints.

### Testing

#### Quick Test
```bash
# Health check
curl http://localhost:5000/health

# Metrics
curl http://localhost:5000/metrics
```

#### Automated Test Script
```powershell
.\test-workflow.ps1
```

#### Manual Testing
1. Register users (teacher, student, caregiver)
2. Create class and join with student
3. Test chat, image upload, teacher dashboard
4. Test caregiver linking and activity viewing

### Scalability Features

The backend is built for 20k+ users with:

- **Rate Limiting**: Prevents abuse (100 req/15min general, 5 req/15min auth)
- **Caching**: In-memory cache (ready for Redis upgrade)
- **Logging**: Request/response logging with Morgan
- **Metrics**: Real-time performance metrics at `/metrics`
- **Compression**: Gzip compression (~70% bandwidth reduction)
- **Security**: Helmet.js security headers
- **Database**: Optimized indexes and connection pooling

**Current Capacity**:
- Single instance: ~500-1000 concurrent users
- With load balancing: ~5000-10000 concurrent users
- Fully optimized: 20k+ concurrent users

For production scaling, see scalability recommendations in code comments.

## 🏗️ Project Structure

```
studycare/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration (database, OpenAI, env)
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth, rate limiting, logging
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Cache, metrics
│   └── package.json
├── frontend/
│   ├── app/                 # Next.js app directory
│   │   ├── dashboard/      # Teacher dashboard
│   │   ├── caregiver/       # Caregiver dashboard
│   │   ├── student/         # Student dashboard
│   │   └── login/           # Auth pages
│   ├── lib/                 # API client
│   └── package.json
├── supabase/
│   └── migrations/          # Database migrations
└── README.md
```

## 🎯 Core Features

1. **AI Study Assistant** - Chat with subject-aware explanations
2. **Image Analysis** - OCR + AI explanations for images
3. **Multilingual Support** - 15 languages
4. **Voice Interaction** - Speech-to-text and text-to-speech
5. **Study Pods** - Group study with AI guidance
6. **Note-Taking AI** - Summaries and explanations
7. **Symptom Check** - Safe health guidance
8. **Caregiver Mode** - Link and monitor child accounts
9. **Teacher Dashboard** - Class management and activity tracking

## 🔧 Tech Stack

- **Backend**: Node.js + Express.js + TypeScript
- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI (GPT-4, Vision, Whisper, TTS)
- **Storage**: Supabase Storage
- **Deployment**: Vercel / AWS

## 📝 Database Schema

### Core Tables
- `users` - User accounts (student/teacher/caregiver)
- `classes` - Classes created by teachers
- `class_students` - Student enrollments
- `study_sessions` - Chat/image/voice sessions
- `chat_messages` - Conversation history
- `image_uploads` - Images with OCR/analysis
- `notes` - Student notes with AI summaries
- `caregiver_children` - Caregiver-child relationships
- `study_pods` - Study groups
- `pod_messages` - Group chat messages

### Row Level Security (RLS)
All tables have RLS enabled with policies for:
- Users can only access their own data
- Teachers can view their students' data
- Caregivers can view linked children's data

## 🧪 Development

### Backend Commands
```bash
cd backend
npm run dev      # Development server
npm run build    # Build for production
npm start        # Run production build
```

### Frontend Commands
```bash
cd frontend
npm run dev      # Development server
npm run build    # Build for production
npm start        # Run production build
```

### Database Migrations
Run migrations in Supabase SQL Editor in order:
1. `001_initial_schema.sql`
2. `002_caregiver_relationships.sql`
3. `003_fix_user_insert_rls.sql`

## 🚀 Deployment

### Backend Deployment
1. Set environment variables in hosting platform
2. Build: `npm run build`
3. Start: `npm start`
4. Ensure port is configured (default: 5000)

### Frontend Deployment
1. Set `NEXT_PUBLIC_API_URL` to production API URL
2. Build: `npm run build`
3. Deploy to Vercel/Netlify

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Storage bucket created
- [ ] CORS origin set correctly
- [ ] Rate limiting configured
- [ ] Monitoring set up
- [ ] SSL/HTTPS enabled

## 🔒 Security

- JWT authentication
- Role-based access control (RBAC)
- Row Level Security (RLS) policies
- Rate limiting
- Security headers (Helmet.js)
- Input validation
- SQL injection protection (Supabase)

## 📊 Monitoring

### Health Check
```bash
GET /health
```

### Metrics
```bash
GET /metrics
```

Returns:
- Request statistics
- Response time metrics (avg, p95, p99)
- Error counts
- Memory usage
- Active connections
- Uptime

## 🌍 Supported Languages

English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic, Hindi, Turkish, Polish, Dutch

## 🐛 Troubleshooting

### Common Issues

**"OPENAI_API_KEY not set"**
- Check `.env` file exists in `backend/`
- Verify key is valid

**"Supabase connection error"**
- Verify SUPABASE_URL and keys
- Check project is active
- Ensure migrations are run

**"Failed to upload file"**
- Create `studycare-uploads` bucket
- Set bucket to Public or configure RLS
- Check file size (max 10MB)

**"Authentication failed"**
- Verify token in Authorization header
- Check token hasn't expired
- Ensure user exists in database

**"Policy already exists" error**
- Manually drop policy first:
  ```sql
  DROP POLICY IF EXISTS "Policy Name" ON public.table_name;
  ```
- Then re-run migration

