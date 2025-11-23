'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, api, caregiverApi, CaregiverChild, ChildActivity } from '@/lib/api';

export default function CaregiverPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [children, setChildren] = useState<CaregiverChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<CaregiverChild | null>(null);
  const [childActivity, setChildActivity] = useState<ChildActivity | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [childEmail, setChildEmail] = useState('');

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
    if (response.data?.role !== 'caregiver') {
      if (response.data?.role === 'student') {
        router.push('/student');
      } else if (response.data?.role === 'teacher') {
        router.push('/dashboard');
      } else {
        api.clearToken();
        router.push('/login');
      }
      return;
    }
    loadChildren();
  };

  const loadChildren = async () => {
    setLoading(true);
    const response = await caregiverApi.getChildren();
    if (response.success && response.data) {
      setChildren(response.data);
    } else {
      setError(response.error?.message || 'Failed to load children');
    }
    setLoading(false);
  };

  const handleLinkChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const response = await caregiverApi.linkChild({ childEmail });

    if (response.success && response.data) {
      setSuccess(`Successfully linked to ${response.data.child?.email || childEmail}`);
      setChildEmail('');
      setShowLinkModal(false);
      loadChildren();
    } else {
      setError(response.error?.message || 'Failed to link child');
    }
  };

  const handleSelectChild = async (child: CaregiverChild) => {
    setSelectedChild(child);
    setError('');
    setSuccess('');

    const response = await caregiverApi.getChildActivity(child.child_id);
    if (response.success && response.data) {
      setChildActivity(response.data);
    } else {
      setError(response.error?.message || 'Failed to load child activity');
    }
  };

  const handleUnlinkChild = async (childId: string) => {
    if (!confirm('Are you sure you want to unlink this child?')) return;

    setError('');
    setSuccess('');

    const response = await caregiverApi.unlinkChild(childId);
    if (response.success) {
      setSuccess('Child unlinked successfully');
      setSelectedChild(null);
      setChildActivity(null);
      loadChildren();
    } else {
      setError(response.error?.message || 'Failed to unlink child');
    }
  };

  const handleLogout = () => {
    api.clearToken();
    router.push('/login');
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
            <h1 className="text-xl font-bold text-gray-800">StudyCare AI - Caregiver Dashboard</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Logout
            </button>
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

        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Linked Children</h2>
          <button
            onClick={() => setShowLinkModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            + Link Child
          </button>
        </div>

        {showLinkModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Link Child Account</h3>
              <form onSubmit={handleLinkChild}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Child's Email
                  </label>
                  <input
                    type="email"
                    value={childEmail}
                    onChange={(e) => setChildEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="child@example.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The child must have a student account with this email.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Link
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkModal(false);
                      setChildEmail('');
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-800 mb-4">Children</h3>
              <div className="space-y-2">
                {children.length === 0 ? (
                  <p className="text-gray-500 text-sm">No children linked yet. Link a child to get started.</p>
                ) : (
                  children.map((child) => (
                    <div
                      key={child.id}
                      onClick={() => handleSelectChild(child)}
                      className={`p-3 rounded-lg cursor-pointer transition ${
                        selectedChild?.id === child.id
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">
                            {child.child?.full_name || child.child?.email || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {child.child?.email}
                          </div>
                          {child.child?.simplified_mode && (
                            <div className="text-xs text-blue-600 mt-1">Simplified Mode: ON</div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnlinkChild(child.child_id);
                          }}
                          className="ml-2 px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 hover:border-red-300 transition"
                        >
                          Unlink
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedChild && childActivity ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800">
                    {childActivity.child_name || childActivity.child_email}'s Activity
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">{childActivity.classes_count}</div>
                    <div className="text-sm text-gray-600">Classes</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{childActivity.notes_count}</div>
                    <div className="text-sm text-gray-600">Notes</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-600">{childActivity.chat_sessions_count}</div>
                    <div className="text-sm text-gray-600">Chat Sessions</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm text-gray-600">Last Active</div>
                  <div className="text-gray-800">
                    {childActivity.last_active
                      ? new Date(childActivity.last_active).toLocaleString()
                      : 'Never'}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Recent Activity</h4>
                  <div className="space-y-2">
                    {childActivity.recent_activity.length === 0 ? (
                      <p className="text-gray-500 text-sm">No recent activity</p>
                    ) : (
                      childActivity.recent_activity.map((activity, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm font-medium text-gray-800">{activity.description}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {new Date(activity.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center h-64">
                <p className="text-gray-500">Select a child to view their activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

