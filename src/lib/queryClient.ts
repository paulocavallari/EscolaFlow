// src/lib/queryClient.ts
// TanStack Query client configuration for offline-first performance

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Cache data for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Keep unused data in cache for 30 minutes
            gcTime: 30 * 60 * 1000,
            // Retry failed requests 2 times
            retry: 2,
            // Refetch on window focus (useful for tab switching)
            refetchOnWindowFocus: true,
            // Don't refetch on reconnect automatically
            refetchOnReconnect: 'always',
        },
        mutations: {
            retry: 1,
        },
    },
});

export default queryClient;
