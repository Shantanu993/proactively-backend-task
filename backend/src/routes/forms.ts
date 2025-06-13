// src/routes/forms.ts
import { Router } from "express";
import {
  createForm,
  getForms,
  getFormByShareCode,
  updateFormField,
  submitForm,
  deleteForm,
  getFormResponses,
  createSharingCode, // Add this
} from "../controllers/formController";
import { requireAdmin } from "../middleware/auth";

const router = Router();

router.post("/", requireAdmin, createForm);
router.get("/", getForms);
router.get("/share/:shareCode", getFormByShareCode);
router.put("/share/:shareCode/fields/:fieldId", updateFormField);
router.post("/share/:shareCode/submit", submitForm);
router.delete("/:formId", requireAdmin, deleteForm);
router.get("/:formId/responses", requireAdmin, getFormResponses);

// Add new route for creating additional sharing codes
router.post("/:formId/sharing-codes", requireAdmin, createSharingCode);

export default router;
