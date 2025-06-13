// src/pages/Dashboard.tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  PlusIcon,
  DocumentTextIcon,
  UsersIcon,
  ShareIcon,
  EyeIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  field_order: number;
}

interface SharingCode {
  id: string;
  share_code: string;
  group_name: string;
  is_active: boolean;
  created_at: string;
  response_count: number;
}

interface Form {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  form_fields: FormField[];
  form_sharing_codes: SharingCode[];
  total_responses: number;
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Sharing code management state
  const [selectedFormForSharing, setSelectedFormForSharing] = useState<
    string | null
  >(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingShareCode, setCreatingShareCode] = useState(false);

  // Statistics state
  const [stats, setStats] = useState({
    totalForms: 0,
    activeForms: 0,
    totalResponses: 0,
    totalGroups: 0,
  });

  useEffect(() => {
    loadForms();
  }, []);

  useEffect(() => {
    // Calculate statistics when forms change
    if (forms.length > 0) {
      const totalForms = forms.length;
      const activeForms = forms.filter((form) => form.is_active).length;
      const totalResponses = forms.reduce(
        (sum, form) => sum + (form.total_responses || 0),
        0
      );
      const totalGroups = forms.reduce(
        (sum, form) => sum + (form.form_sharing_codes?.length || 0),
        0
      );

      setStats({
        totalForms,
        activeForms,
        totalResponses,
        totalGroups,
      });
    }
  }, [forms]);

  const loadForms = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/forms`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setForms(Array.isArray(data) ? data : []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to load forms");
      }
    } catch (error: any) {
      setError("Failed to load forms. Please check your connection.");
      console.error("Load forms error:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = (shareCode: string) => {
    const shareUrl = `${window.location.origin}/forms/${shareCode}`;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        // You could add a toast notification here
        alert("Share link copied to clipboard!");
      })
      .catch(() => {
        alert("Failed to copy link");
      });
  };

  const deleteForm = async (formId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this form? This will delete all associated groups and responses."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/forms/${formId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.ok) {
        setForms(forms.filter((form) => form.id !== formId));
      } else {
        alert("Failed to delete form");
      }
    } catch (error) {
      alert("Failed to delete form");
      console.error("Delete form error:", error);
    }
  };

  const createNewSharingCode = async (formId: string) => {
    if (!newGroupName.trim()) {
      alert("Please enter a group name");
      return;
    }

    setCreatingShareCode(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/forms/${formId}/sharing-codes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ groupName: newGroupName.trim() }),
        }
      );

      if (response.ok) {
        const newSharingCode = await response.json();
        // Refresh forms to show new sharing code
        loadForms();
        setSelectedFormForSharing(null);
        setNewGroupName("");

        // Show success message with the new code
        alert(
          `New sharing code created successfully!\n\nGroup: ${newSharingCode.group_name}\nCode: ${newSharingCode.share_code}\n\nShare this code with your team members.`
        );
      } else {
        const error = await response.json();
        alert(`Failed to create sharing code: ${error.error}`);
      }
    } catch (error) {
      alert("Failed to create sharing code");
    } finally {
      setCreatingShareCode(false);
    }
  };

  const closeModal = () => {
    setSelectedFormForSharing(null);
    setNewGroupName("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-b-2 border-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            Error Loading Dashboard
          </h3>
          <p className="mb-4 text-gray-600">{error}</p>
          <button
            onClick={loadForms}
            className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <DocumentTextIcon className="w-8 h-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Collaborative Forms
                </h1>
              </div>
              {user?.role === "ADMIN" && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Admin
                </span>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <Link
                to="/join"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <UserGroupIcon className="w-4 h-4 mr-2" />
                Join Form
              </Link>

              {user?.role === "ADMIN" && (
                <Link
                  to="/forms/create"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Form
                </Link>
              )}

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Welcome, {user?.email}
                </span>
                <button
                  onClick={logout}
                  className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-4">
          <div className="overflow-hidden bg-white rounded-lg shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="w-6 h-6 text-gray-400" />
                </div>
                <div className="flex-1 w-0 ml-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Forms
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalForms}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden bg-white rounded-lg shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="w-6 h-6 text-gray-400" />
                </div>
                <div className="flex-1 w-0 ml-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Forms
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.activeForms}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden bg-white rounded-lg shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ShareIcon className="w-6 h-6 text-gray-400" />
                </div>
                <div className="flex-1 w-0 ml-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Responses
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalResponses}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden bg-white rounded-lg shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="w-6 h-6 text-gray-400" />
                </div>
                <div className="flex-1 w-0 ml-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Groups
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalGroups}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Forms Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                {user?.role === "ADMIN" ? "Your Forms" : "Available Forms"}
              </h3>
            </div>

            {forms.length === 0 ? (
              <div className="py-12 text-center">
                <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No forms
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {user?.role === "ADMIN"
                    ? "Get started by creating a new form."
                    : "No forms are available at the moment."}
                </p>
                {user?.role === "ADMIN" && (
                  <div className="mt-6">
                    <Link
                      to="/forms/create"
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Create Form
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1">
                {forms.map((form) => (
                  <div
                    key={form.id}
                    className="transition-shadow bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md"
                  >
                    <div className="p-6">
                      {/* Form Header */}
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-gray-900 truncate">
                          {form.title || "Untitled Form"}
                        </h4>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            form.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {form.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {/* Form Description */}
                      {form.description && (
                        <p className="mb-4 text-sm text-gray-600 line-clamp-2">
                          {form.description}
                        </p>
                      )}

                      {/* Form Stats */}
                      <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
                        <span>{form.form_fields?.length || 0} fields</span>
                        <span>{form.total_responses || 0} total responses</span>
                        <span>
                          {form.form_sharing_codes?.length || 0} groups
                        </span>
                      </div>

                      {/* Sharing Codes Section */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-medium text-gray-700">
                            Group Sharing Codes (
                            {form.form_sharing_codes?.length || 0})
                          </h5>
                          {user?.role === "ADMIN" && (
                            <button
                              onClick={() => setSelectedFormForSharing(form.id)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 transition-colors bg-blue-100 border border-transparent rounded hover:bg-blue-200"
                            >
                              <PlusIcon className="w-3 h-3 mr-1" />
                              Add Group
                            </button>
                          )}
                        </div>

                        <div className="space-y-2 overflow-y-auto max-h-48">
                          {form.form_sharing_codes?.length > 0 ? (
                            form.form_sharing_codes.map(
                              (sharingCode: SharingCode) => (
                                <div
                                  key={sharingCode.id}
                                  className="flex items-center justify-between p-3 rounded-md bg-gray-50"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-mono text-sm font-bold text-gray-900">
                                        {sharingCode.share_code}
                                      </span>
                                      <span
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                          sharingCode.is_active
                                            ? "bg-green-100 text-green-800"
                                            : "bg-gray-100 text-gray-800"
                                        }`}
                                      >
                                        {sharingCode.is_active
                                          ? "Active"
                                          : "Inactive"}
                                      </span>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-600">
                                      <span className="font-medium">
                                        {sharingCode.group_name}
                                      </span>
                                      <span className="mx-2">•</span>
                                      <span>
                                        {sharingCode.response_count} responses
                                      </span>
                                      <span className="mx-2">•</span>
                                      <span>
                                        Created{" "}
                                        {new Date(
                                          sharingCode.created_at
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center ml-3 space-x-1">
                                    <Link
                                      to={`/forms/${sharingCode.share_code}`}
                                      className="inline-flex items-center px-2 py-1 text-xs text-blue-700 transition-colors bg-blue-100 rounded hover:bg-blue-200"
                                    >
                                      <EyeIcon className="w-3 h-3 mr-1" />
                                      Join
                                    </Link>
                                    <button
                                      onClick={() =>
                                        copyShareLink(sharingCode.share_code)
                                      }
                                      className="inline-flex items-center px-2 py-1 text-xs text-green-700 transition-colors bg-green-100 rounded hover:bg-green-200"
                                    >
                                      <ClipboardDocumentIcon className="w-3 h-3 mr-1" />
                                      Copy
                                    </button>
                                  </div>
                                </div>
                              )
                            )
                          ) : (
                            <div className="py-4 text-sm text-center text-gray-500">
                              No groups created yet
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Form Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="flex items-center space-x-2">
                          {user?.role === "ADMIN" && (
                            <Link
                              to={`/forms/${form.id}/responses`}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-purple-700 bg-purple-100 hover:bg-purple-200 transition-colors"
                            >
                              <EyeIcon className="w-3 h-3 mr-1" />
                              View Responses
                            </Link>
                          )}
                        </div>

                        {user?.role === "ADMIN" && (
                          <button
                            onClick={() => deleteForm(form.id)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 transition-colors"
                          >
                            <TrashIcon className="w-3 h-3 mr-1" />
                            Delete Form
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal for creating new sharing code */}
      {selectedFormForSharing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center w-full h-full overflow-y-auto bg-gray-600 bg-opacity-50">
          <div className="relative w-full max-w-md mx-4 bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Create New Group
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 transition-colors hover:text-gray-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <p className="mb-4 text-sm text-gray-600">
                Create a new sharing code for a different group to collaborate
                on this form.
              </p>

              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Team Alpha, Marketing Group, Project Beta"
                  maxLength={50}
                  disabled={creatingShareCode}
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will help identify the group and generate a recognizable
                  share code.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeModal}
                  disabled={creatingShareCode}
                  className="px-4 py-2 text-sm font-medium text-gray-700 transition-colors bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createNewSharingCode(selectedFormForSharing)}
                  disabled={creatingShareCode || !newGroupName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingShareCode ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 mr-2 border-b-2 border-white rounded-full animate-spin"></div>
                      Creating...
                    </div>
                  ) : (
                    "Create Group"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
