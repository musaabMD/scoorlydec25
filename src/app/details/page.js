'use client'

import { useState, useEffect, useRef, Suspense, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Document, Page, pdfjs } from 'react-pdf'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { ArrowLeft } from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Configure PDF.js worker - ensure it's set up properly
if (typeof window !== 'undefined') {
  // Use a more reliable worker source - try multiple sources
  try {
    const workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
  } catch (e) {
    console.error('Error setting worker source:', e)
  }
}

// Memoize Document options outside component to prevent recreation
const DOCUMENT_OPTIONS = {
  cMapUrl: '/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/standard_fonts/',
  verbosity: 0,
  disableFontFace: false,
  useWorkerFetch: false,
  isEvalSupported: false,
}

function DetailsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const filePath = searchParams.get('file')
  const fileUrl = searchParams.get('url')
  
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [questions, setQuestions] = useState({})
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState(0)
  const [extractionStatus, setExtractionStatus] = useState('')
  const [pdfScale, setPdfScale] = useState(1.0) // Display scale
  const [renderScale, setRenderScale] = useState(2.0) // High quality render scale (2x for crisp text)
  const [pageWidth, setPageWidth] = useState(null)
  const [pageHeight, setPageHeight] = useState(null)
  const containerRef = useRef(null)
  const [questionsScale, setQuestionsScale] = useState(1.0)
  const [selectedAnswers, setSelectedAnswers] = useState({}) // Track selected answers: { questionIndex: selectedChoice }
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState('openai/gpt-4o')
  const [modelPricing, setModelPricing] = useState(null)
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [loadingModels, setLoadingModels] = useState(true)
  const canvasRefs = useRef({})

  // Ensure PDF.js worker is initialized before any PDF operations
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Set worker source if not already set
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
      }
      
      // Verify worker is ready
      try {
        // Test worker initialization
        const testDoc = pdfjs.getDocument({ data: new Uint8Array(0), verbosity: 0 })
        testDoc.promise.catch(() => {
          // Worker error is expected for empty data, but confirms worker is initialized
        })
      } catch (e) {
        console.warn('PDF.js worker initialization check:', e)
      }
    }
  }, [])

  // Fetch available models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/openrouter-models')
        const data = await response.json()
        setModels(data.models || [])
        if (data.models && data.models.length > 0) {
          const defaultModel = data.models.find(m => m.id === 'openai/gpt-4o') || data.models[0]
          setSelectedModel(defaultModel.id)
          setModelPricing(defaultModel.pricing)
        }
      } catch (error) {
        console.error('Error fetching models:', error)
      } finally {
        setLoadingModels(false)
      }
    }
    fetchModels()
  }, [])

  // Calculate estimated cost per page
  const calculateEstimatedCost = useCallback((totalPages, pricing) => {
    if (!pricing || !pricing.prompt || !pricing.completion) {
      setEstimatedCost(0)
      return
    }
    
    // Estimate tokens per page:
    // - Image: ~85 tokens per image (base64 encoded)
    // - Prompt text: ~200 tokens
    // - Completion: ~500 tokens (for extracted questions)
    const promptTokensPerPage = 85 + 200 // Image + text prompt
    const completionTokensPerPage = 500
    
    const costPerPage = (
      (parseFloat(pricing.prompt) / 1000) * promptTokensPerPage +
      (parseFloat(pricing.completion) / 1000) * completionTokensPerPage
    )
    
    // Multiply by 2 (AI + OCR methods)
    const totalCostPerPage = costPerPage * 2
    const totalCost = totalCostPerPage * totalPages
    
    setEstimatedCost(totalCost)
  }, [])

  // Load PDF when fileUrl is available
  useEffect(() => {
    if (fileUrl) {
      const loadPDF = async () => {
        try {
          setLoading(true)
          setExtracting(false)
          
          // Ensure worker is initialized before loading PDF
          if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
            pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
          }
          
          // Wait a bit to ensure worker is ready
          await new Promise(resolve => setTimeout(resolve, 100))
          
          const response = await fetch(fileUrl)
          if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.status}`)
          }
          const blob = await response.blob()
          const arrayBuffer = await blob.arrayBuffer()
          
          const loadingTask = pdfjs.getDocument({ 
            data: arrayBuffer,
            verbosity: 0,
            useWorkerFetch: false,
            isEvalSupported: false
          })
          const pdf = await loadingTask.promise
          const totalPages = pdf.numPages
          setNumPages(totalPages)
          setLoading(false)
          
          // Calculate estimated cost
          if (totalPages > 0 && modelPricing) {
            calculateEstimatedCost(totalPages, modelPricing)
          }
        } catch (error) {
          console.error('Error loading PDF:', error)
          setLoading(false)
          setExtracting(false)
          alert('Error loading PDF: ' + error.message)
        }
      }
      loadPDF()
    }
  }, [fileUrl, modelPricing, calculateEstimatedCost])

  // Update cost when model changes
  useEffect(() => {
    if (selectedModel && models.length > 0) {
      const model = models.find(m => m.id === selectedModel)
      if (model) {
        setModelPricing(model.pricing)
        if (numPages && model.pricing) {
          calculateEstimatedCost(numPages, model.pricing)
        }
      }
    }
  }, [selectedModel, models, numPages, calculateEstimatedCost])

  const convertPageToImage = async (pdf, pageNum) => {
    try {
      if (!pdf) {
        throw new Error('PDF document is not loaded')
      }
      
      // Ensure worker is ready
      if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 2.0 })
      
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      canvas.height = viewport.height
      canvas.width = viewport.width

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise

      return canvas.toDataURL('image/png').split(',')[1] // Return base64 without data URL prefix
    } catch (error) {
      console.error(`Error converting page ${pageNum} to image:`, error)
      throw error
    }
  }

  const extractQuestionsFromPDF = async (url, totalPages) => {
    if (!selectedModel) {
      alert('Please select a model first')
      return
    }

    setExtracting(true)
    setExtractionProgress(0)
    setExtractionStatus('Starting extraction...')

    try {
      // Fetch PDF as blob
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`)
      }
      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()
      
      // Ensure worker is initialized
      if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
      }
      
      // Wait a bit to ensure worker is ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const loadingTask = pdfjs.getDocument({ 
        data: arrayBuffer,
        verbosity: 0,
        useWorkerFetch: false,
        isEvalSupported: false
      })
      const pdf = await loadingTask.promise
      
      if (!pdf || pdf.numPages === 0) {
        throw new Error('PDF has no pages')
      }

      const extractedQuestions = {}
      
      // Removed OCR merging - using only AI vision for speed
      
      // STEP 1: Convert all pages to images in parallel (fast preprocessing)
      setExtractionStatus('Converting pages to images...')
      const pageImages = await Promise.all(
        Array.from({ length: totalPages }, (_, i) => 
          convertPageToImage(pdf, i + 1).then(base64 => ({
            pageNumber: i + 1,
            imageBase64: base64
          }))
        )
      )
      
      console.log(`Converted ${pageImages.length} pages to images`)

      // STEP 2: Process all pages in parallel with progressive updates
      setExtractionStatus(`Extracting from all ${totalPages} pages in parallel (AI Vision)...`)
      
      // Create promises for all pages
      const extractionPromises = pageImages.map(({ pageNumber, imageBase64 }) => {
        return fetch('/api/extract-questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            pageImageBase64: imageBase64, 
            model: selectedModel,
            pageNumber: pageNumber
          })
        })
        .then(async (response) => {
          if (response.ok) {
            const data = await response.json()
            return {
              pageNumber,
              questions: data.questions || [],
              success: true
            }
          }
          return {
            pageNumber,
            questions: [],
            success: false
          }
        })
        .catch((error) => {
          console.error(`Error extracting page ${pageNumber}:`, error)
          return {
            pageNumber,
            questions: [],
            success: false
          }
        })
      })

      // STEP 3: Process results as they complete (true streaming/progressive display)
      let completedCount = 0
      const startTime = Date.now()
      
      // Use Promise.allSettled but update UI as each completes
      const results = await Promise.all(
        extractionPromises.map((promise, index) => 
          promise.then(result => {
            completedCount++
            const { pageNumber, questions } = result
            
            // Update state immediately for this page (progressive display)
            setQuestions(prev => ({
              ...prev,
              [pageNumber]: questions
            }))
            
            extractedQuestions[pageNumber] = questions
            
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
            setExtractionProgress((completedCount / totalPages) * 100)
            setExtractionStatus(
              `Page ${pageNumber}/${totalPages} complete (${questions.length} questions) - ${completedCount}/${totalPages} done in ${elapsed}s`
            )
            
            return result
          }).catch(error => {
            completedCount++
            const pageNumber = index + 1
            extractedQuestions[pageNumber] = []
            setExtractionProgress((completedCount / totalPages) * 100)
            return { pageNumber, questions: [], success: false }
          })
        )
      )

      // Final update
      const totalQuestions = Object.values(extractedQuestions).reduce((sum, qs) => sum + qs.length, 0)
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
      setExtractionStatus(
        `✅ Extraction complete! Found ${totalQuestions} questions across ${totalPages} pages in ${totalTime}s`
      )
      console.log(`Extraction completed in ${totalTime}s - ${totalQuestions} questions found`)
    } catch (error) {
      console.error('Error processing PDF:', error)
      setExtractionStatus('Error during extraction')
    } finally {
      setExtracting(false)
      setTimeout(() => {
        setExtractionProgress(0)
        setExtractionStatus('')
      }, 2000)
    }
  }

  const onDocumentLoadSuccess = ({ numPages }) => {
    if (!numPages) {
      setNumPages(numPages)
    }
  }

  const onPageLoadSuccess = (page) => {
    if (page) {
      // Get base dimensions at scale 1.0
      const viewport = page.getViewport({ scale: 1.0 })
      setPageWidth(viewport.width)
      setPageHeight(viewport.height)
    }
  }

  // Calculate PDF scale to fit container properly for readability
  useEffect(() => {
    if (containerRef.current && pageWidth && pageHeight) {
      const updateScale = () => {
        const container = containerRef.current
        if (container) {
          const containerRect = container.getBoundingClientRect()
          // Minimal padding for better fit
          const availableWidth = containerRect.width - 32 // small padding
          const availableHeight = containerRect.height - 32 // small padding
          
          // Calculate scale to fit both width and height, use the smaller one
          const scaleX = availableWidth / pageWidth
          const scaleY = availableHeight / pageHeight
          
          // Use the smaller scale to ensure the PDF fits completely
          const calculatedScale = Math.min(scaleX, scaleY)
          
          // Render at higher scale for quality (3x for maximum crispness)
          // The CSS transform will scale it back down to the correct display size
          setPdfScale(calculatedScale)
          setRenderScale(3.0) // 3x rendering for high quality
        }
      }
      
      updateScale()
      window.addEventListener('resize', updateScale)
      return () => window.removeEventListener('resize', updateScale)
    }
  }, [pageWidth, pageHeight, pageNumber])

  // Extract filename from filePath
  const fileName = filePath ? filePath.split('/').pop() || filePath : 'Unknown'

  return (
    <main className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Compact Header - One Line */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="w-full px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Button
                onClick={() => router.push('/')}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Back to Home"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-semibold text-gray-800 whitespace-nowrap">PDF Details</h1>
              <span className="text-sm text-gray-500 truncate">{fileName}</span>
              {numPages && (
                <span className="text-sm text-gray-500 whitespace-nowrap">{numPages} page{numPages !== 1 ? 's' : ''}</span>
              )}
            </div>
            
            <div className="flex items-center gap-3 flex-shrink-0">
              {fileUrl && (
                <div className="flex items-center gap-2 border-r pr-3 mr-2">
                  <Button
                    onClick={() => setPdfScale(Math.max(0.3, pdfScale - 0.1))}
                    variant="outline"
                    size="sm"
                    title="Zoom Out"
                    className="h-7 w-7 p-0"
                  >
                    −
                  </Button>
                  <span className="text-xs text-gray-600 min-w-[50px] text-center">
                    {Math.round(pdfScale * 100)}%
                  </span>
                  <Button
                    onClick={() => setPdfScale(Math.min(2.0, pdfScale + 0.1))}
                    variant="outline"
                    size="sm"
                    title="Zoom In"
                    className="h-7 w-7 p-0"
                  >
                    +
                  </Button>
                  <Button
                    onClick={() => {
                      if (containerRef.current && pageWidth && pageHeight) {
                        const container = containerRef.current
                        const containerRect = container.getBoundingClientRect()
                        const availableWidth = containerRect.width - 32
                        const availableHeight = containerRect.height - 32
                        const scaleX = availableWidth / pageWidth
                        const scaleY = availableHeight / pageHeight
                        setPdfScale(Math.min(scaleX, scaleY))
                      }
                    }}
                    variant="outline"
                    size="sm"
                    title="Fit to Container"
                    className="h-7 px-2 text-xs"
                  >
                    Fit
                  </Button>
                </div>
              )}
              
              {loadingModels ? (
                <span className="text-sm text-gray-500">Loading models...</span>
              ) : (
                <Select value={selectedModel} onValueChange={setSelectedModel} disabled={extracting}>
                  <SelectTrigger className="w-[200px] h-8 text-sm">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} ({model.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {estimatedCost > 0 && (
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  Est: ${estimatedCost.toFixed(4)}
                </span>
              )}
              
              <Button
                onClick={() => {
                  if (numPages && selectedModel) {
                    extractQuestionsFromPDF(fileUrl, numPages)
                  }
                }}
                disabled={extracting || !numPages || !selectedModel || loadingModels}
                size="sm"
              >
                {extracting ? 'Extracting...' : 'Start Extraction'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {extracting && (
          <div className="mx-4 mt-4 mb-4 bg-white rounded-lg shadow p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700 block">Extracting questions (AI + OCR in parallel)...</span>
                {extractionStatus && (
                  <span className="text-xs text-gray-500 mt-1 block">{extractionStatus}</span>
                )}
              </div>
              <span className="text-sm text-gray-600 ml-4">{Math.round(extractionProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${extractionProgress}%` }}
              />
            </div>
            <div className="mt-2 flex gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                Parallel AI Vision Extraction (All pages processing simultaneously)
              </span>
            </div>
          </div>
        )}

        {/* PDF Preview and Extracted Questions - Split View */}
        <div className="flex-1 overflow-hidden pb-24">
          <PanelGroup direction="horizontal" className="h-full">
            {/* PDF Viewer - Left Side */}
            <Panel defaultSize={50} minSize={30} className="flex flex-col">
              <div className="bg-white flex flex-col h-full">
                {fileUrl && (
                  <div className="flex-1 flex flex-col overflow-hidden bg-gray-50" ref={containerRef}>
                    <div className="flex-1 flex justify-center items-center p-4 overflow-hidden">
                      <div
                        style={{
                          transform: `scale(${1 / renderScale})`,
                          transformOrigin: 'center center',
                          willChange: 'transform',
                          imageRendering: 'auto',
                        }}
                        className="[&_canvas]:!max-w-none [&_canvas]:!h-auto [&_canvas]:!image-rendering-auto"
                      >
                        <div className="border-2 border-gray-300 rounded-xl shadow-xl p-3 ring-1 ring-gray-200/50">
                          <Document
                            file={fileUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={<div className="p-8 text-center">Loading PDF...</div>}
                            className="flex justify-center items-center"
                            options={DOCUMENT_OPTIONS}
                            error={<div className="p-8 text-center text-red-600">Error loading PDF. Please try again.</div>}
                          >
                            <Page
                              pageNumber={pageNumber}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                              onLoadSuccess={onPageLoadSuccess}
                              scale={pdfScale * renderScale}
                              className="shadow-lg"
                              canvasBackground="white"
                              error={<div className="p-8 text-center text-red-600">Error rendering page.</div>}
                            />
                          </Document>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            {/* Resizable Handle - Improved Design */}
            <PanelResizeHandle className="w-1 bg-transparent hover:bg-gray-300/30 transition-colors cursor-col-resize flex items-center justify-center group">
              <div className="w-0.5 h-16 bg-gray-300/50 group-hover:bg-gray-400/70 rounded-full transition-all"></div>
            </PanelResizeHandle>

            {/* Questions - Right Side */}
            <Panel defaultSize={50} minSize={30} className="flex flex-col">
              <div className="bg-white flex flex-col h-full">
                {extracting ? (
                  <div className="text-center py-8 flex-1 flex items-center justify-center">
                    <div>
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Extracting questions from PDF...</p>
                      <p className="text-sm text-gray-500 mt-2">{Math.round(extractionProgress)}% complete</p>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="text-center py-8 flex-1 flex items-center justify-center">
                    <p className="text-gray-600">Loading PDF...</p>
                  </div>
                ) : (
                  <div 
                    className="flex-1 overflow-auto flex flex-col px-4 py-4"
                    style={{ fontSize: `${questionsScale * 16}px` }}
                  >
                    <div className="space-y-4">
                      {questions[pageNumber] && questions[pageNumber].length > 0 ? (
                        questions[pageNumber].map((q, idx) => {
                          const questionKey = `${pageNumber}-${idx}`
                          const selectedChoice = selectedAnswers[questionKey]
                          const hasAnswered = selectedChoice !== undefined
                          
                          // Helper to check if a choice is correct
                          const isChoiceCorrect = (choice) => {
                            if (!q.correctAnswer) return false
                            return (
                              choice.startsWith(q.correctAnswer + ')') || 
                              choice.startsWith(q.correctAnswer + '.') ||
                              choice.charAt(0) === q.correctAnswer ||
                              choice.trim().startsWith(q.correctAnswer.trim())
                            )
                          }
                          
                          // Helper to extract choice letter
                          const getChoiceLetter = (choice) => {
                            const match = choice.match(/^([A-Z])[\)\.]/)
                            return match ? match[1] : choice.charAt(0)
                          }
                          
                          return (
                            <div key={idx} className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                              <div className="mb-2">
                                <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                  {q.type?.toUpperCase() || 'QUESTION'}
                                </span>
                              </div>
                              <p className="font-medium text-gray-800 mb-3">{q.question || q}</p>
                              
                              {q.type === 'mcq' && q.choices && q.choices.length > 0 ? (
                                <div className="mt-3 space-y-2">
                                  <p className="text-sm font-semibold text-gray-700 mb-2">Select your answer:</p>
                                  <ul className="space-y-2">
                                    {q.choices.map((choice, choiceIdx) => {
                                      const choiceLetter = getChoiceLetter(choice)
                                      const isSelected = selectedChoice === choice
                                      const isCorrect = isChoiceCorrect(choice)
                                      const showFeedback = hasAnswered && (isSelected || isCorrect)
                                      
                                      let bgColor = 'bg-white'
                                      let borderColor = 'border-gray-200'
                                      let textColor = 'text-gray-800'
                                      
                                      if (hasAnswered) {
                                        if (isCorrect) {
                                          bgColor = 'bg-green-100'
                                          borderColor = 'border-green-400'
                                          textColor = 'text-green-900'
                                        } else if (isSelected && !isCorrect) {
                                          bgColor = 'bg-red-100'
                                          borderColor = 'border-red-400'
                                          textColor = 'text-red-900'
                                        }
                                      }
                                      
                                      return (
                                        <li key={choiceIdx}>
                                          <button
                                            onClick={() => {
                                              if (!hasAnswered) {
                                                setSelectedAnswers(prev => ({
                                                  ...prev,
                                                  [questionKey]: choice
                                                }))
                                              }
                                            }}
                                            disabled={hasAnswered}
                                            className={`w-full text-left p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                              hasAnswered 
                                                ? 'cursor-default' 
                                                : 'hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
                                            } ${bgColor} ${borderColor} ${textColor} ${
                                              isSelected ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                                            }`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium">{choice}</span>
                                              {showFeedback && (
                                                <span className="text-sm font-semibold">
                                                  {isCorrect ? '✓ Correct' : isSelected ? '✗ Wrong' : ''}
                                                </span>
                                              )}
                                            </div>
                                          </button>
                                        </li>
                                      )
                                    })}
                                  </ul>
                                  
                                  {hasAnswered && (
                                    <div className="mt-3 p-3 rounded-lg">
                                      {selectedChoice && isChoiceCorrect(selectedChoice) ? (
                                        <div className="bg-green-50 border border-green-200 rounded p-3">
                                          <p className="text-sm font-semibold text-green-800 mb-1">
                                            ✓ Correct! Well done!
                                          </p>
                                          {q.explanation && (
                                            <p className="text-sm text-green-700 mt-2">{q.explanation}</p>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="bg-red-50 border border-red-200 rounded p-3">
                                          <p className="text-sm font-semibold text-red-800 mb-1">
                                            ✗ Incorrect. The correct answer is: {q.correctAnswer}
                                          </p>
                                          {q.explanation && (
                                            <p className="text-sm text-red-700 mt-2">{q.explanation}</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {!hasAnswered && q.correctAnswer && (
                                    <div className="mt-2 text-xs text-gray-500 italic">
                                      Click on an answer to check your response
                                    </div>
                                  )}
                                </div>
                              ) : (
                                // Non-MCQ questions
                                <div className="mt-3">
                                  {q.explanation && (
                                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                                      <p className="text-sm font-semibold text-yellow-800 mb-1">Explanation:</p>
                                      <p className="text-sm text-yellow-900">{q.explanation}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          {extracting ? 'Processing...' : 'No questions found on this page'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          </PanelGroup>
        </div>

        {/* Floating Pagination at Bottom - Apple-style */}
        {numPages && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 px-6 py-3">
              <div className="flex items-center justify-between gap-6">
                <Button
                  onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                  disabled={pageNumber <= 1}
                  variant="outline"
                  size="sm"
                  className="disabled:opacity-50"
                >
                  ← Previous
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 font-medium">
                    Page {pageNumber} of {numPages}
                  </span>
                  {numPages > 10 && (
                    <Select
                      value={pageNumber.toString()}
                      onValueChange={(value) => setPageNumber(parseInt(value))}
                    >
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                          <SelectItem key={page} value={page.toString()}>
                            {page}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Button
                  onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                  disabled={pageNumber >= numPages}
                  variant="outline"
                  size="sm"
                  className="disabled:opacity-50"
                >
                  Next →
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default function DetailsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    }>
      <DetailsPageContent />
    </Suspense>
  )
}

