import { useCallback } from 'react';
import { useProcessText } from './useOccurrences';

type ProcessSuccess = (result: { original: string; formal: string; aiUnavailable: boolean }) => void;
type ProcessFailure = (error: Error) => void;

export function useAITextProcessing() {
    const processText = useProcessText();

    const processTextWithAI = useCallback(
        async (rawText: string, onSuccess: ProcessSuccess, onFailure?: ProcessFailure) => {
            try {
                const result = await processText.mutateAsync(rawText);
                onSuccess({
                    original: result.original,
                    formal: result.formal,
                    aiUnavailable: !!result.error,
                });
            } catch (err) {
                if (onFailure) {
                    onFailure(err instanceof Error ? err : new Error('Falha ao processar texto.'));
                }
            }
        },
        [processText]
    );

    return {
        processTextWithAI,
        isPending: processText.isPending,
        reset: processText.reset,
    };
}