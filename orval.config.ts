import { defineConfig } from 'orval';

export default defineConfig({
  ezqrin: {
    input: './server/api/openapi.bundled.json',
    output: {
      mode: 'tags-split',
      target: './src/lib/generated',
      schemas: './src/lib/generated/model',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/lib/api/client.ts',
          name: 'orvalClient',
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
});
