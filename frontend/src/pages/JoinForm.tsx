// src/pages/JoinForm.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

const JoinForm: React.FC = () => {
  const [shareCode, setShareCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shareCode.trim()) {
      setError("Please enter a form code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Validate form exists
      const response = await fetch(
        `${
          import.meta.env.VITE_BACKEND_URL
        }/api/forms/share/${shareCode.trim()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.ok) {
        navigate(`/forms/${shareCode.trim()}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Form not found");
      }
    } catch (error) {
      setError("Failed to join form. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByUrl = () => {
    const url = prompt("Enter the form URL:");
    if (url) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split("/");
        const codeFromUrl = pathParts[pathParts.length - 1];

        if (codeFromUrl) {
          setShareCode(codeFromUrl);
        } else {
          setError("Invalid form URL");
        }
      } catch (error) {
        setError("Invalid URL format");
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-gray-50 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full">
            <DocumentTextIcon className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900">
            Join a Collaborative Form
          </h2>
          <p className="mt-2 text-sm text-center text-gray-600">
            Enter a form code or paste a form URL to start collaborating
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleJoinByCode}>
          {error && (
            <div className="p-4 rounded-md bg-red-50">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div>
            <label
              htmlFor="shareCode"
              className="block text-sm font-medium text-gray-700"
            >
              Form Code
            </label>
            <input
              id="shareCode"
              name="shareCode"
              type="text"
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value.toUpperCase())}
              className="relative block w-full px-3 py-2 mt-1 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Enter form code (e.g., ABC123)"
              maxLength={8}
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="relative flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md group hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Joining..." : "Join Form"}
            </button>

            <button
              type="button"
              onClick={handleJoinByUrl}
              className="relative flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md group hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Paste URL
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Back to Dashboard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinForm;
