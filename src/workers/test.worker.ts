// Simple test worker to verify worker communication works
console.log('[TestWorker] Worker starting...')

self.addEventListener('message', (event: MessageEvent) => {
  console.log('[TestWorker] Received:', event.data)
  const { id, type } = event.data

  self.postMessage({
    id,
    result: `Echo: ${type}`
  })
})

console.log('[TestWorker] Worker ready')
