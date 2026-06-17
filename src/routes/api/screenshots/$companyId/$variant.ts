import { createFileRoute } from '@tanstack/react-router'
import { getScreenshotFile } from '@/server/services/analysis/screenshot-storage'

export const Route = createFileRoute('/api/screenshots/$companyId/$variant')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const file = await getScreenshotFile(params.companyId, params.variant)
        if (!file) {
          return new Response('Not found', { status: 404 })
        }
        return new Response(new Uint8Array(file.buffer), {
          headers: {
            'Content-Type': file.contentType,
            'Cache-Control': 'public, max-age=86400',
          },
        })
      },
    },
  },
})
