'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SignedIn, SignedOut, useUser, SignInButton } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { FileText, Trash2, BookOpen, MessageSquare, FileQuestion, Layers, Users, StickyNote, Flag, TrendingDown, ClipboardCheck, FileCheck, Sparkles, BarChart3, RotateCcw, CheckCircle2, XCircle, X } from 'lucide-react'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'

export default function Home() {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [currentExam, setCurrentExam] = useState(0)
  const { isSignedIn } = useUser()
  const router = useRouter()

  const exams = ['USMLE', 'SMLE', 'CCNA']

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') {
      if (!isSignedIn) {
        setPendingFile(file)
        setShowLoginPrompt(true)
        return
      }
      await uploadFile(file)
    }
  }, [isSignedIn, uploadFile])

  const handleFileInput = useCallback(async (e) => {
    const file = e.target.files[0]
    if (file && file.type === 'application/pdf') {
      if (!isSignedIn) {
        setPendingFile(file)
        setShowLoginPrompt(true)
        return
      }
      await uploadFile(file)
    }
  }, [isSignedIn, uploadFile])

  // Fetch uploaded files from Supabase storage
  const fetchUploadedFiles = useCallback(async () => {
    try {
      setLoadingFiles(true)
      const { data, error } = await supabase.storage
        .from('uploads')
        .list('', {
          limit: 100,
          offset: 0,
        })

      if (error) {
        console.error('Error fetching files:', error)
        setUploadedFiles([])
        return
      }

      if (!data || data.length === 0) {
        setUploadedFiles([])
        return
      }

      const pdfFiles = data.filter(file => file.name.toLowerCase().endsWith('.pdf'))
      const sortedData = [...pdfFiles].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : (a.updated_at ? new Date(a.updated_at).getTime() : 0)
        const timeB = b.created_at ? new Date(b.created_at).getTime() : (b.updated_at ? new Date(b.updated_at).getTime() : 0)
        return timeB - timeA
      })

      const filesWithUrls = await Promise.all(
        sortedData.map(async (file) => {
          const { data: urlData } = supabase.storage
            .from('uploads')
            .getPublicUrl(file.name)
          
          let displayName = file.name
          try {
            const parts = file.name.split('_')
            const ext = file.name.split('.').pop()
            if (parts.length >= 3) {
              const nameParts = parts.slice(0, -2)
              if (nameParts.length > 0) {
                displayName = nameParts.join('_') + '.' + ext
              }
            }
          } catch (e) {
            displayName = file.name
          }
          
          return {
            ...file,
            publicUrl: urlData.publicUrl,
            displayName: displayName
          }
        })
      )

      setUploadedFiles(filesWithUrls)
    } catch (error) {
      console.error('Error fetching files:', error)
      setUploadedFiles([])
    } finally {
      setLoadingFiles(false)
    }
  }, [])

  const uploadFile = useCallback(async (file) => {
    setUploading(true)
    setProgress(0)

    try {
      const fileExt = file.name.split('.').pop()
      const originalFileName = file.name.replace(/\.[^/.]+$/, '')
      const cleanName = originalFileName
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 50)
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
      const randomId = Math.random().toString(36).substring(2, 8)
      const timestamp = Date.now()
      const fileName = cleanName ? `${cleanName}_${randomId}_${timestamp}.${fileExt}` : `${randomId}_${timestamp}.${fileExt}`
      const filePath = fileName

      const uploadPromise = supabase.storage
        .from('uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf'
        })

      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev
          return prev + 10
        })
      }, 200)

      const { data, error } = await uploadPromise
      clearInterval(progressInterval)
      setProgress(100)

      if (error) {
        throw error
      }

      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath)

      fetchUploadedFiles()
      router.push(`/details?file=${encodeURIComponent(filePath)}&url=${encodeURIComponent(urlData.publicUrl)}`)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Error uploading file: ' + (error.message || 'Unknown error'))
      setUploading(false)
      setProgress(0)
    }
  }, [router, fetchUploadedFiles])

  useEffect(() => {
    fetchUploadedFiles()
  }, [fetchUploadedFiles])

  // Rotate exam names
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExam((prev) => (prev + 1) % exams.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [exams.length])

  // Handle pending file after user signs in
  useEffect(() => {
    if (isSignedIn && pendingFile && showLoginPrompt) {
      const file = pendingFile
      setShowLoginPrompt(false)
      setPendingFile(null)
      // Small delay to ensure modal closes before upload starts
      setTimeout(() => {
        uploadFile(file).catch(console.error)
      }, 100)
    }
  }, [isSignedIn, pendingFile, showLoginPrompt, uploadFile])

  const deleteFile = async (fileName) => {
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) {
      return
    }

    try {
      const { error } = await supabase.storage
        .from('uploads')
        .remove([fileName])

      if (error) {
        throw error
      }

      fetchUploadedFiles()
    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Error deleting file: ' + error.message)
    }
  }


  const features = [
    { icon: BookOpen, title: 'Features Library', description: 'Comprehensive library like Amboss with thousands of exam resources' },
    { icon: MessageSquare, title: 'Chat', description: 'Interactive chat for questions and explanations' },
    { icon: FileQuestion, title: 'MCQ Generated', description: 'Automatically generate multiple choice questions from your PDFs' },
    { icon: Layers, title: 'Flashcards Anki-like', description: 'Create and study with Anki-style flashcards' },
    { icon: Users, title: 'Community', description: 'Connect with other students and share resources' },
    { icon: StickyNote, title: 'HY Notes', description: 'High-yield notes for quick review' },
    { icon: Flag, title: 'Flag', description: 'Flag important questions and topics' },
    { icon: TrendingDown, title: 'Weak Subject', description: 'Identify and focus on your weak subjects' },
    { icon: ClipboardCheck, title: 'Exam Them', description: 'Practice with exam-style questions' },
    { icon: FileCheck, title: 'Explanation Summary', description: 'Get detailed explanations and summaries' },
    { icon: RotateCcw, title: 'Review Mode', description: 'Review flagged, correct, and incorrect answers' },
    { icon: Sparkles, title: 'Thousands of Pages', description: 'Access thousands of pages for specific exams' },
  ]

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowLoginPrompt(false)
                setPendingFile(null)
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Sign in to upload files
              </h2>
              <p className="text-gray-600 mb-6">
                Please sign in or create an account to upload and process your PDF files.
              </p>
              <SignInButton mode="modal">
                <Button size="lg" className="w-full">
                  Sign In or Sign Up
                </Button>
              </SignInButton>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 flex items-center justify-center gap-4 flex-wrap">
            <span>Prep for</span>
            <span 
              key={currentExam}
              className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-lg font-bold text-4xl md:text-5xl shadow-lg transform transition-all duration-500 ease-in-out"
              style={{
                animation: 'fadeIn 0.5s ease-in-out'
              }}
            >
              {exams[currentExam]}
            </span>
          </h1>
        </div>

        {/* Upload Area */}
        <div className="max-w-2xl mx-auto mb-16">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50 scale-105'
                : 'border-gray-300 bg-gray-50 hover:border-blue-400'
            } ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && document.getElementById('file-input')?.click()}
          >
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileInput}
              className="hidden"
              id="file-input"
              disabled={uploading}
            />
            
            {uploading ? (
              <div className="space-y-4">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-gray-600 font-medium">Uploading... {Math.round(progress)}%</p>
              </div>
            ) : (
              <>
                <div className="mx-auto h-20 w-20 text-blue-600 mb-6">
                  <svg
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    className="w-full h-full"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-2xl font-semibold text-gray-800 mb-2">
                  Drop your PDF file here
                </p>
                <p className="text-gray-500 mb-4">
                  or click to browse • Supports all PDF formats
                </p>
              </>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Powerful Features for Exam Success
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="flex flex-col">
                  <div className="space-y-2 text-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
                    <p className="text-base text-gray-600">{feature.description}</p>
                  </div>
                  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-auto">
                    <p className="text-sm text-gray-400">Image placeholder</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Uploaded Files Section */}
        <SignedIn>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Uploaded Files</h2>
            {loadingFiles ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-500">Loading files...</p>
              </div>
            ) : uploadedFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No files uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => {
                        router.push(`/details?file=${encodeURIComponent(file.name)}&url=${encodeURIComponent(file.publicUrl)}`)
                      }}
                    >
                      <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate" title={file.displayName || file.name}>
                          {file.displayName || file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {file.metadata?.size ? `${(file.metadata.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                          {file.created_at && ` • ${new Date(file.created_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteFile(file.name)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 text-red-600 hover:bg-red-50 rounded transition-all"
                      title="Delete file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SignedIn>
      </section>
    </main>
  )
}
