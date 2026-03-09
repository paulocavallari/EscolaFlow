// src/services/whatsappService.ts
// WhatsApp messaging via Supabase Edge Function Proxy

import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';

// Helper instance info
const API_URL = process.env.EXPO_PUBLIC_EVOLUTION_API_URL ?? 'http://137.131.213.8:8080';
const API_KEY = process.env.EXPO_PUBLIC_EVOLUTION_API_KEY ?? 'Pa7412365**';

interface SendMessageResponse {
    key: {
        id: string;
    };
    message: string;
}

/**
 * Clean phone number to format 5511999999999
 */
function formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('55')) return cleaned;
    return `55${cleaned}`;
}

export async function sendWhatsAppMessage(phone: string, text: string): Promise<any> {
    try {
        if (!phone) {
            console.warn('WhatsApp service: No phone provided');
            return { success: false, error: 'No phone provided' };
        }

        const formattedPhone = formatPhone(phone);

        // Get the current session token explicitly
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
            console.warn('WhatsApp service: No auth token available');
            return { success: false, error: 'Not authenticated' };
        }

        // Use explicit fetch with Authorization header to ensure JWT is passed correctly
        const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-manual`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': supabaseAnonKey,
            },
            body: JSON.stringify({ phone: formattedPhone, text }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`WhatsApp function error (${response.status}):`, errText);
            return { success: false, error: `HTTP ${response.status}: ${errText}` };
        }

        const data = await response.json();
        return { success: true, data };

    } catch (error: any) {
        console.error('WhatsApp Service Exception:', error);
        return { success: false, error: error.message || error.toString() };
    }
}

export async function fetchInstances(): Promise<any> {
    try {
        const url = `${API_URL}/instance/fetchInstances`;
        console.log('Fetching instances from:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'apikey': API_KEY
            }
        });

        const textResponse = await response.text();
        console.log('Raw Instances Response:', textResponse);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${textResponse}`);
        }

        try {
            const data = JSON.parse(textResponse);
            if (Array.isArray(data)) return data;
            // Some versions return { instance: [...] } or just the array
            if (data && Array.isArray(data.instances)) return data.instances;
            return data;
        } catch (e) {
            throw new Error(`Invalid JSON: ${textResponse}`);
        }
    } catch (error: any) {
        console.error('Error fetching instances [fetchInstances]:', error);
        throw error;
    }
}
