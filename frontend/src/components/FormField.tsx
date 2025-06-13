// src/components/FormField.tsx
import React from "react";
import { LockClosedIcon, UserIcon } from "@heroicons/react/24/outline";

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

interface FormFieldProps {
  field: FormFieldType;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  isLocked: boolean;
  lockedBy?: string;
  currentUser: string;
  typingUser?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  field,
  value,
  onChange,
  onFocus,
  onBlur,
  isLocked,
  lockedBy,
  currentUser,
  typingUser,
}) => {
  const isLockedByOther = isLocked && lockedBy !== currentUser;
  const isLockedByMe = isLocked && lockedBy === currentUser;
  const isTyping = typingUser && typingUser !== currentUser;

  // Allow typing if not locked by others or if locked by current user
  const canEdit = !isLockedByOther || isLockedByMe;

  const baseInputClasses = `
    w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
    ${!canEdit ? "bg-gray-100 cursor-not-allowed" : "bg-white"}
    ${isLockedByMe ? "ring-2 ring-blue-500 border-blue-500" : "border-gray-300"}
    ${isTyping ? "ring-2 ring-yellow-400 border-yellow-400" : ""}
  `;

  const renderInput = () => {
    switch (field.type) {
      case "TEXT":
      case "EMAIL":
        return (
          <input
            type={field.type.toLowerCase()}
            value={value}
            onChange={(e) => canEdit && onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            disabled={!canEdit}
            className={baseInputClasses}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );

      case "NUMBER":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => canEdit && onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            disabled={!canEdit}
            className={baseInputClasses}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );

      case "TEXTAREA":
        return (
          <textarea
            value={value}
            onChange={(e) => canEdit && onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            disabled={!canEdit}
            rows={4}
            className={baseInputClasses}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );

      case "DROPDOWN":
        return (
          <select
            value={value}
            onChange={(e) => canEdit && onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            disabled={!canEdit}
            className={baseInputClasses}
          >
            <option value="">Select an option</option>
            {field.options.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "RADIO":
        return (
          <div className="space-y-2">
            {field.options.map((option, index) => (
              <label key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => canEdit && onChange(e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  disabled={!canEdit}
                  className="text-blue-600"
                />
                <span className={!canEdit ? "text-gray-400" : "text-gray-700"}>
                  {option}
                </span>
              </label>
            ))}
          </div>
        );

      case "CHECKBOX":
        return (
          <div className="space-y-2">
            {field.options.map((option, index) => {
              const selectedOptions = value ? value.split(",") : [];
              const isChecked = selectedOptions.includes(option);

              return (
                <label key={index} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (!canEdit) return;

                      let newValue;
                      if (e.target.checked) {
                        newValue = [...selectedOptions, option].join(",");
                      } else {
                        newValue = selectedOptions
                          .filter((o) => o !== option)
                          .join(",");
                      }
                      onChange(newValue);
                    }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    disabled={!canEdit}
                    className="text-blue-600"
                  />
                  <span
                    className={!canEdit ? "text-gray-400" : "text-gray-700"}
                  >
                    {option}
                  </span>
                </label>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="ml-1 text-red-500">*</span>}
        </label>

        <div className="flex items-center space-x-2">
          {isTyping && (
            <div className="flex items-center space-x-1 text-xs text-yellow-600">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-yellow-600 rounded-full animate-bounce"></div>
                <div
                  className="w-1 h-1 bg-yellow-600 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-1 h-1 bg-yellow-600 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
              <span>{typingUser} is typing...</span>
            </div>
          )}

          {isLocked && !isTyping && (
            <div className="flex items-center space-x-1 text-xs">
              <LockClosedIcon className="w-4 h-4" />
              <UserIcon className="w-4 h-4" />
              <span
                className={isLockedByMe ? "text-blue-600" : "text-gray-500"}
              >
                {isLockedByMe ? "You" : lockedBy}
              </span>
            </div>
          )}
        </div>
      </div>

      {renderInput()}

      {isLockedByOther && !isTyping && (
        <p className="text-xs text-gray-500">
          This field is currently being edited by {lockedBy}
        </p>
      )}

      {isTyping && (
        <p className="text-xs text-yellow-600">
          {typingUser} is typing in this field...
        </p>
      )}
    </div>
  );
};

export default FormField;
