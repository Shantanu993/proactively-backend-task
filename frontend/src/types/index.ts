// src/types/index.ts
export interface User {
  id: string;
  email: string;
  role: "ADMIN" | "USER";
}

export interface FormField {
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
  order: number;
}

export interface Form {
  id: string;
  title: string;
  description?: string;
  shareCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  fields: FormField[];
  responses: FormResponse[];
  _count?: {
    responses: number;
  };
}

export interface FormResponse {
  id: string;
  formId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  fields: ResponseField[];
}

export interface ResponseField {
  id: string;
  fieldId: string;
  responseId: string;
  value: string;
}

export interface FieldLock {
  id: string;
  userId: string;
  formId: string;
  fieldId: string;
  createdAt: string;
  expiresAt: string;
}
