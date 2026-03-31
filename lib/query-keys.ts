export const queryKeys = {
  campaigns: {
    all: ['campaigns'] as const,
    detail: (id: number) => ['campaigns', id] as const,
    contacts: (campaignId: number) => ['campaigns', campaignId, 'contacts'] as const,
  },
} as const;
