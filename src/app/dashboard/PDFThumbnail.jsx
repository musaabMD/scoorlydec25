'use client'

import { useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { FileText } from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
}

// Memoize Document options outside component to prevent recreation
const DOCUMENT_OPTIONS = {
  cMapUrl: '/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/standard_fonts/',
}

export default function PDFThumbnail({ fileUrl, onLoadSuccess }) {
  const [numPages, setNumPages] = useState(null)
  const [pageWidth, setPageWidth] = useState(null)
  const [error, setError] = useState(false)

  const handleDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    if (onLoadSuccess) {
      onLoadSuccess(numPages)
    }
  }

  const handlePageLoadSuccess = (page) => {
    try {
      const viewport = page.getViewport({ scale: 1 })
      setPageWidth(viewport.width)
    } catch (e) {
      console.error('Error getting page viewport:', e)
    }
  }

  const handleError = (error) => {
    console.error('PDF load error:', error)
    setError(true)
  }

  // Calculate scale to fit within container (max width ~200px for card, with padding)
  const maxWidth = 200
  const scale = pageWidth ? Math.min(maxWidth / pageWidth, 1) : 1
  const width = pageWidth ? pageWidth * scale : maxWidth

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
        <FileText className="h-12 w-12 mb-2" />
        <span className="text-xs">Unable to load preview</span>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 p-2">
      <Document
        file={fileUrl}
        onLoadSuccess={handleDocumentLoadSuccess}
        onLoadError={handleError}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        }
        error={
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <FileText className="h-12 w-12 mb-2" />
            <span className="text-xs">Unable to load preview</span>
          </div>
        }
        options={DOCUMENT_OPTIONS}
      >
        <Page
          pageNumber={1}
          width={width}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          onLoadSuccess={handlePageLoadSuccess}
          onRenderError={handleError}
          className="!max-w-full !h-auto shadow-sm"
        />
      </Document>
    </div>
  )
}
