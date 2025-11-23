'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { teacherApi, authApi, api, Class, ClassStudent, StudentActivity } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [stats, setStats] = useState<StudentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassSubject, setNewClassSubject] = useState('');

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
    if (response.data?.role === 'student') {
      router.push('/student');
      return;
    }
    if (response.data?.role !== 'teacher') {
      api.clearToken();
      router.push('/login');
      return;
    }
    loadClasses();
  };

  const loadClasses = async () => {
    const response = await teacherApi.getClasses();
    if (response.success && response.data) {
      setClasses(response.data);
    }
    setLoading(false);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await teacherApi.createClass({
      name: newClassName,
      subject: newClassSubject || undefined,
    });

    if (response.success && response.data) {
      setClasses([...classes, response.data]);
      setShowCreateModal(false);
      setNewClassName('');
      setNewClassSubject('');
    }
  };

  const handleSelectClass = async (classItem: Class) => {
    setSelectedClass(classItem);
    
    const [studentsResponse, statsResponse] = await Promise.all([
      teacherApi.getClassStudents(classItem.id),
      teacherApi.getClassStats(classItem.id),
    ]);

    if (studentsResponse.success && studentsResponse.data) {
      setStudents(studentsResponse.data);
    }

    if (statsResponse.success && statsResponse.data) {
      setStats(statsResponse.data);
    }
  };

  const handleLogout = () => {
    api.clearToken();
    router.push('/login');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
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
            <h1 className="text-xl font-bold text-gray-800">StudyCare AI - Teacher Dashboard</h1>
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
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">My Classes</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            + Create Class
          </button>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Create New Class</h3>
              <form onSubmit={handleCreateClass}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class Name
                  </label>
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Math 101"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject (Optional)
                  </label>
                  <input
                    type="text"
                    value={newClassSubject}
                    onChange={(e) => setNewClassSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="math"
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
                    onClick={() => setShowCreateModal(false)}
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
              <h3 className="font-semibold text-gray-800 mb-4">Classes ({classes.length})</h3>
              <div className="space-y-2">
                {classes.length === 0 ? (
                  <p className="text-gray-500 text-sm">No classes yet. Create one to get started!</p>
                ) : (
                  classes.map((classItem) => (
                    <div
                      key={classItem.id}
                      onClick={() => handleSelectClass(classItem)}
                      className={`p-3 rounded-lg cursor-pointer transition ${
                        selectedClass?.id === classItem.id
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="font-medium text-gray-800">{classItem.name}</div>
                      <div className="text-sm text-gray-600">
                        Code: <span className="font-mono font-semibold">{classItem.class_code}</span>
                      </div>
                      {classItem.subject && (
                        <div className="text-xs text-gray-500 mt-1">Subject: {classItem.subject}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedClass ? (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    {selectedClass.name} - Students
                  </h3>
                  <div className="space-y-4">
                    {students.length === 0 ? (
                      <p className="text-gray-500">No students enrolled yet.</p>
                    ) : (
                      students.map((enrollment) => (
                        <div
                          key={enrollment.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="font-medium text-gray-800">
                            {enrollment.user?.full_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-600">{enrollment.user?.email}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Joined: {formatDate(enrollment.joined_at)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Activity Statistics</h3>
                  {stats.length === 0 ? (
                    <p className="text-gray-500">No activity data available.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Student
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Last Active
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Questions
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Images
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Notes
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {stats.map((stat) => (
                            <tr key={stat.student_id}>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="font-medium text-gray-900">
                                  {stat.student_name || 'Unknown'}
                                </div>
                                <div className="text-sm text-gray-500">{stat.student_email}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {formatDate(stat.last_active)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {stat.questions_asked}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {stat.images_submitted}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {stat.notes_created}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">Select a class to view students and activity stats</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

