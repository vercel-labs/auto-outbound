import { withWorkflow } from 'workflow/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['drizzle-orm'],
};

export default withWorkflow(nextConfig);
