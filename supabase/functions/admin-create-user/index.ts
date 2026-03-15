
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { verifyAuth, ensureAdmin } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { errorResponse, jsonResponse } from "../_shared/errors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await verifyAuth(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const isAdmin = await ensureAdmin(auth.user.id);
    if (!isAdmin) return errorResponse(corsHeaders, 403, "Admin access required");

    const supabaseClient = createAdminClient();

    const { email, password, full_name, role, whatsapp_number } = await req.json();

    if (!email || !password || !full_name) {
      return errorResponse(corsHeaders, 400, "Missing required fields");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(full_name).trim();
    const normalizedRole = role || 'professor';
    const normalizedPassword = String(password);
    const normalizedWhatsapp = typeof whatsapp_number === 'string'
      ? whatsapp_number.trim().replace(/\D/g, '') || null
      : null;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return errorResponse(corsHeaders, 400, "Invalid email format");
    }

    if (normalizedName.length < 3) {
      return errorResponse(corsHeaders, 400, "Full name must have at least 3 characters");
    }

    if (normalizedPassword.length < 8) {
      return errorResponse(corsHeaders, 400, "Password must have at least 8 characters");
    }

    const hasUpper = /[A-Z]/.test(normalizedPassword);
    const hasLower = /[a-z]/.test(normalizedPassword);
    const hasNumber = /\d/.test(normalizedPassword);
    if (!hasUpper || !hasLower || !hasNumber) {
      return errorResponse(corsHeaders, 400, "Password must include uppercase, lowercase, and number");
    }

    // Create user with admin API
    const { data: user, error: createError } = await supabaseClient.auth.admin.createUser({
      email: normalizedEmail,
      password: normalizedPassword,
      email_confirm: true,
      user_metadata: { full_name: normalizedName, role: normalizedRole },
    });

    if (createError) {
      // If user already exists, we might want to return that error clearly
      return errorResponse(corsHeaders, 400, createError.message);
    }

    if (user?.user?.id) {
      await supabaseClient
        .from('profiles')
        .update({
          full_name: normalizedName,
          role: normalizedRole,
          whatsapp_number: normalizedWhatsapp,
          force_password_change: true,
        })
        .eq('auth_id', user.user.id);
    }

    return jsonResponse({ user }, 200, corsHeaders);
  } catch (error) {
    return errorResponse(corsHeaders, 400, (error as Error).message);
  }
});
