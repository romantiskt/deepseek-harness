/** Preserve bounded local-check evidence within the workflow document limit. */
import type { SubprocessOutputRead, SubprocessOutputReader } from '@deepseek-ai/dsh-subprocess'

/**
 * @param reader - one settled managed-process stream. @returns a bounded tail with accurate truncation metadata.
 */
export function checkOutput(reader: SubprocessOutputReader | undefined): SubprocessOutputRead | undefined {
  if (!reader) return undefined
  const result = reader.readFrom(0)
  // Two 5,000-character streams remain below 100,000 characters even with JSON escaping.
  return { ...result, text: result.text.slice(-5000), lossy: result.lossy || result.text.length > 5000 }
}
