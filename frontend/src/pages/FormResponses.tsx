// src/pages/FormResponses.tsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
  HashtagIcon,
} from "@heroicons/react/24/outline";

interface ResponseField {
  id: string;
  field_id: string;
  value: string;
}

interface FormResponse {
  id: string;
  created_at: string;
  updated_at: string;
  response_fields: ResponseField[];
  users: {
    email: string;
  };
}

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  field_order: number;
  options: string[];
}

interface FormData {
  id: string;
  title: string;
  description: string;
  form_fields: FormField[];
}

interface FieldContributor {
  email: string;
  value: string;
  last_edited: string;
}

const FormResponses: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const { user } = useAuth();

  // State management
  const [form, setForm] = useState<FormData | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [fieldContributors, setFieldContributors] = useState<
    Record<string, FieldContributor[]>
  >({});
  const [submissionCount, setSubmissionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // View controls
  const [viewMode, setViewMode] = useState<"summary" | "detailed" | "table">(
    "summary"
  );
  const [expandedResponses, setExpandedResponses] = useState<Set<string>>(
    new Set()
  );
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [filterBy, setFilterBy] = useState<string>("all");

  useEffect(() => {
    loadFormResponses();
  }, [formId]);

  const getUniqueContributors = () => {
    const allContributors = Object.values(fieldContributors).flat();
    const uniqueEmails = new Set(allContributors.map((c) => c.email));
    return Array.from(uniqueEmails);
  };

  const loadFormResponses = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/forms/${formId}/responses`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setForm(data.form);
        setResponses(data.responses || []);
        setFieldContributors(data.fieldContributors || {});
        setSubmissionCount(data.submissionCount || 0);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to load responses");
      }
    } catch (error: any) {
      setError("Failed to load responses. Please check your connection.");
      console.error("Load responses error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFieldValue = (response: FormResponse, fieldId: string): string => {
    const field = response.response_fields.find((f) => f.field_id === fieldId);
    return field?.value || "";
  };

  const getFieldContributorsList = (fieldId: string): FieldContributor[] => {
    return fieldContributors[fieldId] || [];
  };

  const formatFieldValue = (field: FormField, value: string): string => {
    if (!value || value === "") return "Not answered";

    switch (field.type) {
      case "CHECKBOX":
        return (
          value
            .split(",")
            .filter((v) => v.trim())
            .join(", ") || "Not answered"
        );
      case "DROPDOWN":
      case "RADIO":
        return value;
      case "EMAIL":
        return value;
      case "NUMBER":
        return value;
      case "TEXTAREA":
        return value.length > 100 ? value.substring(0, 100) + "..." : value;
      default:
        return value;
    }
  };

  const toggleResponseExpansion = (responseId: string) => {
    const newExpanded = new Set(expandedResponses);
    if (newExpanded.has(responseId)) {
      newExpanded.delete(responseId);
    } else {
      newExpanded.add(responseId);
    }
    setExpandedResponses(newExpanded);
  };

  const getSortedResponses = () => {
    let sorted = [...responses];

    if (sortBy === "newest") {
      sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else {
      sorted.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    if (filterBy !== "all") {
      sorted = sorted.filter((response) => response.users?.email === filterBy);
    }

    return sorted;
  };

  const getUniqueSubmitters = () => {
    const submitters = new Set(
      responses.map((r) => r.users?.email).filter(Boolean)
    );
    return Array.from(submitters);
  };

  const exportToCSV = () => {
    if (!form || responses.length === 0) return;

    const headers = [
      "Submission ID",
      "Submitted By",
      "Submitted At",
      ...form.form_fields.map((f) => f.label),
    ];
    const csvContent = [
      headers.join(","),
      ...responses.map((response) =>
        [
          response.id,
          response.users?.email || "Anonymous",
          new Date(response.created_at).toLocaleString(),
          ...form.form_fields.map((field) => {
            const value = getFieldValue(response, field.id);
            return `"${value.replace(/"/g, '""')}"`;
          }),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.title}_responses.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-b-2 border-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading responses...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
            <ExclamationCircleIcon className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Error Loading Responses
          </h1>
          <p className="mb-4 text-gray-600">{error}</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={loadFormResponses}
              className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
            <Link
              to="/"
              className="px-4 py-2 text-center text-white transition-colors bg-gray-600 rounded-md hover:bg-gray-700"
            >
              Back to Dashboard
            </Link>
          </div>
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
              <Link
                to="/"
                className="text-gray-500 transition-colors hover:text-gray-700"
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </Link>
              <div className="flex items-center space-x-2">
                <DocumentTextIcon className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Form Responses
                  </h1>
                  <p className="text-sm text-gray-600">{form?.title}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setViewMode("summary")}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    viewMode === "summary"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setViewMode("detailed")}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    viewMode === "detailed"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Detailed
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    viewMode === "table"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Table
                </button>
              </div>

              <span className="text-sm text-gray-700">
                Welcome, {user?.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-5 sm:p-6">
            {/* Form Info */}
            <div className="mb-6">
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                {form?.title || "Form Responses"}
              </h3>
              {form?.description && (
                <p className="mb-4 text-gray-600">{form.description}</p>
              )}

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
                <div className="p-4 rounded-lg bg-blue-50">
                  <div className="flex items-center">
                    <CheckCircleIcon className="w-8 h-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-900">
                        Total Submissions
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {submissionCount}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-green-50">
                  <div className="p-4 rounded-lg bg-green-50">
                    <div className="flex items-center">
                      <UserIcon className="w-8 h-8 text-green-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-900">
                          Unique Contributors
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {getUniqueContributors().length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-purple-50">
                  <div className="flex items-center">
                    <ClockIcon className="w-8 h-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-900">
                        Last Submission
                      </p>
                      <p className="text-sm font-bold text-purple-600">
                        {responses.length > 0
                          ? new Date(
                              Math.max(
                                ...responses.map((r) =>
                                  new Date(r.created_at).getTime()
                                )
                              )
                            ).toLocaleDateString()
                          : "Never"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-orange-50">
                  <div className="flex items-center">
                    <HashtagIcon className="w-8 h-8 text-orange-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-orange-900">
                        Form Fields
                      </p>
                      <p className="text-2xl font-bold text-orange-600">
                        {form?.form_fields?.length || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              {responses.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="flex items-center space-x-4">
                    {/* Sort Controls */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">
                        Sort by:
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) =>
                          setSortBy(e.target.value as "newest" | "oldest")
                        }
                        className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                      </select>
                    </div>

                    {/* Filter Controls */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">
                        Filter by:
                      </label>
                      <select
                        value={filterBy}
                        onChange={(e) => setFilterBy(e.target.value)}
                        className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Submitters</option>
                        {getUniqueSubmitters().map((submitter) => (
                          <option key={submitter} value={submitter}>
                            {submitter}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Export Button */}
                  <button
                    onClick={exportToCSV}
                    className="px-4 py-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-md hover:bg-green-700"
                  >
                    Export CSV
                  </button>
                </div>
              )}
            </div>

            {/* Content based on view mode */}
            {submissionCount === 0 ? (
              <div className="py-12 text-center">
                <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No responses yet
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Responses will appear here once users submit the form.
                </p>
                <div className="mt-6">
                  <Link
                    to={`/forms/${form?.id}`}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Form
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary View */}
                {viewMode === "summary" && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium text-gray-900">
                      Response Summary ({getSortedResponses().length})
                    </h4>

                    <div className="grid grid-cols-1 gap-6">
                      {getSortedResponses().map((response, index) => (
                        <div
                          key={response.id}
                          className="p-6 transition-shadow border border-gray-200 rounded-lg hover:shadow-md"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h5 className="font-medium text-gray-900">
                                Submission #{responses.length - index}
                              </h5>
                              <div className="mt-1 text-sm text-gray-500">
                                <p className="flex items-center">
                                  <UserIcon className="w-4 h-4 mr-1" />
                                  {response.users?.email || "Anonymous"}
                                </p>
                                <p className="flex items-center mt-1">
                                  <CalendarIcon className="w-4 h-4 mr-1" />
                                  {new Date(
                                    response.created_at
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() =>
                                toggleResponseExpansion(response.id)
                              }
                              className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                            >
                              {expandedResponses.has(response.id) ? (
                                <>
                                  <span>Hide Details</span>
                                  <ChevronUpIcon className="w-4 h-4 ml-1" />
                                </>
                              ) : (
                                <>
                                  <span>View Details</span>
                                  <ChevronDownIcon className="w-4 h-4 ml-1" />
                                </>
                              )}
                            </button>
                          </div>

                          {expandedResponses.has(response.id) ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              {form?.form_fields
                                ?.sort((a, b) => a.field_order - b.field_order)
                                .map((field) => {
                                  const value = getFieldValue(
                                    response,
                                    field.id
                                  );
                                  const contributors = getFieldContributorsList(
                                    field.id
                                  );

                                  return (
                                    <div
                                      key={field.id}
                                      className="p-3 border border-gray-100 rounded"
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700">
                                          {field.label}
                                          {field.required && (
                                            <span className="ml-1 text-red-500">
                                              *
                                            </span>
                                          )}
                                        </span>
                                        {contributors.length > 0 && (
                                          <span className="text-xs text-gray-500">
                                            {contributors.length} contributor(s)
                                          </span>
                                        )}
                                      </div>

                                      <div className="mb-2 text-sm text-gray-900">
                                        {formatFieldValue(field, value)}
                                      </div>

                                      {contributors.length > 0 && (
                                        <div className="text-xs text-gray-500">
                                          Contributors:{" "}
                                          {contributors
                                            .slice(0, 2)
                                            .map((c) => c.email)
                                            .join(", ")}
                                          {contributors.length > 2 &&
                                            ` +${contributors.length - 2} more`}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-600">
                              <p>
                                Answered {response.response_fields.length} of{" "}
                                {form?.form_fields?.length || 0} questions
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detailed View */}
                {viewMode === "detailed" && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium text-gray-900">
                      Detailed Response Analysis
                    </h4>

                    {getSortedResponses().map((response, index) => (
                      <div
                        key={response.id}
                        className="border border-gray-200 rounded-lg"
                      >
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-gray-900">
                              Submission #{responses.length - index} -{" "}
                              {response.users?.email || "Anonymous"}
                            </h5>
                            <div className="text-sm text-gray-500">
                              {new Date(response.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="p-6">
                          <div className="space-y-4">
                            {form?.form_fields
                              ?.sort((a, b) => a.field_order - b.field_order)
                              .map((field) => {
                                const value = getFieldValue(response, field.id);
                                const contributors = getFieldContributorsList(
                                  field.id
                                );

                                return (
                                  <div
                                    key={field.id}
                                    className="p-4 border border-gray-100 rounded-lg"
                                  >
                                    <div className="flex items-start justify-between mb-3">
                                      <div>
                                        <h6 className="font-medium text-gray-900">
                                          {field.label}
                                          {field.required && (
                                            <span className="ml-1 text-red-500">
                                              *
                                            </span>
                                          )}
                                        </h6>
                                        <span className="inline-block px-2 py-1 mt-1 text-xs text-gray-500 bg-gray-100 rounded">
                                          {field.type}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="mb-3">
                                      <span className="text-sm font-medium text-gray-700">
                                        Response:
                                      </span>
                                      <div className="p-3 mt-1 text-gray-900 rounded bg-blue-50">
                                        {formatFieldValue(field, value)}
                                      </div>
                                    </div>

                                    {contributors.length > 0 && (
                                      <div>
                                        <span className="text-sm font-medium text-gray-700">
                                          Contributors:
                                        </span>
                                        <div className="mt-1 space-y-1">
                                          {contributors.map(
                                            (contributor, i) => (
                                              <div
                                                key={i}
                                                className="flex items-center justify-between p-2 text-sm rounded bg-gray-50"
                                              >
                                                <span className="text-gray-600">
                                                  {contributor.email}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                  {new Date(
                                                    contributor.last_edited
                                                  ).toLocaleString()}
                                                </span>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Table View */}
                {viewMode === "table" && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900">
                      Tabular View
                    </h4>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                              #
                            </th>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                              Submitted By
                            </th>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                              Submitted At
                            </th>
                            {form?.form_fields
                              ?.sort((a, b) => a.field_order - b.field_order)
                              .map((field) => (
                                <th
                                  key={field.id}
                                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                                >
                                  {field.label}
                                  {field.required && (
                                    <span className="ml-1 text-red-500">*</span>
                                  )}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getSortedResponses().map((response, index) => (
                            <tr
                              key={response.id}
                              className={
                                index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                                {responses.length - index}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                                {response.users?.email || "Anonymous"}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                {new Date(response.created_at).toLocaleString()}
                              </td>
                              {form?.form_fields
                                ?.sort((a, b) => a.field_order - b.field_order)
                                .map((field) => (
                                  <td
                                    key={field.id}
                                    className="max-w-xs px-6 py-4 text-sm text-gray-900"
                                  >
                                    <div
                                      className="truncate"
                                      title={formatFieldValue(
                                        field,
                                        getFieldValue(response, field.id)
                                      )}
                                    >
                                      {formatFieldValue(
                                        field,
                                        getFieldValue(response, field.id)
                                      )}
                                    </div>
                                  </td>
                                ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FormResponses;
