// supabase/functions/import-csv/index.ts
// Edge Function: CSV Bulk Import for Students (Admin-only)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CSVRow {
    nome: string;
    matricula: string;
    turma_id: string;
    tutor_id: string;
}

interface ImportResult {
    total: number;
    inserted: number;
    skipped: number;
    errors: Array<{ row: number; message: string }>;
}

function parseCSV(csvText: string): CSVRow[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    // Parse header (case-insensitive)
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = headers.findIndex((h) => ['nome', 'name'].includes(h));
    const matriculaIdx = headers.findIndex((h) => ['matricula', 'enrollment'].includes(h));
    const turmaIdx = headers.findIndex((h) => ['turmaid', 'turma_id', 'class_id', 'classid'].includes(h));
    const tutorIdx = headers.findIndex((h) => ['tutorid', 'tutor_id'].includes(h));

    if (nameIdx === -1 || matriculaIdx === -1 || turmaIdx === -1) {
        throw new Error('CSV must have columns: Nome, Matricula, TurmaID (and optionally TutorID)');
    }

    const rows: CSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim());
        if (cols.length < 3 || !cols[nameIdx]) continue;

        rows.push({
            nome: cols[nameIdx],
            matricula: cols[matriculaIdx],
            turma_id: cols[turmaIdx],
            tutor_id: tutorIdx !== -1 ? cols[tutorIdx] : '',
        });
    }

    return rows;
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Verify auth and admin role
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Check admin role
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('auth_id', user.id)
            .single();

        if (!profile || profile.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Admin access required' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Parse CSV from request body
        const formData = await req.formData();
        const csvFile = formData.get('file') as File;

        if (!csvFile) {
            return new Response(JSON.stringify({ error: 'No CSV file provided' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const csvText = await csvFile.text();
        let rows: CSVRow[];

        try {
            rows = parseCSV(csvText);
        } catch (parseError) {
            return new Response(JSON.stringify({ error: String(parseError) }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (rows.length === 0) {
            return new Response(JSON.stringify({ error: 'CSV file is empty or has no valid rows' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Validate foreign keys exist
        const classIds = [...new Set(rows.map((r) => r.turma_id).filter(Boolean))];
        const tutorIds = [...new Set(rows.map((r) => r.tutor_id).filter(Boolean))];

        const { data: validClasses } = await supabaseAdmin
            .from('classes')
            .select('id')
            .in('id', classIds);

        const validClassIds = new Set(validClasses?.map((c) => c.id) ?? []);

        let validTutorIds = new Set<string>();
        if (tutorIds.length > 0) {
            const { data: validTutors } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .in('id', tutorIds);
            validTutorIds = new Set(validTutors?.map((t) => t.id) ?? []);
        }

        // Process rows
        const result: ImportResult = {
            total: rows.length,
            inserted: 0,
            skipped: 0,
            errors: [],
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // 1-indexed + header

            // Validate class exists
            if (!validClassIds.has(row.turma_id)) {
                result.errors.push({ row: rowNum, message: `Turma ID "${row.turma_id}" não encontrada` });
                result.skipped++;
                continue;
            }

            // Validate tutor if provided
            if (row.tutor_id && !validTutorIds.has(row.tutor_id)) {
                result.errors.push({ row: rowNum, message: `Tutor ID "${row.tutor_id}" não encontrado` });
                result.skipped++;
                continue;
            }

            // Insert student
            const { error: insertError } = await supabaseAdmin
                .from('students')
                .insert({
                    name: row.nome,
                    matricula: row.matricula || null,
                    class_id: row.turma_id,
                    tutor_id: row.tutor_id || null,
                });

            if (insertError) {
                if (insertError.code === '23505') {
                    // Unique violation (duplicate matricula)
                    result.errors.push({ row: rowNum, message: `Matrícula "${row.matricula}" já existe` });
                    result.skipped++;
                } else {
                    result.errors.push({ row: rowNum, message: insertError.message });
                    result.skipped++;
                }
            } else {
                result.inserted++;
            }
        }

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('CSV import error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
