// src/pages/CollaborativeForm.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../contexts/AuthContext";
import FormField from "../components/FormField";
import ActiveUsers from "../components/ActiveUsers";

interface FormFieldType {
  id: string;
  label: string;
  type:
    | "TEXT"
    | "NUMBER"
    | "EMAIL"
    | "DROPDOWN"
    | "TEXTAREA"
    | "CHECKBOX"
    | "RADIO";
  required: boolean;
  options: string[];
  field_order: number;
}

interface FormResponse {
  id: string;
  form_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  response_fields: ResponseField[];
}

interface ResponseField {
  id: string;
  response_id: string;
  field_id: string;
  value: string;
}

interface Form {
  id: string;
  title: string;
  description: string | null;
  share_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  form_fields: FormFieldType[];
  form_responses: FormResponse[];
}

const CollaborativeForm: React.FC = () => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const { socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [form, setForm] = useState<Form | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [lockedFields, setLockedFields] = useState<Record<string, string>>({});
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Submission state
  const [submitStatus, setSubmitStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string>("");
  const [isCollaborativeSubmission, setIsCollaborativeSubmission] =
    useState(false);
  const [collaborativeSubmissionData, setCollaborativeSubmissionData] =
    useState<{
      submittedBy: string;
      responseId: string;
      formTitle: string;
      groupName: string;
      timestamp: string;
    } | null>(null);

  useEffect(() => {
    if (shareCode && socket) {
      // Join form room
      socket.emit("join-form", shareCode);

      // Load form data
      loadForm();

      // Existing socket event listeners
      socket.on("user-joined", (userData) => {
        console.log("User joined:", userData.email);
        setActiveUsers((prev) => {
          if (!prev.includes(userData.email)) {
            return [...prev, userData.email];
          }
          return prev;
        });
      });

      socket.on("active-users", (users) => {
        setActiveUsers(Array.isArray(users) ? users : []);
      });

      socket.on("user-left", (userData) => {
        console.log("User left:", userData.email);
        setActiveUsers((prev) =>
          prev.filter((email) => email !== userData.email)
        );
      });

      socket.on("field-locked", ({ fieldId, userEmail }) => {
        setLockedFields((prev) => ({ ...prev, [fieldId]: userEmail }));
      });

      socket.on("field-unlocked", ({ fieldId }) => {
        setLockedFields((prev) => {
          const updated = { ...prev };
          delete updated[fieldId];
          return updated;
        });
      });

      socket.on("field-updated", ({ fieldId, value, updatedBy }) => {
        setFormData((prev) => ({ ...prev, [fieldId]: value }));
        console.log(`Field ${fieldId} updated by ${updatedBy}: ${value}`);
      });

      // Handle collaborative form submission - UPDATED
      socket.on(
        "form-submitted-all",
        (data: {
          submittedBy: string;
          responseId: string;
          formTitle: string;
          groupName: string;
          timestamp: string;
          formData: Record<string, string>;
        }) => {
          console.log(
            `📤 Form submitted by ${data.submittedBy} - showing success for all in group ${data.groupName}`
          );

          // Update form data with submitted data
          setFormData(data.formData);

          // Set collaborative submission state
          setCollaborativeSubmissionData({
            submittedBy: data.submittedBy,
            responseId: data.responseId,
            formTitle: data.formTitle,
            groupName: data.groupName,
            timestamp: data.timestamp,
          });

          setIsCollaborativeSubmission(true);
          setIsSubmitted(true);
          setSubmitStatus(
            `Form submitted successfully by ${data.submittedBy}!`
          );
        }
      );

      // Handle collaborative form reset - UPDATED
      socket.on("form-reset-all", ({ resetBy, timestamp }) => {
        setFormData({});
        setIsSubmitted(false);
        setIsCollaborativeSubmission(false);
        setCollaborativeSubmissionData(null);
        setSubmissionId("");
        setSubmitStatus(`Form reset by ${resetBy}. You can now fill it again.`);

        console.log(`🔄 Form reset by ${resetBy} at ${timestamp}`);
      });

      return () => {
        socket.off("user-joined");
        socket.off("active-users");
        socket.off("user-left");
        socket.off("field-locked");
        socket.off("field-unlocked");
        socket.off("field-updated");
        socket.off("form-submitted-all");
        socket.off("form-reset-all");
      };
    }
  }, [shareCode, socket]);
  const loadForm = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/forms/share/${shareCode}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.ok) {
        const formData = await response.json();
        setForm(formData);

        // Initialize form data with existing responses
        const initialData: Record<string, string> = {};
        const responses = formData?.form_responses || [];

        if (responses.length > 0 && responses[0]?.response_fields) {
          responses[0].response_fields.forEach((field: ResponseField) => {
            if (field?.field_id && field?.value !== undefined) {
              initialData[field.field_id] = field.value;
            }
          });
        }
        setFormData(initialData);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to load form");
      }
    } catch (error: any) {
      console.error("Failed to load form:", error);
      setError("Failed to load form. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldFocus = (fieldId: string) => {
    if (socket && !lockedFields[fieldId]) {
      socket.emit("lock-field", { shareCode, fieldId });
    }
  };

  const handleFieldBlur = (fieldId: string) => {
    if (socket && lockedFields[fieldId] === user?.email) {
      // Delay unlock to allow for quick refocus
      setTimeout(() => {
        if (lockedFields[fieldId] === user?.email) {
          socket.emit("unlock-field", { shareCode, fieldId });
        }
      }, 500);
    }
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    // Always update local state immediately for better UX
    setFormData((prev) => ({ ...prev, [fieldId]: value }));

    // Only send updates if user has the lock or no one has it
    if (
      socket &&
      (!lockedFields[fieldId] || lockedFields[fieldId] === user?.email)
    ) {
      // Auto-lock if not locked
      if (!lockedFields[fieldId]) {
        socket.emit("lock-field", { shareCode, fieldId });
      }
      socket.emit("field-update", { shareCode, fieldId, value });
    }
  };

  const validateForm = () => {
    if (!form) return false;

    const requiredFields = form.form_fields.filter((field) => field.required);
    const missingFields = requiredFields.filter(
      (field) => !formData[field.id] || formData[field.id].trim() === ""
    );

    if (missingFields.length > 0) {
      setSubmitStatus(
        `Please fill in required fields: ${missingFields
          .map((f) => f.label)
          .join(", ")}`
      );
      return false;
    }

    return true;
  };
  const handleSubmit = async () => {
    if (!form || !validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus("Submitting...");

    try {
      // Filter out empty values before submission
      const cleanFormData = Object.fromEntries(
        Object.entries(formData).filter(
          ([key, value]) =>
            value !== null && value !== undefined && String(value).trim() !== ""
        )
      );

      console.log("Submitting clean form data:", cleanFormData);

      const response = await fetch(
        `${
          import.meta.env.VITE_BACKEND_URL
        }/api/forms/share/${shareCode}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ formData: cleanFormData }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        setSubmissionId(result.response_id);

        // Notify ALL users via socket (including current user)
        if (socket) {
          socket.emit("form-submit", {
            shareCode,
            submittedBy: user?.email,
            responseId: result.response_id,
            formData: cleanFormData,
          });
        }

        // Don't set local state here - let the socket event handle it
        // This ensures all users get the success screen simultaneously
      } else {
        console.error("Submission failed:", result);
        setSubmitStatus(
          `Submission failed: ${result.error || "Unknown error"}`
        );
        if (result.details) {
          console.error("Error details:", result.details);
        }
      }
    } catch (error) {
      console.error("Network error during submission:", error);
      setSubmitStatus("Submission failed: Network error");
    } finally {
      setIsSubmitting(false);
    }
  };
  const resetForm = () => {
    setFormData({});
    setIsSubmitted(false);
    setIsCollaborativeSubmission(false);
    setCollaborativeSubmissionData(null);
    setSubmissionId("");
    setSubmitStatus("");

    // Notify other users about form reset
    if (socket) {
      socket.emit("form-reset", { shareCode, resetBy: user?.email });
    }
  };

  // Success Screen Component
  const SuccessScreen = () => {
    const displayData = collaborativeSubmissionData || {
      submittedBy: user?.email || "You",
      responseId: submissionId,
      formTitle: form?.title || "Form",
      groupName: "Your Group",
      timestamp: new Date().toISOString(),
    };

    return (
      <div className="container px-4 py-8 mx-auto">
        <div className="max-w-2xl mx-auto">
          <div className="p-8 text-center bg-white rounded-lg shadow-lg">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h1 className="mb-4 text-3xl font-bold text-gray-900">
              🎉 Form Submitted Successfully!
            </h1>

            <p className="mb-6 text-gray-600">
              {isCollaborativeSubmission &&
              displayData.submittedBy !== user?.email
                ? `${displayData.submittedBy} submitted the collaborative form for your group "${displayData.groupName}". Thank you for your contribution!`
                : `Thank you for submitting the collaborative form for group "${displayData.groupName}". Your response has been recorded.`}
            </p>

            <div className="p-4 mb-6 rounded-lg bg-gray-50">
              <div className="text-sm text-gray-600">
                <p>
                  <strong>Submission ID:</strong>{" "}
                  <span className="font-mono">{displayData.responseId}</span>
                </p>
                <p>
                  <strong>Submitted at:</strong>{" "}
                  {new Date(displayData.timestamp).toLocaleString()}
                </p>
                <p>
                  <strong>Form:</strong> {displayData.formTitle}
                </p>
                <p>
                  <strong>Group:</strong> {displayData.groupName}
                </p>
                <p>
                  <strong>Submitted by:</strong> {displayData.submittedBy}
                </p>
                {isCollaborativeSubmission && (
                  <div className="p-3 mt-3 rounded-md bg-blue-50">
                    <p className="font-medium text-blue-800">
                      🤝 Collaborative Submission Complete
                    </p>
                    <p className="mt-1 text-xs text-blue-600">
                      All team members in "{displayData.groupName}" contributed
                      to this response
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <button
                onClick={resetForm}
                className="px-6 py-3 font-medium text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Start New Collaboration
              </button>

              <button
                onClick={() => navigate("/")}
                className="px-6 py-3 font-medium text-white transition-colors bg-gray-600 rounded-md hover:bg-gray-700"
              >
                Back to Dashboard
              </button>
            </div>

            <div className="mt-6 text-sm text-gray-500">
              <p>
                Share Code:{" "}
                <span className="font-mono font-bold">{shareCode}</span>
              </p>
              <p className="mt-1">
                Share this code with others to collaborate on forms!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-32 h-32 border-b-2 border-blue-500 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="container px-4 py-8 mx-auto">
        <div className="max-w-md mx-auto text-center">
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
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Error Loading Form
          </h1>
          <p className="mb-4 text-gray-600">{error}</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={loadForm}
              className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 text-white transition-colors bg-gray-600 rounded-md hover:bg-gray-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form Not Found State
  if (!form) {
    return (
      <div className="container px-4 py-8 mx-auto">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Form Not Found
          </h1>
          <p className="mb-4 text-gray-600">
            The form you're looking for doesn't exist or has been deactivated.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show success screen if form is submitted
  if (isSubmitted) {
    return <SuccessScreen />;
  }

  const formFields = form?.form_fields || [];

  // Main Form Component
  return (
    <div className="container px-4 py-8 mx-auto">
      <div className="max-w-4xl mx-auto">
        <div className="p-6 mb-6 bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900">
                {form.title || "Untitled Form"}
              </h1>
              {form.description && (
                <p className="text-gray-600">{form.description}</p>
              )}
              <div className="flex items-center mt-2 space-x-4">
                <div className="text-sm text-blue-600">
                  🔗 Collaborative Form - Real-time editing enabled
                </div>
                <div className="text-sm text-gray-500">
                  Share Code:{" "}
                  <span className="px-2 py-1 font-mono font-bold bg-gray-100 rounded">
                    {shareCode}
                  </span>
                </div>
              </div>
            </div>
            <ActiveUsers users={activeUsers} />
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {formFields.length > 0 ? (
              formFields
                .sort((a, b) => a.field_order - b.field_order)
                .map((field: FormFieldType) => (
                  <FormField
                    key={field.id}
                    field={field}
                    value={formData[field.id] || ""}
                    onChange={(value) => handleFieldChange(field.id, value)}
                    onFocus={() => handleFieldFocus(field.id)}
                    onBlur={() => handleFieldBlur(field.id)}
                    isLocked={!!lockedFields[field.id]}
                    lockedBy={lockedFields[field.id]}
                    currentUser={user?.email || ""}
                  />
                ))
            ) : (
              <div className="py-8 text-center">
                <p className="text-gray-500">
                  No fields available in this form.
                </p>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-6 mt-8 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  className="px-4 py-2 text-white transition-colors bg-gray-600 rounded-md hover:bg-gray-700"
                  onClick={() => window.print()}
                >
                  Export Form
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="px-4 py-2 text-gray-700 transition-colors bg-gray-300 rounded-md hover:bg-gray-400"
                >
                  Back to Dashboard
                </button>
              </div>

              <div className="flex flex-col items-end space-y-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  } text-white`}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 mr-2 border-b-2 border-white rounded-full animate-spin"></div>
                      Submitting...
                    </div>
                  ) : (
                    "Submit Form"
                  )}
                </button>

                {submitStatus && (
                  <p
                    className={`text-sm ${
                      submitStatus.includes("successfully")
                        ? "text-green-600"
                        : submitStatus.includes("failed")
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  >
                    {submitStatus}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Collaboration Info */}
          <div className="p-4 mt-6 rounded-lg bg-blue-50">
            <h3 className="mb-2 text-sm font-medium text-blue-900">
              Collaboration Features:
            </h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Real-time editing - see changes as others type</li>
              <li>
                • Field locking - prevents conflicts when multiple users edit
              </li>
              <li>
                • Live user presence - see who's currently working on the form
              </li>
              <li>
                • Collaborative submission - everyone works on one shared
                response
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborativeForm;
