import Exa from 'exa-js';

let exaClient: Exa | null = null;

export function getExaClient(): Exa {
  if (!exaClient) {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      throw new Error('EXA_API_KEY environment variable is required');
    }
    exaClient = new Exa(apiKey);
  }
  return exaClient;
}
