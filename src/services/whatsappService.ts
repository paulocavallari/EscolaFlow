import { Alert } from 'react-native';
// Force reload of WhatsApp service

const API_URL = process.env.EVOLUTION_API_URL || 'http://137.131.213.8:8080';
const API_KEY = process.env.EVOLUTION_API_KEY || 'Pa7412365**';

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
        const url = `${API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE_NAME || 'zap'}`;

        console.log('Sending WhatsApp to:', url, formattedPhone);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': API_KEY
            },
            body: JSON.stringify({
                number: formattedPhone,
                options: {
                    delay: 1200,
                    presence: "composing",
                    linkPreview: false
                },
                textMessage: {
                    text: text
                }
            })
        });

        const textResponse = await response.text();
        console.log('Raw API Response:', textResponse);

        try {
            const data = JSON.parse(textResponse);
            return { success: response.ok, data, status: response.status };
        } catch (e) {
            return { success: response.ok, data: textResponse, status: response.status };
        }

    } catch (error: any) {
        console.error('WhatsApp Service Exception:', error);
        return { success: false, error: error.message || error.toString() };
    }
}

export async function fetchInstances(): Promise<any> {
    try {
        const url = `${API_URL}/instance/fetch`;
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
