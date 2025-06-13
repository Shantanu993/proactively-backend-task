// src/controllers/formController.ts
import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { supabase } from "../config/supabase";
import { generateShareCode } from "../utils/helpers";
export const createForm = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, fields, initialGroupName } = req.body;

    // Create the form first
    const { data: form, error: formError } = await supabase
      .from("forms")
      .insert({
        title,
        description,
        created_by_id: req.user!.id,
      })
      .select()
      .single();

    if (formError || !form) {
      return res.status(500).json({ error: "Failed to create form" });
    }

    // Create form fields
    const formFields = fields.map((field: any, index: number) => ({
      form_id: form.id,
      label: field.label,
      type: field.type,
      required: field.required || false,
      options: field.options || [],
      field_order: index,
    }));

    const { data: createdFields, error: fieldsError } = await supabase
      .from("form_fields")
      .insert(formFields)
      .select();

    if (fieldsError) {
      return res.status(500).json({ error: "Failed to create form fields" });
    }

    // Create initial sharing code
    const initialShareCode = generateShareCode();
    const { data: sharingCode, error: sharingError } = await supabase
      .from("form_sharing_codes")
      .insert({
        form_id: form.id,
        share_code: initialShareCode,
        group_name: initialGroupName || "Default Group",
        created_by_id: req.user!.id,
      })
      .select()
      .single();

    if (sharingError) {
      return res.status(500).json({ error: "Failed to create sharing code" });
    }

    res.status(201).json({
      ...form,
      fields: createdFields,
      sharing_codes: [sharingCode],
      initial_share_code: initialShareCode,
    });
  } catch (error) {
    console.error("Create form error:", error);
    res.status(500).json({ error: "Failed to create form" });
  }
};

// Add new endpoint to create additional sharing codes
export const createSharingCode = async (req: AuthRequest, res: Response) => {
  try {
    const { formId } = req.params;
    const { groupName } = req.body;

    // Verify user owns the form
    const { data: form, error: formError } = await supabase
      .from("forms")
      .select("id, title")
      .eq("id", formId)
      .eq("created_by_id", req.user!.id)
      .single();

    if (formError || !form) {
      return res.status(404).json({ error: "Form not found or access denied" });
    }

    // Generate unique share code
    let shareCode = generateShareCode();
    let attempts = 0;

    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("form_sharing_codes")
        .select("id")
        .eq("share_code", shareCode)
        .single();

      if (!existing) break;

      shareCode = generateShareCode();
      attempts++;
    }

    if (attempts >= 5) {
      return res
        .status(500)
        .json({ error: "Failed to generate unique share code" });
    }

    // Create new sharing code
    const { data: newSharingCode, error: createError } = await supabase
      .from("form_sharing_codes")
      .insert({
        form_id: formId,
        share_code: shareCode,
        group_name: groupName || `Group ${shareCode}`,
        created_by_id: req.user!.id,
      })
      .select()
      .single();

    if (createError) {
      return res.status(500).json({ error: "Failed to create sharing code" });
    }

    res.status(201).json(newSharingCode);
  } catch (error) {
    console.error("Create sharing code error:", error);
    res.status(500).json({ error: "Failed to create sharing code" });
  }
};

// Update getForms to include sharing codes
export const getForms = async (req: AuthRequest, res: Response) => {
  try {
    const { data: forms, error: formsError } = await supabase
      .from("forms")
      .select(
        `
        *,
        form_fields(*),
        form_sharing_codes(*)
      `
      )
      .eq("created_by_id", req.user!.id)
      .order("created_at", { ascending: false });

    if (formsError) {
      return res.status(500).json({ error: "Failed to fetch forms" });
    }

    // Get response counts for each sharing code
    const formsWithCounts = await Promise.all(
      (forms || []).map(async (form) => {
        const sharingCodeCounts = await Promise.all(
          form.form_sharing_codes.map(async (sharingCode: any) => {
            const { count } = await supabase
              .from("form_responses")
              .select("*", { count: "exact", head: true })
              .eq("sharing_code_id", sharingCode.id);

            return {
              ...sharingCode,
              response_count: count || 0,
            };
          })
        );

        return {
          ...form,
          form_sharing_codes: sharingCodeCounts,
          total_responses: sharingCodeCounts.reduce(
            (sum, sc) => sum + sc.response_count,
            0
          ),
        };
      })
    );

    res.json(formsWithCounts);
  } catch (error) {
    console.error("Get forms error:", error);
    res.status(500).json({ error: "Failed to fetch forms" });
  }
};

// Update getFormByShareCode to work with new structure
export const getFormByShareCode = async (req: AuthRequest, res: Response) => {
  try {
    const { shareCode } = req.params;

    // Get sharing code details
    const { data: sharingCodeData, error: sharingError } = await supabase
      .from("form_sharing_codes")
      .select(
        `
        *,
        forms(
          *,
          form_fields(*)
        )
      `
      )
      .eq("share_code", shareCode)
      .eq("is_active", true)
      .single();

    if (sharingError || !sharingCodeData) {
      return res.status(404).json({ error: "Share code not found" });
    }

    // Get responses for this specific sharing code
    const { data: responses, error: responsesError } = await supabase
      .from("form_responses")
      .select(
        `
        *,
        response_fields(*)
      `
      )
      .eq("sharing_code_id", sharingCodeData.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const form = {
      ...sharingCodeData.forms,
      sharing_code_info: {
        id: sharingCodeData.id,
        share_code: sharingCodeData.share_code,
        group_name: sharingCodeData.group_name,
      },
      form_responses: responses || [],
    };

    res.json(form);
  } catch (error) {
    console.error("Get form error:", error);
    res.status(500).json({ error: "Failed to fetch form" });
  }
};

export const updateFormField = async (req: AuthRequest, res: Response) => {
  try {
    const { shareCode, fieldId } = req.params;
    const { value } = req.body;

    // Get form
    const { data: form, error: formError } = await supabase
      .from("forms")
      .select("id")
      .eq("share_code", shareCode)
      .eq("is_active", true)
      .single();

    if (formError || !form) {
      return res.status(404).json({ error: "Form not found" });
    }

    // Get or create form response
    let { data: response, error: responseError } = await supabase
      .from("form_responses")
      .select("id")
      .eq("form_id", form.id)
      .single();

    if (responseError && responseError.code === "PGRST116") {
      // No response exists, create one
      const { data: newResponse, error: createError } = await supabase
        .from("form_responses")
        .insert({
          form_id: form.id,
          user_id: req.user!.id,
        })
        .select()
        .single();

      if (createError) {
        return res.status(500).json({ error: "Failed to create response" });
      }
      response = newResponse;
    } else if (responseError) {
      return res.status(500).json({ error: "Failed to get response" });
    }

    // Update or create response field
    const { data: responseField, error: fieldError } = await supabase
      .from("response_fields")
      .upsert({
        response_id: response!.id,
        field_id: fieldId,
        value,
      })
      .select()
      .single();

    if (fieldError) {
      console.error("Update field error:", fieldError);
      return res.status(500).json({ error: "Failed to update field" });
    }

    res.json(responseField);
  } catch (error) {
    console.error("Update field error:", error);
    res.status(500).json({ error: "Failed to update field" });
  }
};

// Update submitForm to work with sharing codes
export const submitForm = async (req: AuthRequest, res: Response) => {
  try {
    const { shareCode } = req.params;
    const { formData } = req.body;

    // Get sharing code details
    const { data: sharingCodeData, error: sharingError } = await supabase
      .from("form_sharing_codes")
      .select(
        `
        *,
        forms(id, title)
      `
      )
      .eq("share_code", shareCode)
      .eq("is_active", true)
      .single();

    if (sharingError || !sharingCodeData) {
      return res.status(404).json({ error: "Share code not found" });
    }

    // Create new response for this sharing code
    const { data: newResponse, error: createError } = await supabase
      .from("form_responses")
      .insert({
        form_id: sharingCodeData.forms.id,
        sharing_code_id: sharingCodeData.id,
        user_id: req.user!.id,
      })
      .select()
      .single();

    if (createError) {
      return res.status(500).json({
        error: "Failed to create response",
        details: createError.message,
      });
    }

    // Insert response fields
    const responseFields = Object.entries(formData)
      .filter(
        ([fieldId, value]) =>
          value !== null && value !== undefined && String(value).trim() !== ""
      )
      .map(([fieldId, value]) => ({
        response_id: newResponse.id,
        field_id: fieldId,
        value: String(value).trim(),
      }));

    if (responseFields.length > 0) {
      const { error: insertError } = await supabase
        .from("response_fields")
        .insert(responseFields);

      if (insertError) {
        await supabase.from("form_responses").delete().eq("id", newResponse.id);
        return res.status(500).json({
          error: "Failed to submit form fields",
          details: insertError.message,
        });
      }
    }

    res.json({
      message: "Form submitted successfully",
      response_id: newResponse.id,
      form_title: sharingCodeData.forms.title,
      group_name: sharingCodeData.group_name,
      submitted_at: new Date().toISOString(),
      fields_submitted: responseFields.length,
    });
  } catch (error) {
    console.error("Submit form error:", error);
    res.status(500).json({
      error: "Failed to submit form",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteForm = async (req: AuthRequest, res: Response) => {
  try {
    const { formId } = req.params;

    // Check if user owns the form
    const { data: form, error: formError } = await supabase
      .from("forms")
      .select("id, created_by_id")
      .eq("id", formId)
      .eq("created_by_id", req.user!.id)
      .single();

    if (formError || !form) {
      return res.status(404).json({ error: "Form not found or access denied" });
    }

    // Delete the form (cascade will handle related data)
    const { error: deleteError } = await supabase
      .from("forms")
      .delete()
      .eq("id", formId)
      .eq("created_by_id", req.user!.id);

    if (deleteError) {
      console.error("Delete form error:", deleteError);
      return res.status(500).json({ error: "Failed to delete form" });
    }

    res.json({ message: "Form deleted successfully" });
  } catch (error) {
    console.error("Delete form error:", error);
    res.status(500).json({ error: "Failed to delete form" });
  }
};
export const getFormResponses = async (req: AuthRequest, res: Response) => {
  try {
    const { formId } = req.params;

    // Check if user owns the form
    const { data: form, error: formError } = await supabase
      .from("forms")
      .select(
        `
        id, 
        title, 
        description, 
        created_by_id,
        form_fields(*)
      `
      )
      .eq("id", formId)
      .eq("created_by_id", req.user!.id)
      .single();

    if (formError || !form) {
      return res.status(404).json({ error: "Form not found or access denied" });
    }

    // Get all form responses (multiple submissions)
    const { data: responses, error: responsesError } = await supabase
      .from("form_responses")
      .select(
        `
        *,
        response_fields(*),
        users(email)
      `
      )
      .eq("form_id", formId)
      .order("created_at", { ascending: false });

    if (responsesError) {
      console.error("Get responses error:", responsesError);
      return res.status(500).json({ error: "Failed to fetch responses" });
    }

    // Get field contributions for each field
    const { data: contributions, error: contributionsError } = await supabase
      .from("field_contributions")
      .select(
        `
        field_id,
        user_id,
        value,
        created_at,
        users(email)
      `
      )
      .eq("form_id", formId)
      .order("created_at", { ascending: false });

    // Group contributions by field
    const fieldContributors: Record<
      string,
      Array<{
        email: string;
        value: string;
        last_edited: string;
      }>
    > = {};

    if (contributions) {
      contributions.forEach((contribution: any) => {
        if (!fieldContributors[contribution.field_id]) {
          fieldContributors[contribution.field_id] = [];
        }

        fieldContributors[contribution.field_id].push({
          email: contribution.users?.email || "Unknown",
          value: contribution.value,
          last_edited: contribution.created_at,
        });
      });
    }

    res.json({
      form: form,
      responses: responses || [],
      fieldContributors: fieldContributors,
      submissionCount: responses?.length || 0,
    });
  } catch (error) {
    console.error("Get form responses error:", error);
    res.status(500).json({ error: "Failed to fetch form responses" });
  }
};

export const trackFieldContribution = async (
  formId: string,
  fieldId: string,
  userId: string,
  value: string
) => {
  try {
    const { error } = await supabase.from("field_contributions").upsert(
      {
        form_id: formId,
        field_id: fieldId,
        user_id: userId,
        value: value.trim(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "form_id,field_id,user_id",
      }
    );

    if (error) {
      console.error("Failed to track field contribution:", error);
    }
  } catch (error) {
    console.error("Error tracking contribution:", error);
  }
};
