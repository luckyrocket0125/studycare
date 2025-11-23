'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { studentApi, authApi, api, chatApi, imageApi, voiceApi, podApi, noteApi, symptomApi, StudentClass, ChatSession, ChatMessage, VoiceChatResponse, StudyPod, PodMessage, Note, NoteSummary, NoteExplanation, SymptomGuidance, SymptomCheck } from '@/lib/api';

export default function StudentPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [classCode, setClassCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'classes' | 'chat' | 'image' | 'voice' | 'pods' | 'notes' | 'symptom'>('classes');
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newSessionSubject, setNewSessionSubject] = useState('');
  const [imageAnalysis, setImageAnalysis] = useState<{ sessionId: string; explanation: string; ocrText: string; imageUrl: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [voiceSessionId, setVoiceSessionId] = useState<string | null>(null);
  const [voiceResponse, setVoiceResponse] = useState<VoiceChatResponse | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [pods, setPods] = useState<StudyPod[]>([]);
  const [selectedPod, setSelectedPod] = useState<StudyPod | null>(null);
  const [podMessages, setPodMessages] = useState<PodMessage[]>([]);
  const [podMessageInput, setPodMessageInput] = useState('');
  const [sendingPodMessage, setSendingPodMessage] = useState(false);
  const [newPodName, setNewPodName] = useState('');
  const [showCreatePodModal, setShowCreatePodModal] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [noteSummary, setNoteSummary] = useState<NoteSummary | null>(null);
  const [noteExplanation, setNoteExplanation] = useState<NoteExplanation | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [symptomInput, setSymptomInput] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [symptomGuidance, setSymptomGuidance] = useState<SymptomGuidance | null>(null);
  const [symptomHistory, setSymptomHistory] = useState<SymptomCheck[]>([]);
  const [checkingSymptoms, setCheckingSymptoms] = useState(false);
  const [user, setUser] = useState<{ simplified_mode: boolean } | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const response = await authApi.getProfile();
    if (!response.success) {
      api.clearToken();
      router.push('/login');
      return;
    }
    if (response.data?.role === 'teacher') {
      router.push('/dashboard');
      return;
    }
    if (response.data?.role === 'caregiver') {
      router.push('/caregiver');
      return;
    }
    if (response.data?.role !== 'student') {
      api.clearToken();
      router.push('/login');
      return;
    }
    if (response.data) {
      setUser({ simplified_mode: response.data.simplified_mode });
    }
    loadData();
  };

  const handleToggleSimplifiedMode = async () => {
    if (!user) return;

    const response = await authApi.updateProfile({
      simplified_mode: !user.simplified_mode,
    });

    if (response.success && response.data) {
      setUser({ simplified_mode: response.data.simplified_mode });
      setSuccess('Simplified mode updated successfully!');
    } else {
      setError(response.error?.message || 'Failed to update simplified mode');
    }
  };

  const loadData = async () => {
    setLoading(true);
    const [classesResponse, sessionsResponse, podsResponse] = await Promise.all([
      studentApi.getClasses(),
      chatApi.getSessions(),
      podApi.getPods(),
    ]);

    if (classesResponse.success && classesResponse.data) {
      setClasses(classesResponse.data);
    }

    if (sessionsResponse.success && sessionsResponse.data) {
      setChatSessions(sessionsResponse.data);
    }

    if (podsResponse.success && podsResponse.data) {
      setPods(podsResponse.data);
    } else if (podsResponse.error) {
      console.error('Failed to load pods:', podsResponse.error);
    }

    const notesResponse = await noteApi.getNotes();
    if (notesResponse.success && notesResponse.data) {
      setNotes(notesResponse.data);
    } else if (notesResponse.error) {
      console.error('Failed to load notes:', notesResponse.error);
    }

    const symptomHistoryResponse = await symptomApi.getHistory();
    if (symptomHistoryResponse.success && symptomHistoryResponse.data) {
      setSymptomHistory(symptomHistoryResponse.data);
    } else if (symptomHistoryResponse.error) {
      console.error('Failed to load symptom history:', symptomHistoryResponse.error);
    }

    setLoading(false);
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!classCode.trim()) {
      setError('Please enter a class code');
      return;
    }

    const response = await studentApi.joinClass(classCode.toUpperCase());

    if (response.success && response.data) {
      setSuccess(`Successfully joined ${response.data.class?.name || 'class'}!`);
      setClassCode('');
      loadData();
    } else {
      setError(response.error?.message || 'Failed to join class');
    }
  };

  const handleCreateChatSession = async () => {
    const response = await chatApi.createSession({ subject: newSessionSubject || undefined });

    if (response.success && response.data) {
      setChatSessions([...chatSessions, response.data]);
      setSelectedSession(response.data);
      setMessages([]);
      setNewSessionSubject('');
      setActiveTab('chat');
    }
  };

  const handleSelectSession = async (session: ChatSession) => {
    setSelectedSession(session);
    const response = await chatApi.getSession(session.id);

    if (response.success && response.data) {
      setMessages(response.data.messages || []);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedSession || sendingMessage) return;

    setSendingMessage(true);
    const userMessage: ChatMessage = {
      id: 'temp',
      session_id: selectedSession.id,
      user_id: '',
      message_type: 'user',
      content: messageInput,
      created_at: new Date().toISOString(),
    };

    setMessages([...messages, userMessage]);
    setMessageInput('');

    const response = await chatApi.sendMessage({
      sessionId: selectedSession.id,
      message: messageInput,
    });

    if (response.success && response.data) {
      setMessages([...messages, userMessage, response.data.message]);
    } else {
      setError(response.error?.message || 'Failed to send message');
      setMessages(messages.filter(m => m.id !== 'temp'));
    }

    setSendingMessage(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setUploadingImage(true);
    setImageAnalysis(null);
    
    const formData = new FormData();
    formData.append('image', file);

    const response = await imageApi.upload(formData);

    if (response.success && response.data) {
      setSuccess('Image uploaded and analyzed successfully!');
      
      setImageAnalysis({
        sessionId: response.data.sessionId,
        explanation: response.data.explanation,
        ocrText: response.data.ocrText || '',
        imageUrl: response.data.imageUrl || '',
      });
      
      loadData();
    } else {
      setError(response.error?.message || 'Failed to upload image');
    }
    
    setUploadingImage(false);
    e.target.value = '';
  };

  const handleLogout = () => {
    api.clearToken();
    router.push('/login');
  };

  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          await handleVoiceChat(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setMediaRecorder(recorder);
        setRecording(true);
      })
      .catch((error) => {
        setError('Failed to access microphone: ' + error.message);
      });
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleVoiceChat = async (audioBlob: Blob) => {
    setError('');
    setSuccess('');
    setVoiceResponse(null);

    const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
    const response = await voiceApi.chat(audioFile, 'en', voiceSessionId || undefined);

    if (response.success && response.data) {
      setVoiceResponse(response.data);
      setVoiceSessionId(response.data.sessionId);
      setSuccess('Voice message processed successfully!');
    } else {
      setError(response.error?.message || 'Failed to process voice message');
    }
  };

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    setPlayingAudio(true);
    audio.play();
    audio.onended = () => setPlayingAudio(false);
    audio.onerror = () => {
      setError('Failed to play audio');
      setPlayingAudio(false);
    };
  };

  const handleCreatePod = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const response = await podApi.createPod({ name: newPodName });

    if (response.success && response.data) {
      setSuccess('Study pod created successfully!');
      setNewPodName('');
      setShowCreatePodModal(false);
      loadData();
    } else {
      setError(response.error?.message || 'Failed to create pod');
    }
  };

  const handleSelectPod = async (pod: StudyPod) => {
    setSelectedPod(pod);
    setPodMessages([]);
    setError('');
    setSuccess('');

    const response = await podApi.getMessages(pod.id, 50);
    if (response.success && response.data) {
      setPodMessages(response.data);
    } else {
      setError(response.error?.message || 'Failed to load messages');
    }
  };

  const handleSendPodMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podMessageInput.trim() || !selectedPod || sendingPodMessage) return;

    setSendingPodMessage(true);
    setError('');

    const response = await podApi.sendMessage(selectedPod.id, podMessageInput);

    if (response.success && response.data) {
      setPodMessages((prev) => [...prev, response.data!]);
      setPodMessageInput('');
    } else {
      setError(response.error?.message || 'Failed to send message');
    }

    setSendingPodMessage(false);
  };

  const handleJoinPod = async (podId: string) => {
    setError('');
    setSuccess('');

    const response = await podApi.joinPod(podId);

    if (response.success) {
      setSuccess('Joined study pod successfully!');
      loadData();
    } else {
      setError(response.error?.message || 'Failed to join pod');
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const response = await noteApi.createNote({
      title: noteTitle,
      content: noteContent,
      tags: noteTags,
    });

    if (response.success && response.data) {
      setSuccess('Note created successfully!');
      setNoteTitle('');
      setNoteContent('');
      setNoteTags([]);
      setShowCreateNoteModal(false);
      loadData();
    } else {
      setError(response.error?.message || 'Failed to create note');
    }
  };

  const handleSelectNote = async (note: Note) => {
    setSelectedNote(note);
    setNoteSummary(null);
    setNoteExplanation(null);
    setError('');
    setSuccess('');
  };

  const handleUpdateNote = async () => {
    if (!selectedNote) return;

    setError('');
    setSuccess('');

    const response = await noteApi.updateNote(selectedNote.id, {
      title: noteTitle || selectedNote.title,
      content: noteContent || selectedNote.content,
      tags: noteTags.length > 0 ? noteTags : selectedNote.tags,
    });

    if (response.success && response.data) {
      setSuccess('Note updated successfully!');
      setSelectedNote(response.data);
      loadData();
    } else {
      setError(response.error?.message || 'Failed to update note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    setError('');
    setSuccess('');

    const response = await noteApi.deleteNote(noteId);

    if (response.success) {
      setSuccess('Note deleted successfully!');
      setSelectedNote(null);
      loadData();
    } else {
      setError(response.error?.message || 'Failed to delete note');
    }
  };

  const handleSummarizeNote = async () => {
    if (!selectedNote) return;

    setLoadingAI(true);
    setError('');
    setSuccess('');

    const response = await noteApi.summarizeNote(selectedNote.id);

    if (response.success && response.data) {
      setNoteSummary(response.data);
      setSuccess('Note summarized successfully!');
      loadData();
    } else {
      setError(response.error?.message || 'Failed to summarize note');
    }

    setLoadingAI(false);
  };

  const handleExplainNote = async () => {
    if (!selectedNote) return;

    setLoadingAI(true);
    setError('');
    setSuccess('');

    const response = await noteApi.explainNote(selectedNote.id);

    if (response.success && response.data) {
      setNoteExplanation(response.data);
      setSuccess('Note explanation generated successfully!');
      loadData();
    } else {
      setError(response.error?.message || 'Failed to explain note');
    }

    setLoadingAI(false);
  };

  const handleOrganizeNote = async () => {
    if (!selectedNote) return;

    setLoadingAI(true);
    setError('');
    setSuccess('');

    const response = await noteApi.organizeNote(selectedNote.id);

    if (response.success && response.data) {
      setSelectedNote(response.data);
      setSuccess('Note organized successfully!');
      loadData();
    } else {
      setError(response.error?.message || 'Failed to organize note');
    }

    setLoadingAI(false);
  };

  const handleCheckSymptoms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomInput.trim()) {
      setError('Please describe your symptoms');
      return;
    }

    setCheckingSymptoms(true);
    setError('');
    setSuccess('');
    setSymptomGuidance(null);

    const response = await symptomApi.checkSymptoms({
      symptoms: symptomInput,
      additionalInfo: additionalInfo || undefined,
    });

    if (response.success && response.data) {
      setSymptomGuidance(response.data);
      setSymptomInput('');
      setAdditionalInfo('');
      loadData();
    } else {
      setError(response.error?.message || 'Failed to check symptoms');
    }

    setCheckingSymptoms(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-bold text-gray-800">StudyCare AI - Student Dashboard</h1>
              <div className="flex items-center gap-4">
                {user && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Simplified Mode</span>
                    <button
                      onClick={handleToggleSimplifiedMode}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        user.simplified_mode ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          user.simplified_mode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  Logout
                </button>
              </div>
            </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div className="mb-6 flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'classes'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            My Classes
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'chat'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            AI Chat
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'image'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Image Analysis
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'voice'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Voice Chat
          </button>
          <button
            onClick={() => setActiveTab('pods')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'pods'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Study Pods
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'notes'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Notes
          </button>
          <button
            onClick={() => setActiveTab('symptom')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'symptom'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Symptom Check
          </button>
        </div>

        {activeTab === 'classes' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Join a Class</h2>
              <form onSubmit={handleJoinClass} className="flex gap-2">
                <input
                  type="text"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  placeholder="Enter class code (e.g., ABC123)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  maxLength={10}
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Join Class
                </button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">My Classes ({classes.length})</h2>
              {classes.length === 0 ? (
                <p className="text-gray-500">You haven't joined any classes yet. Join one above!</p>
              ) : (
                <div className="space-y-3">
                  {classes.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                    >
                      <div className="font-medium text-gray-800">
                        {enrollment.class?.name || 'Unknown Class'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Code: <span className="font-mono font-semibold">{enrollment.class?.class_code}</span>
                      </div>
                      {enrollment.class?.subject && (
                        <div className="text-xs text-gray-500 mt-1">
                          Subject: {enrollment.class.subject}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        Joined: {new Date(enrollment.joined_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <button
                  onClick={handleCreateChatSession}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition mb-4"
                >
                  + New Chat Session
                </button>
                <input
                  type="text"
                  value={newSessionSubject}
                  onChange={(e) => setNewSessionSubject(e.target.value)}
                  placeholder="Subject (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-800 mb-4">Chat Sessions</h3>
                <div className="space-y-2">
                  {chatSessions.length === 0 ? (
                    <p className="text-gray-500 text-sm">No chat sessions yet</p>
                  ) : (
                    chatSessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session)}
                        className={`p-3 rounded-lg cursor-pointer transition ${
                          selectedSession?.id === session.id
                            ? 'bg-blue-50 border-2 border-blue-500'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-800">
                          {session.subject || 'General Chat'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(session.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow flex flex-col" style={{ height: '600px' }}>
                {selectedSession ? (
                  <>
                    <div className="p-4 border-b">
                      <h3 className="font-semibold text-gray-800">
                        {selectedSession.subject || 'General Chat'}
                      </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.length === 0 ? (
                        <p className="text-gray-500 text-center">Start a conversation!</p>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.message_type === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.message_type === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-800'
                              }`}
                            >
                              <div className="text-sm">{message.content}</div>
                              <div
                                className={`text-xs mt-1 ${
                                  message.message_type === 'user' ? 'text-blue-100' : 'text-gray-500'
                                }`}
                              >
                                {new Date(message.created_at).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        disabled={sendingMessage}
                      />
                      <button
                        type="submit"
                        disabled={sendingMessage || !messageInput.trim()}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        Send
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    Select a chat session or create a new one
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'image' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Upload Image for Analysis</h2>
              <p className="text-gray-600 mb-4">
                Upload a photo of your homework, notes, or study material. Our AI will extract the text and provide explanations.
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={uploadingImage}
                />
                <label
                  htmlFor="image-upload"
                  className={`cursor-pointer inline-block px-6 py-3 rounded-lg transition ${
                    uploadingImage
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {uploadingImage ? 'Analyzing...' : 'Choose Image'}
                </label>
                <p className="text-sm text-gray-500 mt-2">Supports: JPG, PNG, GIF, WebP</p>
              </div>
            </div>

            {imageAnalysis && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Analysis Results</h3>
                
                {imageAnalysis.imageUrl && (
                  <div className="mb-4">
                    <img
                      src={imageAnalysis.imageUrl}
                      alt="Uploaded"
                      className="max-w-full h-auto rounded-lg border border-gray-200"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Extracted Text:</h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-800 whitespace-pre-wrap">{imageAnalysis.ocrText || 'No text extracted'}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">AI Explanation:</h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-gray-800 whitespace-pre-wrap">{imageAnalysis.explanation}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'voice' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Voice Chat with AI</h2>
              <p className="text-gray-600 mb-4">
                Record your question and get an AI response with audio playback.
              </p>

              <div className="flex flex-col items-center space-y-4">
                <button
                  onClick={recording ? stopRecording : startRecording}
                  className={`px-8 py-4 rounded-full text-white font-semibold transition ${
                    recording
                      ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {recording ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-white rounded-full"></span>
                      Recording... Click to Stop
                    </span>
                  ) : (
                    '🎤 Start Recording'
                  )}
                </button>

                {voiceResponse && (
                  <div className="w-full space-y-4 mt-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-700 mb-2">You said:</h3>
                      <p className="text-gray-800">{voiceResponse.transcription}</p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-700 mb-2">AI Response:</h3>
                      <p className="text-gray-800 mb-4">{voiceResponse.aiResponse}</p>
                      {voiceResponse.audioUrl && (
                        <button
                          onClick={() => playAudio(voiceResponse.audioUrl!)}
                          disabled={playingAudio}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                          {playingAudio ? 'Playing...' : '🔊 Play Audio Response'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pods' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-800">Study Pods</h3>
                  <button
                    onClick={() => setShowCreatePodModal(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    + New Pod
                  </button>
                </div>
                {showCreatePodModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                      <h3 className="text-xl font-bold mb-4">Create Study Pod</h3>
                      <form onSubmit={handleCreatePod}>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Pod Name
                          </label>
                          <input
                            type="text"
                            value={newPodName}
                            onChange={(e) => setNewPodName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Math Study Group"
                            required
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                          >
                            Create
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCreatePodModal(false)}
                            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {pods.length === 0 ? (
                    <p className="text-gray-500 text-sm">No study pods yet. Create one!</p>
                  ) : (
                    pods.map((pod) => (
                      <div
                        key={pod.id}
                        onClick={() => handleSelectPod(pod)}
                        className={`p-3 rounded-lg cursor-pointer transition ${
                          selectedPod?.id === pod.id
                            ? 'bg-blue-50 border-2 border-blue-500'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <div className="font-medium text-gray-800">{pod.name}</div>
                        <div className="text-xs text-gray-600">
                          {pod.memberCount || 0} member{pod.memberCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6 flex flex-col h-[600px]">
                {selectedPod ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-gray-800">{selectedPod.name}</h3>
                      <div className="text-sm text-gray-600">
                        {selectedPod.memberCount || 0} member{selectedPod.memberCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                      {podMessages.length === 0 ? (
                        <p className="text-gray-500 text-center">No messages yet. Start the conversation!</p>
                      ) : (
                        podMessages.map((msg) => (
                          <div key={msg.id} className="space-y-2">
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <div className="text-xs font-medium text-gray-600 mb-1">
                                  {msg.user?.full_name || msg.user?.email || 'Unknown'}
                                </div>
                                <div className="bg-gray-100 rounded-lg p-3 text-gray-800">
                                  {msg.content}
                                </div>
                              </div>
                            </div>
                            {msg.ai_guidance && (
                              <div className="ml-4 pl-4 border-l-2 border-blue-300">
                                <div className="text-xs font-medium text-blue-600 mb-1">AI Guidance</div>
                                <div className="bg-blue-50 rounded-lg p-3 text-gray-800 text-sm">
                                  {msg.ai_guidance}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                      {sendingPodMessage && (
                        <div className="flex justify-start">
                          <div className="max-w-[70%] p-3 rounded-lg bg-gray-200 text-gray-800 animate-pulse">
                            Sending...
                          </div>
                        </div>
                      )}
                    </div>
                    <form onSubmit={handleSendPodMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={podMessageInput}
                        onChange={(e) => setPodMessageInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        disabled={sendingPodMessage}
                      />
                      <button
                        type="submit"
                        disabled={sendingPodMessage || !podMessageInput.trim()}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        Send
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    Select a study pod or create a new one
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-800">My Notes</h3>
                  <button
                    onClick={() => {
                      setShowCreateNoteModal(true);
                      setNoteTitle('');
                      setNoteContent('');
                      setNoteTags([]);
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    + New Note
                  </button>
                </div>
                {showCreateNoteModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                      <h3 className="text-xl font-bold mb-4">Create New Note</h3>
                      <form onSubmit={handleCreateNote}>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Title
                          </label>
                          <input
                            type="text"
                            value={noteTitle}
                            onChange={(e) => setNoteTitle(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Note title"
                            required
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Content
                          </label>
                          <textarea
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows={10}
                            placeholder="Write your note here..."
                            required
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                          >
                            Create
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCreateNoteModal(false)}
                            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {notes.length === 0 ? (
                    <p className="text-gray-500 text-sm">No notes yet. Create one!</p>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => {
                          handleSelectNote(note);
                          setNoteTitle(note.title);
                          setNoteContent(note.content);
                          setNoteTags(note.tags || []);
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition ${
                          selectedNote?.id === note.id
                            ? 'bg-blue-50 border-2 border-blue-500'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <div className="font-medium text-gray-800">{note.title}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {new Date(note.updated_at).toLocaleDateString()}
                        </div>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {note.tags.map((tag, idx) => (
                              <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                {selectedNote ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                          className="text-2xl font-bold text-gray-800 w-full px-2 py-1 border border-transparent hover:border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdateNote}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => handleDeleteNote(selectedNote.id)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[300px]"
                      rows={15}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSummarizeNote}
                        disabled={loadingAI}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                      >
                        {loadingAI ? 'Processing...' : '📝 Summarize'}
                      </button>
                      <button
                        onClick={handleExplainNote}
                        disabled={loadingAI}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
                      >
                        {loadingAI ? 'Processing...' : '💡 Explain'}
                      </button>
                      <button
                        onClick={handleOrganizeNote}
                        disabled={loadingAI}
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm"
                      >
                        {loadingAI ? 'Processing...' : '📋 Organize'}
                      </button>
                    </div>
                    {noteSummary && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-green-800 mb-2">Summary</h4>
                        <p className="text-gray-800 mb-2">{noteSummary.summary}</p>
                        <div className="mb-2">
                          <strong className="text-green-800">Key Points:</strong>
                          <ul className="list-disc list-inside text-gray-800">
                            {noteSummary.keyPoints.map((point, idx) => (
                              <li key={idx}>{point}</li>
                            ))}
                          </ul>
                        </div>
                        {noteSummary.suggestedTags && noteSummary.suggestedTags.length > 0 && (
                          <div>
                            <strong className="text-green-800">Suggested Tags:</strong>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {noteSummary.suggestedTags.map((tag, idx) => (
                                <span key={idx} className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {noteExplanation && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-800 mb-2">Explanation</h4>
                        <p className="text-gray-800 mb-2 whitespace-pre-wrap">{noteExplanation.explanation}</p>
                        {noteExplanation.concepts && noteExplanation.concepts.length > 0 && (
                          <div>
                            <strong className="text-purple-800">Key Concepts:</strong>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {noteExplanation.concepts.map((concept, idx) => (
                                <span key={idx} className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">
                                  {concept}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {selectedNote.ai_summary && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 mb-2">AI Summary</h4>
                        <p className="text-gray-700">{selectedNote.ai_summary}</p>
                      </div>
                    )}
                    {selectedNote.ai_explanation && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 mb-2">AI Explanation</h4>
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedNote.ai_explanation}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96 text-gray-500">
                    Select a note or create a new one
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'symptom' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Symptom Check</h2>
                  <p className="text-gray-600 text-sm">
                    Get educational information about symptoms. This is not a medical diagnosis. Always consult a healthcare professional for medical advice.
                  </p>
                </div>

                <form onSubmit={handleCheckSymptoms} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Describe your symptoms *
                    </label>
                    <textarea
                      value={symptomInput}
                      onChange={(e) => setSymptomInput(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      placeholder="e.g., I have been experiencing headaches for the past 3 days..."
                      required
                      disabled={checkingSymptoms}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Information (Optional)
                    </label>
                    <textarea
                      value={additionalInfo}
                      onChange={(e) => setAdditionalInfo(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="e.g., Started after a fall, worse in the morning..."
                      disabled={checkingSymptoms}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={checkingSymptoms || !symptomInput.trim()}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {checkingSymptoms ? 'Checking...' : 'Get Guidance'}
                  </button>
                </form>

                {symptomGuidance && (
                  <div className="mt-6 space-y-4">
                    <div className={`p-4 rounded-lg border-2 ${
                      symptomGuidance.severityLevel === 'emergency' ? 'bg-red-50 border-red-300' :
                      symptomGuidance.severityLevel === 'severe' ? 'bg-orange-50 border-orange-300' :
                      symptomGuidance.severityLevel === 'moderate' ? 'bg-yellow-50 border-yellow-300' :
                      'bg-green-50 border-green-300'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-800">Severity Level:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          symptomGuidance.severityLevel === 'emergency' ? 'bg-red-200 text-red-800' :
                          symptomGuidance.severityLevel === 'severe' ? 'bg-orange-200 text-orange-800' :
                          symptomGuidance.severityLevel === 'moderate' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-green-200 text-green-800'
                        }`}>
                          {symptomGuidance.severityLevel.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-800 mb-2">Guidance</h3>
                      <p className="text-gray-800">{symptomGuidance.guidance}</p>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-800 mb-2">Educational Information</h3>
                      <p className="text-gray-700">{symptomGuidance.educationalInfo}</p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h3 className="font-semibold text-yellow-800 mb-2">When to Seek Help</h3>
                      <p className="text-gray-800">{symptomGuidance.whenToSeekHelp}</p>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h3 className="font-semibold text-red-800 mb-2">⚠️ Important Disclaimer</h3>
                      <p className="text-red-700 text-sm">{symptomGuidance.disclaimer}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-800 mb-4">Recent Checks</h3>
                <div className="space-y-2">
                  {symptomHistory.length === 0 ? (
                    <p className="text-gray-500 text-sm">No previous symptom checks</p>
                  ) : (
                    symptomHistory.map((check) => (
                      <div
                        key={check.id}
                        onClick={() => {
                          setSymptomInput(check.symptoms);
                          setSymptomGuidance({
                            guidance: check.guidance,
                            educationalInfo: '',
                            whenToSeekHelp: '',
                            severityLevel: check.severity_level || 'mild',
                            disclaimer: 'This is educational information only and not a substitute for professional medical advice.',
                          });
                        }}
                        className="p-3 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-blue-300 transition"
                      >
                        <div className="text-sm font-medium text-gray-800 line-clamp-2">
                          {check.symptoms}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {new Date(check.created_at).toLocaleDateString()}
                        </div>
                        {check.severity_level && (
                          <div className="mt-1">
                            <span className={`text-xs px-2 py-1 rounded ${
                              check.severity_level === 'emergency' ? 'bg-red-200 text-red-800' :
                              check.severity_level === 'severe' ? 'bg-orange-200 text-orange-800' :
                              check.severity_level === 'moderate' ? 'bg-yellow-200 text-yellow-800' :
                              'bg-green-200 text-green-800'
                            }`}>
                              {check.severity_level}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

