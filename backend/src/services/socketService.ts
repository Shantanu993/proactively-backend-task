// src/services/socketService.ts
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { supabase, supabaseAnon } from "../config/supabase";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

interface SupabasePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new?: Record<string, any>;
  old?: Record<string, any>;
  errors?: any;
}

interface ResponseFieldPayload {
  field_id: string;
  value: string;
  response_id: string;
}
const cleanupExpiredLocks = async (io: Server) => {
  try {
    // Get expired locks first
    const { data: expiredLocks, error: selectError } = await supabase
      .from("field_locks")
      .select("field_id, sharing_code_id")
      .lt("expires_at", new Date().toISOString());

    if (selectError) {
      console.error("Error selecting expired locks:", selectError);
      return;
    }

    if (expiredLocks && expiredLocks.length > 0) {
      console.log(`Found ${expiredLocks.length} expired locks to clean up`);

      // Get sharing codes for these locks
      const sharingCodeIds = [
        ...new Set(expiredLocks.map((lock) => lock.sharing_code_id)),
      ];

      const { data: sharingCodes, error: sharingError } = await supabase
        .from("form_sharing_codes")
        .select("id, share_code")
        .in("id", sharingCodeIds);

      if (!sharingError && sharingCodes) {
        const sharingCodeMap = new Map(
          sharingCodes.map((sc) => [sc.id, sc.share_code])
        );

        // Notify about unlocked fields
        expiredLocks.forEach((lock: any) => {
          const shareCode = sharingCodeMap.get(lock.sharing_code_id);
          if (shareCode) {
            io.to(shareCode).emit("field-unlocked", {
              fieldId: lock.field_id,
            });
            console.log(
              `Notified room ${shareCode} about unlocked field ${lock.field_id}`
            );
          }
        });
      }

      // Delete expired locks
      const { error: deleteError } = await supabase
        .from("field_locks")
        .delete()
        .lt("expires_at", new Date().toISOString());

      if (deleteError) {
        console.error("Error deleting expired locks:", deleteError);
      } else {
        console.log(`✅ Cleaned up ${expiredLocks.length} expired locks`);
      }
    }
  } catch (error) {
    console.error("Failed to clean up expired locks:", error);
  }
};
// Helper function to validate field value based on field type
const validateFieldValue = (fieldType: string, value: string): boolean => {
  if (!value || value.trim() === "") return true; // Empty values are allowed

  switch (fieldType) {
    case "EMAIL":
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    case "NUMBER":
      return !isNaN(Number(value));
    case "TEXT":
    case "TEXTAREA":
    case "DROPDOWN":
    case "RADIO":
    case "CHECKBOX":
      return true; // These types accept any string value
    default:
      return true;
  }
};

// Helper function to get active users in a room
const getActiveUsersInRoom = (io: Server, roomName: string): string[] => {
  const room = io.sockets.adapter.rooms.get(roomName);
  const activeUsers: string[] = [];

  if (room) {
    for (const socketId of room) {
      const userSocket = io.sockets.sockets.get(
        socketId
      ) as AuthenticatedSocket;
      if (userSocket?.userEmail) {
        activeUsers.push(userSocket.userEmail);
      }
    }
  }

  return activeUsers;
};

export const setupSocketHandlers = (io: Server) => {
  // Authentication middleware for socket connections
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const { data: user, error } = await supabase
        .from("users")
        .select("id, email, role")
        .eq("id", decoded.userId)
        .single();

      if (error || !user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.userId = user.id;
      socket.userEmail = user.email;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(`✅ User ${socket.userEmail} connected (${socket.id})`);

    socket.on("join-form", async (shareCode: string) => {
      try {
        console.log(`📝 User ${socket.userEmail} joining group ${shareCode}`);

        // Get sharing code details
        const { data: sharingCodeData, error } = await supabase
          .from("form_sharing_codes")
          .select(
            `
            *,
            forms(id, title, is_active)
          `
          )
          .eq("share_code", shareCode)
          .eq("is_active", true)
          .single();

        if (error || !sharingCodeData || !sharingCodeData.forms.is_active) {
          socket.emit("error", "Share code not found or form inactive");
          return;
        }

        // Join the specific group room
        socket.join(shareCode);

        // Get current users in this specific group
        const currentUsers = getActiveUsersInRoom(io, shareCode);

        // Notify others in this group about new user
        socket.to(shareCode).emit("user-joined", {
          userId: socket.userId,
          email: socket.userEmail,
          groupCode: shareCode,
          groupName: sharingCodeData.group_name,
        });

        // Send current active users to everyone in this group
        io.to(shareCode).emit("active-users", currentUsers);

        // Send group information to the new user
        socket.emit("group-info", {
          shareCode,
          groupName: sharingCodeData.group_name,
          formTitle: sharingCodeData.forms[0]?.title,
          activeUsers: currentUsers.length,
        });

        // Send current field locks for this sharing code
        const { data: existingLocks } = await supabase
          .from("field_locks")
          .select(
            `
            field_id, 
            user_id, 
            expires_at,
            users(email)
          `
          )
          .eq("sharing_code_id", sharingCodeData.id)
          .gt("expires_at", new Date().toISOString());

        if (existingLocks && existingLocks.length > 0) {
          const lockData: Record<string, string> = {};
          existingLocks.forEach((lock: any) => {
            lockData[lock.field_id] = lock.users?.email || "Unknown user";
          });
          socket.emit("current-locks", lockData);
        }

        // Load current form data for this sharing code
        const { data: response } = await supabase
          .from("form_responses")
          .select(
            `
            *,
            response_fields(*)
          `
          )
          .eq("sharing_code_id", sharingCodeData.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (response?.response_fields) {
          const currentData: Record<string, string> = {};
          response.response_fields.forEach((field: any) => {
            currentData[field.field_id] = field.value;
          });
          socket.emit("form-data-sync", currentData);
        }
      } catch (error) {
        console.error("Join form error:", error);
        socket.emit("error", "Failed to join group");
      }
    });
    // Enhanced field locking with immediate feedback
    socket.on(
      "lock-field",
      async (data: { shareCode: string; fieldId: string }) => {
        try {
          const { shareCode, fieldId } = data;
          console.log(
            `🔒 Lock request: ${socket.userEmail} wants to lock field ${fieldId}`
          );

          // Get form details
          const { data: form } = await supabase
            .from("forms")
            .select("id, title")
            .eq("share_code", shareCode)
            .eq("is_active", true)
            .single();

          if (!form) {
            socket.emit("error", "Form not found");
            return;
          }

          // Check if field is already locked by someone else
          const { data: existingLock } = await supabase
            .from("field_locks")
            .select(
              `
            user_id, 
            expires_at,
            users(email)
          `
            )
            .eq("form_id", form.id)
            .eq("field_id", fieldId)
            .gt("expires_at", new Date().toISOString())
            .single();

          if (existingLock && existingLock.user_id !== socket.userId) {
            console.log(
              `❌ Lock failed: Field ${fieldId} already locked by ${
                Array.isArray(existingLock.users) &&
                existingLock.users.length > 0
                  ? existingLock.users[0].email
                  : "Another user"
              }`
            );
            socket.emit("lock-failed", {
              fieldId,
              reason: "Field already locked",
              lockedBy:
                Array.isArray(existingLock.users) &&
                existingLock.users.length > 0
                  ? existingLock.users[0].email
                  : "Another user",
            });
            return;
          }

          // Create or update lock
          const expiresAt = new Date(Date.now() + 60000).toISOString(); // 1 minute
          const { error } = await supabase.from("field_locks").upsert(
            {
              user_id: socket.userId!,
              form_id: form.id,
              field_id: fieldId,
              expires_at: expiresAt,
            },
            {
              onConflict: "form_id,field_id",
            }
          );

          if (error) {
            console.error("Lock creation error:", error);
            socket.emit("error", "Failed to lock field");
            return;
          }

          console.log(`✅ Field ${fieldId} locked by ${socket.userEmail}`);

          // Notify room about field lock (including the user who locked it)
          io.to(shareCode).emit("field-locked", {
            fieldId,
            userId: socket.userId,
            userEmail: socket.userEmail,
          });
        } catch (error) {
          console.error("Lock field error:", error);
          socket.emit("error", "Failed to lock field");
        }
      }
    );

    // Enhanced field unlock
    socket.on(
      "unlock-field",
      async (data: { shareCode: string; fieldId: string }) => {
        try {
          const { shareCode, fieldId } = data;
          console.log(
            `🔓 Unlock request: ${socket.userEmail} unlocking field ${fieldId}`
          );

          // Get form details
          const { data: form } = await supabase
            .from("forms")
            .select("id")
            .eq("share_code", shareCode)
            .single();

          if (!form) return;

          const { error } = await supabase
            .from("field_locks")
            .delete()
            .eq("form_id", form.id)
            .eq("field_id", fieldId)
            .eq("user_id", socket.userId!);

          if (!error) {
            console.log(`✅ Field ${fieldId} unlocked by ${socket.userEmail}`);
            io.to(shareCode).emit("field-unlocked", { fieldId });
          }
        } catch (error) {
          console.error("Unlock field error:", error);
          socket.emit("error", "Failed to unlock field");
        }
      }
    );

    // Real-time field updates with comprehensive handling
    socket.on(
      "field-update",
      async (data: { shareCode: string; fieldId: string; value: string }) => {
        try {
          const { shareCode, fieldId, value } = data;
          console.log(
            `📝 Field update: ${fieldId} = "${value}" by ${socket.userEmail} in group ${shareCode}`
          );

          // Validate input data
          if (!shareCode || !fieldId || value === undefined) {
            socket.emit("error", "Invalid field update data");
            return;
          }

          // Sanitize value
          const sanitizedValue = value ? String(value).trim() : "";

          // Get sharing code details
          const { data: sharingCodeData, error: sharingError } = await supabase
            .from("form_sharing_codes")
            .select(
              `
              *,
              forms(id, title, is_active)
            `
            )
            .eq("share_code", shareCode)
            .eq("is_active", true)
            .single();

          if (sharingError || !sharingCodeData) {
            console.error("Share code not found:", shareCode, sharingError);
            socket.emit("error", "Share code not found or inactive");
            return;
          }

          if (!sharingCodeData.forms.is_active) {
            socket.emit("error", "Form is not active");
            return;
          }

          // Verify that the field exists in this form
          const { data: field, error: fieldError } = await supabase
            .from("form_fields")
            .select("id, label, type, required")
            .eq("id", fieldId)
            .eq("form_id", sharingCodeData.forms.id)
            .single();

          if (fieldError || !field) {
            console.error("Field not found:", fieldId, fieldError);
            socket.emit("error", "Field not found in this form");
            return;
          }

          // Validate field value based on type
          if (
            sanitizedValue &&
            !validateFieldValue(field.type, sanitizedValue)
          ) {
            socket.emit("error", `Invalid value for ${field.type} field`);
            return;
          }

          // Check field lock for this specific sharing code (ALTERNATIVE FIX)
          const { data: lockData, error: lockError } = await supabase
            .from("field_locks")
            .select("user_id, expires_at")
            .eq("sharing_code_id", sharingCodeData.id)
            .eq("field_id", fieldId)
            .gt("expires_at", new Date().toISOString())
            .single();

          let lock = null;
          let lockedByEmail = "another user";

          if (lockData && !lockError) {
            // Get user email separately to avoid join issues
            const { data: userData, error: userError } = await supabase
              .from("users")
              .select("email")
              .eq("id", lockData.user_id)
              .single();

            lock = lockData;
            lockedByEmail = userData?.email || "another user";

            if (userError) {
              console.error("Error fetching user data for lock:", userError);
            }
          } else if (lockError && lockError.code !== "PGRST116") {
            console.error("Error checking lock:", lockError);
          }

          // Allow update if no lock exists or user owns the lock
          const canUpdate = !lock || lock.user_id === socket.userId;

          if (!canUpdate) {
            socket.emit(
              "error",
              `Field is locked by ${lockedByEmail} in this group`
            );
            return;
          }

          // Track field contribution for this specific sharing code
          if (sanitizedValue) {
            try {
              const { error: contributionError } = await supabase
                .from("field_contributions")
                .upsert(
                  {
                    form_id: sharingCodeData.forms.id,
                    sharing_code_id: sharingCodeData.id,
                    field_id: fieldId,
                    user_id: socket.userId!,
                    value: sanitizedValue,
                    updated_at: new Date().toISOString(),
                  },
                  {
                    onConflict: "form_id,sharing_code_id,field_id,user_id",
                    ignoreDuplicates: false,
                  }
                );

              if (contributionError) {
                console.error(
                  "Failed to track contribution:",
                  contributionError
                );
              } else {
                console.log(
                  `📊 Contribution tracked for ${socket.userEmail} on field ${field.label} in group ${sharingCodeData.group_name}`
                );
              }
            } catch (contributionErr) {
              console.error("Contribution tracking error:", contributionErr);
            }
          }

          // Immediately broadcast the change to other users in this group only
          socket.to(shareCode).emit("field-updated", {
            fieldId,
            value: sanitizedValue,
            updatedBy: socket.userEmail,
            fieldLabel: field.label,
            groupName: sharingCodeData.group_name,
            timestamp: Date.now(),
          });

          console.log(
            `📡 Broadcasted field update to group ${shareCode} (${sharingCodeData.group_name})`
          );

          // Update the current collaborative response state for this sharing code
          try {
            let response = await getOrCreateCollaborativeResponse(
              sharingCodeData.forms.id,
              sharingCodeData.id,
              socket.userId!
            );

            if (response) {
              const { error: fieldUpdateError } = await supabase
                .from("response_fields")
                .upsert(
                  {
                    response_id: response.id,
                    field_id: fieldId,
                    value: sanitizedValue,
                  },
                  {
                    onConflict: "response_id,field_id",
                  }
                );

              if (fieldUpdateError) {
                console.error(
                  "Failed to update response field:",
                  fieldUpdateError
                );
              } else {
                console.log(
                  `💾 Updated response field ${field.label} with value: "${sanitizedValue}" for group ${sharingCodeData.group_name}`
                );
              }
            } else {
              console.error("No response available for field update");
            }
          } catch (responseUpdateError) {
            console.error("Response update error:", responseUpdateError);
          }

          // Extend the field lock if user has it
          if (lock && lock.user_id === socket.userId) {
            try {
              const newExpiresAt = new Date(Date.now() + 60000).toISOString();
              const { error: lockUpdateError } = await supabase
                .from("field_locks")
                .update({ expires_at: newExpiresAt })
                .eq("sharing_code_id", sharingCodeData.id)
                .eq("field_id", fieldId)
                .eq("user_id", socket.userId!);

              if (lockUpdateError) {
                console.error("Failed to extend lock:", lockUpdateError);
              } else {
                console.log(
                  `⏰ Extended lock for field ${field.label} in group ${sharingCodeData.group_name}`
                );
              }
            } catch (lockError) {
              console.error("Failed to extend lock:", lockError);
            }
          }
        } catch (error) {
          console.error("Field update error:", error);
          socket.emit("error", "Failed to update field");
        }
      }
    );

    // Helper function to get or create collaborative response for specific sharing code
    async function getOrCreateCollaborativeResponse(
      formId: string,
      sharingCodeId: string,
      userId: string
    ) {
      try {
        // Try to get the most recent response for this form and sharing code
        let { data: response, error: responseError } = await supabase
          .from("form_responses")
          .select("id")
          .eq("form_id", formId)
          .eq("sharing_code_id", sharingCodeId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // If no response exists, create a temporary one for collaborative editing
        if (responseError && responseError.code === "PGRST116") {
          const { data: newResponse, error: createError } = await supabase
            .from("form_responses")
            .insert({
              form_id: formId,
              sharing_code_id: sharingCodeId,
              user_id: userId,
            })
            .select("id")
            .single();

          if (createError) {
            console.error(
              "Failed to create collaborative response:",
              createError
            );
            return null;
          } else {
            response = newResponse;
            console.log(
              "📄 Created new collaborative response for sharing code:",
              response?.id
            );
          }
        } else if (responseError) {
          console.error("Error getting response:", responseError);
          return null;
        }

        return response;
      } catch (error) {
        console.error("Error in getOrCreateCollaborativeResponse:", error);
        return null;
      }
    }

    // Enhanced field validation function
    function validateFieldValue(fieldType: string, value: string): boolean {
      if (!value || value.trim() === "") return true; // Empty values are allowed

      switch (fieldType.toUpperCase()) {
        case "EMAIL":
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(value);
        case "NUMBER":
          return !isNaN(Number(value)) && isFinite(Number(value));
        case "TEXT":
        case "TEXTAREA":
          return value.length <= 10000; // Reasonable text limit
        case "DROPDOWN":
        case "RADIO":
          return value.length <= 500; // Reasonable option length
        case "CHECKBOX":
          // For checkbox, value might be comma-separated
          return value.split(",").every((v) => v.trim().length <= 500);
        default:
          return true;
      }
    }

    // Handle typing indicators
    socket.on(
      "typing-start",
      (data: { shareCode: string; fieldId: string }) => {
        console.log(
          `⌨️ ${socket.userEmail} started typing in field ${data.fieldId}`
        );
        socket.to(data.shareCode).emit("user-typing", {
          fieldId: data.fieldId,
          userEmail: socket.userEmail,
          isTyping: true,
        });
      }
    );

    socket.on("typing-stop", (data: { shareCode: string; fieldId: string }) => {
      console.log(
        `⌨️ ${socket.userEmail} stopped typing in field ${data.fieldId}`
      );
      socket.to(data.shareCode).emit("user-typing", {
        fieldId: data.fieldId,
        userEmail: socket.userEmail,
        isTyping: false,
      });
    });

    // Handle form submission
    socket.on(
      "form-submit",
      async (data: {
        shareCode: string;
        submittedBy: string;
        responseId: string;
        formData: Record<string, string>;
      }) => {
        try {
          const { shareCode, submittedBy, responseId, formData } = data;
          console.log(
            `📤 Form submitted by ${submittedBy} in group ${shareCode}`
          );

          // Get sharing code details
          const { data: sharingCodeData } = await supabase
            .from("form_sharing_codes")
            .select(
              `
            group_name,
            forms(title)
          `
            )
            .eq("share_code", shareCode)
            .single();

          if (!sharingCodeData) {
            socket.emit("error", "Share code not found");
            return;
          }

          // Notify all users in the room about form submission (including submitter)
          io.to(shareCode).emit("form-submitted-all", {
            submittedBy,
            responseId,
            formTitle: sharingCodeData.forms[0]?.title,
            groupName: sharingCodeData.group_name,
            timestamp: new Date().toISOString(),
            formData: formData,
          });

          console.log(
            `✅ Notified all users in group ${shareCode} (${sharingCodeData.group_name}) about form submission`
          );
        } catch (error) {
          console.error("Form submit broadcast error:", error);
          socket.emit("error", "Failed to process form submission");
        }
      }
    );

    // Handle form reset for all collaborators
    socket.on("form-reset", (data: { shareCode: string; resetBy: string }) => {
      try {
        const { shareCode, resetBy } = data;
        console.log(`🔄 Form reset by ${resetBy} in group ${shareCode}`);

        // Notify all users in the room about form reset (including the one who reset)
        io.to(shareCode).emit("form-reset-all", {
          resetBy,
          timestamp: new Date().toISOString(),
        });

        console.log(
          `✅ Notified all users in group ${shareCode} about form reset`
        );
      } catch (error) {
        console.error("Form reset broadcast error:", error);
        socket.emit("error", "Failed to process form reset");
      }
    });
    // Handle form reset

    socket.on("form-reset", (data: { shareCode: string; resetBy: string }) => {
      try {
        const { shareCode, resetBy } = data;
        console.log(`🔄 Form reset by ${resetBy} in room ${shareCode}`);

        // Notify all users in the room about form reset (including the one who reset)
        io.to(shareCode).emit("form-reset-all", {
          resetBy,
          timestamp: new Date().toISOString(),
        });

        console.log(
          `✅ Notified all users in room ${shareCode} about form reset`
        );
      } catch (error) {
        console.error("Form reset broadcast error:", error);
        socket.emit("error", "Failed to process form reset");
      }
    });

    // Handle cursor movement (for advanced collaboration features)
    socket.on(
      "cursor-move",
      (data: { shareCode: string; fieldId: string; position: number }) => {
        socket.to(data.shareCode).emit("cursor-updated", {
          fieldId: data.fieldId,
          position: data.position,
          userEmail: socket.userEmail,
          userId: socket.userId,
        });
      }
    );

    // Handle text selection (for advanced collaboration features)
    socket.on(
      "selection-change",
      (data: {
        shareCode: string;
        fieldId: string;
        start: number;
        end: number;
      }) => {
        socket.to(data.shareCode).emit("selection-updated", {
          fieldId: data.fieldId,
          start: data.start,
          end: data.end,
          userEmail: socket.userEmail,
          userId: socket.userId,
        });
      }
    );

    // Enhanced disconnect handling
    socket.on("disconnect", () => {
      console.log(`❌ User ${socket.userEmail} disconnected (${socket.id})`);

      // Get all rooms this user was in
      const rooms = Array.from(socket.rooms);

      rooms.forEach(async (room) => {
        if (room !== socket.id) {
          // Notify others about user leaving
          socket.to(room).emit("user-left", {
            userId: socket.userId,
            email: socket.userEmail,
          });

          // Update active users list for remaining users
          const remainingUsers = getActiveUsersInRoom(io, room);
          io.to(room).emit("active-users", remainingUsers);

          console.log(
            `👥 Updated active users in room ${room}: ${remainingUsers.length} users`
          );
        }
      });

      // Clean up locks for this user
      supabase
        .from("field_locks")
        .delete()
        .eq("user_id", socket.userId!)
        .then(({ error, count }) => {
          if (error) {
            console.error("Failed to clean up user locks:", error);
          } else {
            console.log(
              `🧹 Cleaned up ${count || 0} locks for user ${socket.userEmail}`
            );
          }
        });
    });

    // Handle connection errors
    socket.on("error", (error) => {
      console.error(`Socket error for user ${socket.userEmail}:`, error);
    });
  });

  // Global cleanup interval for expired locks
  setInterval(() => {
    cleanupExpiredLocks(io);
  }, 30000); // Every 30 seconds

  console.log("🚀 Socket.IO handlers setup complete");
};
