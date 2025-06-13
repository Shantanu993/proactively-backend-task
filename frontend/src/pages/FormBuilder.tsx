// src/pages/FormBuilder.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

interface FormField {
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
}

const FormBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fieldTypes = [
    { value: "TEXT", label: "Text Input" },
    { value: "NUMBER", label: "Number Input" },
    { value: "EMAIL", label: "Email Input" },
    { value: "TEXTAREA", label: "Text Area" },
    { value: "DROPDOWN", label: "Dropdown" },
    { value: "RADIO", label: "Radio Buttons" },
    { value: "CHECKBOX", label: "Checkboxes" },
  ];

  const addField = () => {
    const newField: FormField = {
      id: Date.now().toString(),
      label: "",
      type: "TEXT",
      required: false,
      options: [],
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(
      fields.map((field) =>
        field.id === id ? { ...field, ...updates } : field
      )
    );
  };

  const removeField = (id: string) => {
    setFields(fields.filter((field) => field.id !== id));
  };

  const moveField = (id: string, direction: "up" | "down") => {
    const index = fields.findIndex((field) => field.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === fields.length - 1)
    ) {
      return;
    }

    const newFields = [...fields];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [
      newFields[targetIndex],
      newFields[index],
    ];
    setFields(newFields);
  };

  const addOption = (fieldId: string) => {
    updateField(fieldId, {
      options: [...(fields.find((f) => f.id === fieldId)?.options || []), ""],
    });
  };

  const updateOption = (
    fieldId: string,
    optionIndex: number,
    value: string
  ) => {
    const field = fields.find((f) => f.id === fieldId);
    if (field) {
      const newOptions = [...field.options];
      newOptions[optionIndex] = value;
      updateField(fieldId, { options: newOptions });
    }
  };

  const removeOption = (fieldId: string, optionIndex: number) => {
    const field = fields.find((f) => f.id === fieldId);
    if (field) {
      const newOptions = field.options.filter(
        (_, index) => index !== optionIndex
      );
      updateField(fieldId, { options: newOptions });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError("Form title is required");
      return;
    }

    if (fields.length === 0) {
      setError("At least one field is required");
      return;
    }

    // Validate fields
    for (const field of fields) {
      if (!field.label.trim()) {
        setError("All fields must have a label");
        return;
      }

      if (
        ["DROPDOWN", "RADIO", "CHECKBOX"].includes(field.type) &&
        field.options.length === 0
      ) {
        setError(`Field "${field.label}" must have at least one option`);
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${
          process.env.REACT_APP_BACKEND_URL || "http://localhost:5000"
        }/api/forms`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            fields: fields.map((field) => ({
              label: field.label,
              type: field.type,
              required: field.required,
              options: field.options.filter((option) => option.trim() !== ""),
            })),
          }),
        }
      );

      if (response.ok) {
        navigate("/");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create form");
      }
    } catch (error) {
      setError("Failed to create form");
      console.error("Create form error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/")}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back to Dashboard
              </button>
              <div className="flex items-center space-x-2">
                <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">
                  Form Builder
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl px-4 py-6 mx-auto sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form Details */}
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">
              Form Details
            </h2>

            {error && (
              <div className="px-4 py-3 mb-4 text-red-700 border border-red-200 rounded bg-red-50">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700"
                >
                  Form Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter form title"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter form description"
                />
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Form Fields</h2>
              <button
                type="button"
                onClick={addField}
                className="inline-flex items-center px-3 py-2 text-sm font-medium leading-4 text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Field
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="py-12 text-center border-2 border-gray-300 border-dashed rounded-lg">
                <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No fields
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first field.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={addField}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Field
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-900">
                        Field {index + 1}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => moveField(field.id, "up")}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          <ArrowUpIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveField(field.id, "down")}
                          disabled={index === fields.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          <ArrowDownIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeField(field.id)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Field Label *
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) =>
                            updateField(field.id, { label: e.target.value })
                          }
                          className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="Enter field label"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Field Type
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) =>
                            updateField(field.id, {
                              type: e.target.value as FormField["type"],
                              options: [
                                "DROPDOWN",
                                "RADIO",
                                "CHECKBOX",
                              ].includes(e.target.value)
                                ? [""]
                                : [],
                            })
                          }
                          className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          {fieldTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            updateField(field.id, {
                              required: e.target.checked,
                            })
                          }
                          className="text-blue-600 border-gray-300 rounded shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Required field
                        </span>
                      </label>
                    </div>

                    {/* Options for dropdown, radio, and checkbox fields */}
                    {["DROPDOWN", "RADIO", "CHECKBOX"].includes(field.type) && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Options
                          </label>
                          <button
                            type="button"
                            onClick={() => addOption(field.id)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            + Add Option
                          </button>
                        </div>
                        <div className="space-y-2">
                          {field.options.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="text"
                                value={option}
                                onChange={(e) =>
                                  updateOption(
                                    field.id,
                                    optionIndex,
                                    e.target.value
                                  )
                                }
                                className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder={`Option ${optionIndex + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  removeOption(field.id, optionIndex)
                                }
                                className="p-2 text-red-400 hover:text-red-600"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 border-b-2 border-white rounded-full animate-spin"></div>
                  Creating...
                </div>
              ) : (
                "Create Form"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default FormBuilder;
