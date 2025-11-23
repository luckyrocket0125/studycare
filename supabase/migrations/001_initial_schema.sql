-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'caregiver')),
  language_preference TEXT DEFAULT 'en',
  simplified_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classes table
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  class_code TEXT UNIQUE NOT NULL,
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Class students junction table
CREATE TABLE IF NOT EXISTS public.class_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);

-- Study sessions
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('chat', 'image', 'voice', 'notes', 'symptom')),
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Image uploads
CREATE TABLE IF NOT EXISTS public.image_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  file_url TEXT NOT NULL,
  ocr_text TEXT,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  ai_summary TEXT,
  ai_explanation TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study pods
CREATE TABLE IF NOT EXISTS public.study_pods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study pod members
CREATE TABLE IF NOT EXISTS public.study_pod_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID NOT NULL REFERENCES public.study_pods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('member', 'admin')) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pod_id, user_id)
);

-- Pod messages
CREATE TABLE IF NOT EXISTS public.pod_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID NOT NULL REFERENCES public.study_pods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  content TEXT NOT NULL,
  ai_guidance TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON public.class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON public.class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_classes_class_code ON public.classes(class_code);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON public.classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_image_uploads_user_id ON public.image_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);

-- Row Level Security Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_pod_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
-- Run this manually first if you get "already exists" errors:
-- DROP POLICY IF EXISTS "Teachers can view student data" ON public.users;
DROP POLICY IF EXISTS "Teachers can view student data" ON public.users;
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Teachers can view their classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can manage their classes" ON public.classes;
DROP POLICY IF EXISTS "Students can view classes by code" ON public.classes;
DROP POLICY IF EXISTS "Students can view their classes" ON public.class_students;
DROP POLICY IF EXISTS "Students can join classes" ON public.class_students;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can view own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can create own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view own images" ON public.image_uploads;
DROP POLICY IF EXISTS "Users can create own images" ON public.image_uploads;
DROP POLICY IF EXISTS "Users can manage own notes" ON public.notes;

-- RLS Policies
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Teachers can view student data" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.student_id = users.id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON public.users
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = users.id
    )
  );

CREATE POLICY "Teachers can view their classes" ON public.classes
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can manage their classes" ON public.classes
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Students can view classes by code" ON public.classes
  FOR SELECT USING (true);

CREATE POLICY "Students can view their classes" ON public.class_students
  FOR SELECT USING (
    student_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.classes 
      WHERE id = class_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can join classes" ON public.class_students
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own sessions" ON public.study_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own sessions" ON public.study_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own messages" ON public.chat_messages
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own messages" ON public.chat_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own images" ON public.image_uploads
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own images" ON public.image_uploads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can manage own notes" ON public.notes
  FOR ALL USING (user_id = auth.uid());

-- Functions for teacher dashboard (bypass RLS for service role)
-- Function to get student info for teachers
CREATE OR REPLACE FUNCTION public.get_student_info_for_teacher(
  p_teacher_id UUID,
  p_student_id UUID
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_teacher_student BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM public.class_students cs
    JOIN public.classes c ON c.id = cs.class_id
    WHERE cs.student_id = p_student_id
      AND c.teacher_id = p_teacher_id
  ) INTO v_is_teacher_student;

  IF NOT v_is_teacher_student THEN
    RAISE EXCEPTION 'Student not in teacher''s class';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email, u.full_name
  FROM public.users u
  WHERE u.id = p_student_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;
END;
$$;

-- Function to get student activity stats
CREATE OR REPLACE FUNCTION public.get_student_activity_stats(
  p_teacher_id UUID,
  p_student_id UUID
)
RETURNS TABLE (
  last_active TIMESTAMP WITH TIME ZONE,
  questions_asked BIGINT,
  images_submitted BIGINT,
  notes_created BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_teacher_student BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM public.class_students cs
    JOIN public.classes c ON c.id = cs.class_id
    WHERE cs.student_id = p_student_id
      AND c.teacher_id = p_teacher_id
  ) INTO v_is_teacher_student;

  IF NOT v_is_teacher_student THEN
    RAISE EXCEPTION 'Student not in teacher''s class';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT MAX(created_at) FROM public.study_sessions WHERE user_id = p_student_id) as last_active,
    (SELECT COUNT(*) FROM public.chat_messages WHERE user_id = p_student_id AND message_type = 'user') as questions_asked,
    (SELECT COUNT(*) FROM public.image_uploads WHERE user_id = p_student_id) as images_submitted,
    (SELECT COUNT(*) FROM public.notes WHERE user_id = p_student_id) as notes_created;
END;
$$;

-- Function to get all students in a class with their info
CREATE OR REPLACE FUNCTION public.get_class_students_info(
  p_teacher_id UUID,
  p_class_id UUID
)
RETURNS TABLE (
  student_id UUID,
  email TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_teacher_id UUID;
BEGIN
  SELECT teacher_id INTO v_class_teacher_id
  FROM public.classes
  WHERE id = p_class_id;

  IF v_class_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Class not found';
  END IF;

  IF v_class_teacher_id != p_teacher_id THEN
    RAISE EXCEPTION 'Access denied: Not your class';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as student_id,
    u.email,
    u.full_name
  FROM public.class_students cs
  JOIN public.users u ON u.id = cs.student_id
  WHERE cs.class_id = p_class_id;
END;
$$;

-- Grant execute permissions for teacher functions
GRANT EXECUTE ON FUNCTION public.get_student_info_for_teacher TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_info_for_teacher TO service_role;
GRANT EXECUTE ON FUNCTION public.get_student_activity_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_activity_stats TO service_role;
GRANT EXECUTE ON FUNCTION public.get_class_students_info TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_class_students_info TO service_role;

-- Function to create user profile (bypasses RLS for service role)
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT,
  p_language_preference TEXT DEFAULT 'en',
  p_simplified_mode BOOLEAN DEFAULT false
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users;
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    language_preference,
    simplified_mode,
    created_at,
    updated_at
  )
  VALUES (
    p_id,
    p_email,
    p_full_name,
    p_role,
    p_language_preference,
    p_simplified_mode,
    NOW(),
    NOW()
  )
  RETURNING * INTO v_user;
  
  RETURN v_user;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile TO service_role;

