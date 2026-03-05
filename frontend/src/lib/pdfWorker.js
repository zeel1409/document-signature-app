import { pdfjs } from 'react-pdf'

// Required for react-pdf in Vite builds.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

