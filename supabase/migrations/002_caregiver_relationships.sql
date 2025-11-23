-- Caregiver-Child relationships
CREATE TABLE IF NOT EXISTS public.caregiver_children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caregiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(caregiver_id, child_id),
  CHECK (caregiver_id != child_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_caregiver_children_caregiver ON public.caregiver_children(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_children_child ON public.caregiver_children(child_id);

-- Enable RLS
ALTER TABLE public.caregiver_children ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Caregivers can view own relationships" ON public.caregiver_children;
DROP POLICY IF EXISTS "Caregivers can create relationships" ON public.caregiver_children;
DROP POLICY IF EXISTS "Caregivers can delete own relationships" ON public.caregiver_children;

-- RLS Policies
CREATE POLICY "Caregivers can view own relationships" ON public.caregiver_children
  FOR SELECT USING (caregiver_id = auth.uid() OR child_id = auth.uid());

-- Allow inserts when caregiver_id exists in users table (for service role operations)
CREATE POLICY "Caregivers can create relationships" ON public.caregiver_children
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = caregiver_children.caregiver_id
    )
    AND
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = caregiver_children.child_id
    )
  );

CREATE POLICY "Caregivers can delete own relationships" ON public.caregiver_children
  FOR DELETE USING (caregiver_id = auth.uid());

-- Create a function to link caregiver-child relationship (bypasses RLS)
CREATE OR REPLACE FUNCTION public.link_caregiver_child(
  p_caregiver_id UUID,
  p_child_id UUID
)
RETURNS public.caregiver_children
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_relationship public.caregiver_children;
BEGIN
  INSERT INTO public.caregiver_children (
    caregiver_id,
    child_id,
    created_at
  )
  VALUES (
    p_caregiver_id,
    p_child_id,
    NOW()
  )
  RETURNING * INTO v_relationship;
  
  RETURN v_relationship;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.link_caregiver_child TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_caregiver_child TO service_role;

-- Create a function to get child info (bypasses RLS for service role)
CREATE OR REPLACE FUNCTION public.get_child_info(
  p_caregiver_id UUID,
  p_child_id UUID
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
  v_relationship_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.caregiver_children
    WHERE caregiver_id = p_caregiver_id
      AND child_id = p_child_id
  ) INTO v_relationship_exists;

  IF NOT v_relationship_exists THEN
    RAISE EXCEPTION 'Child not linked to this caregiver';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email, u.full_name
  FROM public.users u
  WHERE u.id = p_child_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Child not found';
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_child_info TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_child_info TO service_role;

