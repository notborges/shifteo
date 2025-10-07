declare module 'node:fs/promises' {
  export function readFile(path: string | URL | number, options?: unknown): Promise<Uint8Array>
}

declare module 'node:module' {
  interface NodeRequireFunction {
    (id: string): any
    resolve(id: string, options?: { paths?: string[] }): string
  }

  export function createRequire(url: string | URL): NodeRequireFunction
}
