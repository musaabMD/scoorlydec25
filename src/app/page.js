'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, SignUpButton } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { 
  Brain, FileQuestion, Layers, Target, MessageSquare, RotateCcw, 
  X, FileText, Upload, ArrowRight, Sparkles
} from 'lucide-react'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'

export default function Home() {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [currentExam, setCurrentExam] = useState(0)
  const [mounted, setMounted] = useState(false)
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()

  const exams = ['USMLE', 'SMLE', 'CCNA', 'MCAT', 'NCLEX']

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

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath)

      router.push(`/details?file=${encodeURIComponent(filePath)}&url=${encodeURIComponent(urlData.publicUrl)}`)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Error uploading file: ' + (error.message || 'Unknown error'))
      setUploading(false)
      setProgress(0)
    }
  }, [router])

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

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isLoaded && isSignedIn && mounted) {
      router.push('/dashboard')
    }
  }, [isLoaded, isSignedIn, mounted, router])

  useEffect(() => {
    if (!mounted) return
    const interval = setInterval(() => {
      setCurrentExam((prev) => (prev + 1) % exams.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [mounted, exams.length])

  useEffect(() => {
    if (isSignedIn && pendingFile && showLoginPrompt) {
      const file = pendingFile
      setShowLoginPrompt(false)
      setPendingFile(null)
      setTimeout(() => {
        uploadFile(file).catch(console.error)
      }, 100)
    }
  }, [isSignedIn, pendingFile, showLoginPrompt, uploadFile])

  const features = [
    { 
      icon: Brain, 
      title: 'AI Question Extraction', 
      description: 'Upload any PDF and our AI instantly extracts MCQs, identifies correct answers, and creates study materials.'
    },
    { 
      icon: FileQuestion, 
      title: 'Smart MCQ Practice', 
      description: 'Practice with auto-generated multiple choice questions. Get instant feedback and explanations.'
    },
    { 
      icon: Layers, 
      title: 'Anki-Style Flashcards', 
      description: 'Convert your notes into spaced repetition flashcards. Master concepts with proven techniques.'
    },
    { 
      icon: Target, 
      title: 'Weakness Analysis', 
      description: 'AI identifies your weak areas and creates personalized study plans to improve.'
    },
    { 
      icon: MessageSquare, 
      title: 'AI Study Assistant', 
      description: 'Chat with AI about any topic. Get explanations and deepen your understanding.'
    },
    { 
      icon: RotateCcw, 
      title: 'Spaced Review', 
      description: 'Review flagged questions and difficult topics with intelligent scheduling.'
    },
  ]

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-6 relative border">
            <button
              onClick={() => {
                setShowLoginPrompt(false)
                setPendingFile(null)
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-center">
              <div className="mx-auto h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                Create your free account
              </h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Sign up to upload PDFs and extract questions with AI.
              </p>
              <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                <Button className="w-full" onClick={() => setShowLoginPrompt(false)}>
                  Get Started
                </Button>
              </SignUpButton>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 pt-20 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Ace Your{' '}
            <span className="inline-block px-3 py-1 bg-primary text-primary-foreground rounded-lg">
              {mounted ? exams[currentExam] : exams[0]}
            </span>
            {' '}Exam
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload any study material and let AI extract MCQs, create flashcards, and build personalized practice tests.
          </p>
        </div>

        {/* Upload Area */}
        <div className="max-w-2xl mx-auto">
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
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
                <div className="w-full max-w-xs mx-auto bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-muted-foreground">Uploading... {Math.round(progress)}%</p>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  Drop your PDF here
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Powerful Features for Exam Success
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="flex flex-col">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-semibold mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
                  </div>
                  <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center mt-auto">
                    <Icon className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Ace Your Exam?
          </h2>
          <p className="text-muted-foreground mb-8">
            Start your free trial today.
          </p>
          {!isSignedIn && (
            <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
              <Button size="lg">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </SignUpButton>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">Scoorly</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="/pricing" className="hover:text-foreground">Pricing</a>
              <a href="mailto:support@scoorly.com" className="hover:text-foreground">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Scoorly
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
