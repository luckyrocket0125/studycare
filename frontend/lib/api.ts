const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
  };
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: { message: error.message || 'Network error' },
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned ${response.status}: ${text.substring(0, 100)}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: { message: error.message || 'Network error' },
      };
    }
  }
}

export const api = new ApiClient(API_BASE_URL);

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: 'student' | 'teacher' | 'caregiver';
  language_preference: string;
  simplified_mode: boolean;
}

export interface Class {
  id: string;
  teacher_id: string;
  name: string;
  class_code: string;
  subject?: string;
  created_at: string;
}

export interface ClassStudent {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
  user?: {
    id: string;
    full_name?: string;
    email: string;
  };
}

export interface StudentActivity {
  student_id: string;
  student_name?: string;
  student_email?: string;
  last_active: string | null;
  questions_asked: number;
  images_submitted: number;
  notes_created: number;
}

export const authApi = {
  register: (data: {
    email: string;
    password: string;
    full_name?: string;
    role: string;
  }) => api.post<{ user: User; token: string }>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<{ user: User; token: string }>('/auth/login', data),

  getProfile: () => api.get<User>('/auth/profile'),

  updateProfile: (data: Partial<User>) => api.put<User>('/auth/profile', data),
};

export const teacherApi = {
  createClass: (data: { name: string; subject?: string }) =>
    api.post<Class>('/teacher/classes', data),

  getClasses: () => api.get<Class[]>('/teacher/classes'),

  getClassStudents: (classId: string) =>
    api.get<ClassStudent[]>(`/teacher/classes/${classId}/students`),

  getClassStats: (classId: string) =>
    api.get<StudentActivity[]>(`/teacher/classes/${classId}/stats`),
};

export interface StudentClass {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
  class?: {
    id: string;
    name: string;
    class_code: string;
    subject?: string;
    teacher_id: string;
  };
}

export interface ChatSession {
  id: string;
  user_id: string;
  session_type: string;
  subject?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  message_type: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export const studentApi = {
  joinClass: (classCode: string) =>
    api.post<StudentClass>('/student/join-class', { classCode }),

  getClasses: () => api.get<StudentClass[]>('/student/classes'),
};

export const chatApi = {
  createSession: (data?: { subject?: string }) =>
    api.post<ChatSession>('/chat/session', data),

  sendMessage: (data: { sessionId: string; message: string; language?: string }) =>
    api.post<{ response: string; message: ChatMessage }>('/chat/message', data),

  getSession: (sessionId: string) =>
    api.get<{ session: ChatSession; messages: ChatMessage[] }>(`/chat/session/${sessionId}`),

  getSessions: () => api.get<ChatSession[]>('/chat/sessions'),
};

export const imageApi = {
  upload: (formData: FormData) => api.postFormData<{ sessionId: string; explanation: string; ocrText: string; imageUrl: string }>('/image/upload', formData),

  getAnalysis: (sessionId: string) => api.get<{ explanation: string; ocrText: string; imageUrl: string }>(`/image/${sessionId}`),
};

export interface VoiceTranscription {
  text: string;
  sessionId?: string;
}

export interface VoiceSynthesis {
  audioUrl: string;
  sessionId?: string;
}

export interface VoiceChatResponse {
  transcription: string;
  aiResponse: string;
  audioUrl?: string;
  sessionId: string;
}

export const voiceApi = {
  transcribe: (audioFile: File, sessionId?: string) => {
    const formData = new FormData();
    formData.append('audio', audioFile);
    if (sessionId) formData.append('sessionId', sessionId);
    return api.postFormData<VoiceTranscription>('/voice/transcribe', formData);
  },

  synthesize: (text: string, language?: string, sessionId?: string) =>
    api.post<VoiceSynthesis>('/voice/synthesize', { text, language, sessionId }),

  chat: (audioFile: File, language?: string, sessionId?: string) => {
    const formData = new FormData();
    formData.append('audio', audioFile);
    if (language) formData.append('language', language);
    if (sessionId) formData.append('sessionId', sessionId);
    return api.postFormData<VoiceChatResponse>('/voice/chat', formData);
  },
};

export interface StudyPod {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  members?: PodMember[];
  memberCount?: number;
}

export interface PodMember {
  id: string;
  pod_id: string;
  user_id: string;
  role: 'member' | 'admin';
  joined_at: string;
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface PodMessage {
  id: string;
  pod_id: string;
  user_id: string;
  content: string;
  ai_guidance?: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export const podApi = {
  createPod: (data: { name: string }) => api.post<StudyPod>('/pods', data),

  getPods: () => api.get<StudyPod[]>('/pods'),

  getPod: (podId: string) => api.get<StudyPod>(`/pods/${podId}`),

  joinPod: (podId: string) => api.post<PodMember>(`/pods/${podId}/join`, {}),

  leavePod: (podId: string) => api.post<{ success: boolean; message: string }>(`/pods/${podId}/leave`, {}),

  sendMessage: (podId: string, content: string) => api.post<PodMessage>(`/pods/${podId}/messages`, { content }),

  getMessages: (podId: string, limit?: number) => api.get<PodMessage[]>(`/pods/${podId}/messages${limit ? `?limit=${limit}` : ''}`),

  deletePod: (podId: string) => api.delete<{ success: boolean; message: string }>(`/pods/${podId}`),
};

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  ai_summary?: string;
  ai_explanation?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface NoteSummary {
  summary: string;
  keyPoints: string[];
  suggestedTags: string[];
}

export interface NoteExplanation {
  explanation: string;
  concepts: string[];
}

export const noteApi = {
  createNote: (data: { title: string; content: string; tags?: string[] }) =>
    api.post<Note>('/notes', data),

  getNotes: () => api.get<Note[]>('/notes'),

  getNote: (noteId: string) => api.get<Note>(`/notes/${noteId}`),

  updateNote: (noteId: string, data: { title?: string; content?: string; tags?: string[] }) =>
    api.put<Note>(`/notes/${noteId}`, data),

  deleteNote: (noteId: string) => api.delete<{ success: boolean; message: string }>(`/notes/${noteId}`),

  summarizeNote: (noteId: string) => api.post<NoteSummary>(`/notes/${noteId}/summarize`, {}),

  explainNote: (noteId: string) => api.post<NoteExplanation>(`/notes/${noteId}/explain`, {}),

  organizeNote: (noteId: string) => api.post<Note>(`/notes/${noteId}/organize`, {}),
};

export interface SymptomCheck {
  id: string;
  user_id: string;
  session_id: string;
  symptoms: string;
  guidance: string;
  severity_level?: 'mild' | 'moderate' | 'severe' | 'emergency';
  created_at: string;
}

export interface SymptomGuidance {
  guidance: string;
  educationalInfo: string;
  whenToSeekHelp: string;
  severityLevel: 'mild' | 'moderate' | 'severe' | 'emergency';
  disclaimer: string;
}

export const symptomApi = {
  checkSymptoms: (data: { symptoms: string; additionalInfo?: string }) =>
    api.post<SymptomGuidance>('/symptom/check', data),

  getHistory: () => api.get<SymptomCheck[]>('/symptom/history'),
};

export interface CaregiverChild {
  id: string;
  caregiver_id: string;
  child_id: string;
  created_at: string;
  child?: {
    id: string;
    email: string;
    full_name?: string;
    simplified_mode: boolean;
  };
}

export interface ChildActivity {
  child_id: string;
  child_name?: string;
  child_email: string;
  classes_count: number;
  notes_count: number;
  chat_sessions_count: number;
  last_active: string | null;
  recent_activity: {
    type: 'chat' | 'note' | 'class' | 'image';
    description: string;
    created_at: string;
  }[];
}

export const caregiverApi = {
  linkChild: (data: { childEmail: string }) => api.post<CaregiverChild>('/caregiver/link-child', data),

  getChildren: () => api.get<CaregiverChild[]>('/caregiver/children'),

  getChildActivity: (childId: string) => api.get<ChildActivity>(`/caregiver/child/${childId}/activity`),

  unlinkChild: (childId: string) => api.delete<{ success: boolean; message: string }>(`/caregiver/unlink/${childId}`),
};