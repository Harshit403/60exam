export function initSSE(res: { writeHead: (status: number, headers: Record<string, string>) => void; write: (chunk: string) => boolean | void }): boolean {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.write(':ok\n\n')
  return true
}

export function sendSSE(res: { write: (chunk: string) => boolean | void }, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export function sendHeartbeat(res: { write: (chunk: string) => boolean | void }) {
  res.write(':heartbeat\n\n')
}
