import { useMutation } from '@tanstack/react-query';
import { supabaseAnonKey, supabaseUrl } from '../../lib/supabase';
import { useAuth } from '../useAuth';
import { AudioProcessingResult } from '../../types/database';

export function useProcessText() {
    // Read token synchronously from the in-memory auth context.
    // Avoids calling supabase.auth.getSession() inside the mutation, which can
    // hang indefinitely in the browser when the Supabase client has a
    // concurrent auto-refresh in flight (autoRefreshToken: true).
    const { session } = useAuth();
    const token = session?.access_token ?? supabaseAnonKey;

    const startGroup = (label: string, style?: string) => {
        if (typeof console.group === 'function') {
            console.group(label, style);
            return;
        }
        console.log(label);
    };

    const endGroup = () => {
        if (typeof console.groupEnd === 'function') {
            console.groupEnd();
        }
    };

    const startTimer = (label: string) => {
        if (typeof console.time === 'function') {
            console.time(label);
        }
    };

    const endTimer = (label: string) => {
        if (typeof console.timeEnd === 'function') {
            console.timeEnd(label);
        }
    };

    return useMutation({
        mutationFn: async (text: string): Promise<AudioProcessingResult> => {
            const TIMEOUT_MS = 30_000;
            const clientStart = Date.now();

            startGroup('%c✨ [process-text] OpenRouter request', 'color: #6366F1; font-weight: bold');
            console.log('📤 Input:', { chars: text.length, preview: text.slice(0, 80) + (text.length > 80 ? '…' : '') });
            startTimer('⏱ round-trip');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

            try {
                const res = await fetch(`${supabaseUrl}/functions/v1/process-text`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ text }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                const clientMs = Math.round(Date.now() - clientStart);

                endTimer('⏱ round-trip');
                console.log(`📡 HTTP status: ${res.status} | client-side latency: ${clientMs}ms`);

                const resText = await res.text();

                let parsed: any = null;
                try {
                    parsed = JSON.parse(resText);
                } catch {
                    console.error('❌ Non-JSON response:', resText.slice(0, 200));
                    endGroup();
                    throw new Error(`Invalid JSON response: ${resText.substring(0, 100)}`);
                }

                if (!res.ok) {
                    const detailedError = parsed?.details || parsed?.error || `HTTP ${res.status}: ${JSON.stringify(parsed)}`;
                    console.error('❌ Edge Function error:', parsed);
                    endGroup();
                    throw new Error(detailedError);
                }

                const modelUsed: string | null = parsed.model_used ?? null;
                const tiersAttempted: number = parsed.tiers_attempted ?? 0;
                const edgeMs: number | null = parsed.duration_ms ?? null;

                if (parsed.error) {
                    // Graceful degradation: the Edge Function already returned
                    // the original text as `formal` when all models failed.
                    // Accept it — the user can still review and edit before saving.
                    console.warn('%c⚠️ Formalization FAILED — using original text as fallback', 'color: #F59E0B; font-weight: bold');
                    console.warn('   Reason:', parsed.error);
                    console.warn('   Details:', parsed.details);
                    endGroup();
                    return parsed as AudioProcessingResult;
                }

                console.log('%c✅ Success', 'color: #10B981; font-weight: bold', `| model: ${modelUsed} | tiers tried: ${tiersAttempted} | edge duration: ${edgeMs}ms`);
                if (tiersAttempted > 1) {
                    console.warn(`⚠️ Required ${tiersAttempted} tier(s) — first tier models were unavailable.`);
                }

                console.log('📥 Output:', {
                    original_chars: parsed.original?.length ?? 0,
                    formal_chars: parsed.formal?.length ?? 0,
                    formal_preview: (parsed.formal ?? '').slice(0, 100) + ((parsed.formal?.length ?? 0) > 100 ? '…' : ''),
                });
                endGroup();

                return parsed as AudioProcessingResult;
            } catch (err: any) {
                clearTimeout(timeoutId);
                if (err.name === 'AbortError') {
                    console.error(`❌ Client-side timeout after ${TIMEOUT_MS / 1000}s`);
                    endGroup();
                    throw new Error('O processamento do texto demorou muito. Tente novamente.');
                }
                endGroup();
                throw err;
            }
        },
    });
}
