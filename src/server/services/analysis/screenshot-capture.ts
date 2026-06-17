import fs from 'node:fs/promises'
import path from 'node:path'
import { ensureHttps } from '@/lib/url'

export interface ScreenshotResult {
  screenshotDesktopPath: string | null
  screenshotMobilePath: string | null
  desktopBase64: string | null
  mobileBase64: string | null
}

const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'screenshots')

function apiPath(companyId: string, variant: 'desktop' | 'mobile') {
  return `/api/screenshots/${companyId}/${variant}`
}

async function saveBuffer(
  companyId: string,
  variant: 'desktop' | 'mobile',
  buffer: Buffer,
): Promise<{ path: string; base64: string }> {
  const dir = path.join(STORAGE_ROOT, companyId)
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, `${variant}.png`)
  await fs.writeFile(filePath, buffer)
  return { path: apiPath(companyId, variant), base64: buffer.toString('base64') }
}

async function captureWithPlaywright(
  url: string,
  companyId: string,
): Promise<ScreenshotResult | null> {
  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 })
    await page.waitForTimeout(1500)

    await page.setViewportSize({ width: 1280, height: 800 })
    const desktopBuffer = await page.screenshot({ type: 'png', fullPage: false })

    await page.setViewportSize({ width: 375, height: 812 })
    const mobileBuffer = await page.screenshot({ type: 'png', fullPage: false })

    await browser.close()

    const desktop = await saveBuffer(companyId, 'desktop', desktopBuffer)
    const mobile = await saveBuffer(companyId, 'mobile', mobileBuffer)

    return {
      screenshotDesktopPath: desktop.path,
      screenshotMobilePath: mobile.path,
      desktopBase64: desktop.base64,
      mobileBase64: mobile.base64,
    }
  } catch {
    return null
  }
}

async function fetchFallbackScreenshot(url: string, width: number): Promise<Buffer | null> {
  try {
    const target = encodeURIComponent(ensureHttps(url))
    const res = await fetch(`https://image.thum.io/get/width/${width}/noanimate/${target}`, {
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    return buf.length > 1000 ? buf : null
  } catch {
    return null
  }
}

async function captureWithFallback(
  url: string,
  companyId: string,
): Promise<ScreenshotResult> {
  const [desktopBuf, mobileBuf] = await Promise.all([
    fetchFallbackScreenshot(url, 1280),
    fetchFallbackScreenshot(url, 375),
  ])

  let screenshotDesktopPath: string | null = null
  let screenshotMobilePath: string | null = null
  let desktopBase64: string | null = null
  let mobileBase64: string | null = null

  if (desktopBuf) {
    const saved = await saveBuffer(companyId, 'desktop', desktopBuf)
    screenshotDesktopPath = saved.path
    desktopBase64 = saved.base64
  }
  if (mobileBuf) {
    const saved = await saveBuffer(companyId, 'mobile', mobileBuf)
    screenshotMobilePath = saved.path
    mobileBase64 = saved.base64
  }

  return {
    screenshotDesktopPath,
    screenshotMobilePath,
    desktopBase64,
    mobileBase64,
  }
}

export async function captureWebsiteScreenshots(
  url: string,
  companyId: string,
): Promise<ScreenshotResult> {
  const targetUrl = ensureHttps(url)
  const playwrightResult = await captureWithPlaywright(targetUrl, companyId)
  if (playwrightResult?.screenshotDesktopPath) return playwrightResult
  return captureWithFallback(targetUrl, companyId)
}

export async function readScreenshotBase64(
  companyId: string,
  variant: 'desktop' | 'mobile',
): Promise<string | null> {
  try {
    const filePath = path.join(STORAGE_ROOT, companyId, `${variant}.png`)
    const buf = await fs.readFile(filePath)
    return buf.toString('base64')
  } catch {
    return null
  }
}
