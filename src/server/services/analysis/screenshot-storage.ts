import fs from 'node:fs/promises'
import path from 'node:path'

const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'screenshots')

export async function getScreenshotFile(
  companyId: string,
  variant: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (variant !== 'desktop' && variant !== 'mobile') return null

  const filePath = path.join(STORAGE_ROOT, companyId, `${variant}.png`)
  try {
    const buffer = await fs.readFile(filePath)
    return { buffer, contentType: 'image/png' }
  } catch {
    return null
  }
}
