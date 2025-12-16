'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { FileText, Trash2, FileQuestion, Upload, FileCheck, BookOpen } from 'lucide-react'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import PDFThumbnail from './PDFThumbnail'

// Component to format dates without hydration issues
function FormattedDate({ dateString }) {
  if (!dateString) return null
  
  const date = new Date(dateString)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  const formatted = `${month}/${day}/${year}`
  
  return <span>{formatted}</span>
}

function DashboardContent() {
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [questionCounts, setQuestionCounts] = useState({})
  const [pageCounts, setPageCounts] = useState({})
  const [mounted, setMounted] = useState(false)
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()

  // Track client-side mount to prevent hydration mismatches
  useEffect(() => {
    setMounted(true)
  }, [])

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
          
          // Get question counts from localStorage if available
          const storageKey = `questions_${file.name}`
          let mcqCount = 0
          let totalQuestions = 0
          try {
            if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
              const stored = localStorage.getItem(storageKey)
              if (stored) {
                const questions = JSON.parse(stored)
                const allQuestions = Object.values(questions).flat()
                totalQuestions = allQuestions.length
                mcqCount = allQuestions.filter(q => q.type === 'mcq').length
              }
            }
          } catch (e) {
            // Ignore errors
          }
          
          return {
            ...file,
            publicUrl: urlData.publicUrl,
            displayName: displayName,
            mcqCount: mcqCount,
            totalQuestions: totalQuestions
          }
        })
      )

      setUploadedFiles(filesWithUrls)
      
      // Set question counts
      const counts = {}
      filesWithUrls.forEach(file => {
        counts[file.name] = file.mcqCount
      })
      setQuestionCounts(counts)
    } catch (error) {
      console.error('Error fetching files:', error)
      setUploadedFiles([])
    } finally {
      setLoadingFiles(false)
    }
  }, [])

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/')
      return
    }
    if (isSignedIn) {
      fetchUploadedFiles()
    }
  }, [isLoaded, isSignedIn, fetchUploadedFiles, router])

  // Listen for storage changes to update MCQ counts
  useEffect(() => {
    if (!isSignedIn) return
    
    const handleStorageChange = () => {
      setUploadedFiles(prev => prev.map(file => {
        const storageKey = `questions_${file.name}`
        try {
          const stored = localStorage.getItem(storageKey)
          if (stored) {
            const questions = JSON.parse(stored)
            const mcqCount = Object.values(questions).flat().filter(q => q.type === 'mcq').length
            return { ...file, mcqCount }
          }
        } catch (e) {
          // Ignore errors
        }
        return file
      }))
    }

    window.addEventListener('storage', handleStorageChange)
    // Also check on focus (when user returns to tab)
    window.addEventListener('focus', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleStorageChange)
    }
  }, [isSignedIn])

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

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </main>
    )
  }

  if (!isSignedIn) {
    return null
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Manage your uploaded PDF files and extracted questions</p>
        </div>

        {loadingFiles ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-500">Loading files...</p>
            </CardContent>
          </Card>
        ) : uploadedFiles.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto h-20 w-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                <Upload className="h-10 w-10 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">No files uploaded yet</CardTitle>
              <CardDescription className="text-base">
                Get started by uploading your first PDF file. We&apos;ll extract questions and help you prepare for your exams.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button size="lg" onClick={() => router.push('/')} className="gap-2">
                <Upload className="h-5 w-5" />
                Upload PDF
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {uploadedFiles.map((file) => (
                <Card
                  key={file.name}
                  className="overflow-hidden hover:shadow-lg transition-all group cursor-pointer border-0"
                  onClick={() => {
                    router.push(`/details?file=${encodeURIComponent(file.name)}&url=${encodeURIComponent(file.publicUrl)}`)
                  }}
                >
                {/* Thumbnail */}
                <div className="h-56 bg-white relative overflow-hidden">
                  {mounted ? (
                    <PDFThumbnail 
                      fileUrl={file.publicUrl} 
                      onLoadSuccess={(numPages) => {
                        setPageCounts(prev => ({ ...prev, [file.name]: numPages }))
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <div className="animate-pulse bg-gray-200 w-32 h-40 rounded"></div>
                    </div>
                  )}
                  
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-2">
                    {file.totalQuestions > 0 && (
                      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-lg backdrop-blur-sm text-xs">
                        <FileQuestion className="h-3.5 w-3.5" />
                        <span className="font-bold">{file.totalQuestions}</span>
                        <span>Questions</span>
                      </div>
                    )}
                    {file.mcqCount > 0 && (
                      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-lg backdrop-blur-sm text-xs">
                        <FileCheck className="h-3.5 w-3.5" />
                        <span className="font-bold">{file.mcqCount}</span>
                        <span>MCQs</span>
                      </div>
                    )}
                  </div>
                  
                  {mounted && pageCounts[file.name] && (
                    <div className="absolute top-2 right-2 bg-black/60 text-white px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-lg backdrop-blur-sm text-xs">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span className="font-bold">{pageCounts[file.name]}</span>
                      <span>Pages</span>
                    </div>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteFile(file.name)
                    }}
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg z-10"
                    title="Delete file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                {/* File Info */}
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 truncate text-sm" title={file.displayName || file.name}>
                    {file.displayName || file.name}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {file.metadata?.size ? `${(file.metadata.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                    </span>
                    {file.created_at && (
                      <FormattedDate dateString={file.created_at} />
                    )}
                  </div>
                </CardContent>
            </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default function Dashboard() {
  return <DashboardContent />
}
