declare module 'pdfjs-dist/build/pdf' {
  export const GlobalWorkerOptions: { workerSrc: string }
  export function getDocument(params: any): { promise: Promise<any> }
}

declare module 'pdfjs-dist/build/pdf.worker?url' {
  const src: string
  export default src
}
