'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Search, Pin, X } from 'lucide-react'

const categoryColors = {
  'Medical': 'bg-blue-50 border-blue-200 hover:border-blue-300',
  'Nursing': 'bg-pink-50 border-pink-200 hover:border-pink-300',
  'Dental': 'bg-cyan-50 border-cyan-200 hover:border-cyan-300',
  'IT': 'bg-green-50 border-green-200 hover:border-green-300',
  'Law': 'bg-amber-50 border-amber-200 hover:border-amber-300',
  'Finance': 'bg-purple-50 border-purple-200 hover:border-purple-300',
  'Pharmacy': 'bg-rose-50 border-rose-200 hover:border-rose-300',
}

const categoryBadgeColors = {
  'Medical': 'bg-blue-100 text-blue-700',
  'Nursing': 'bg-pink-100 text-pink-700',
  'Dental': 'bg-cyan-100 text-cyan-700',
  'IT': 'bg-green-100 text-green-700',
  'Law': 'bg-amber-100 text-amber-700',
  'Finance': 'bg-purple-100 text-purple-700',
  'Pharmacy': 'bg-rose-100 text-rose-700',
}

const examsData = [
  // Medical - USA
  { id: 'usmle-step1', name: 'USMLE Step 1', country: 'US', flag: '🇺🇸', category: 'Medical', description: 'United States Medical Licensing Examination Step 1' },
  { id: 'usmle-step2', name: 'USMLE Step 2 CK', country: 'US', flag: '🇺🇸', category: 'Medical', description: 'Clinical Knowledge examination' },
  { id: 'usmle-step3', name: 'USMLE Step 3', country: 'US', flag: '🇺🇸', category: 'Medical', description: 'Final licensing examination' },
  { id: 'comlex', name: 'COMLEX-USA', country: 'US', flag: '🇺🇸', category: 'Medical', description: 'Osteopathic medical licensing examination' },
  { id: 'nclex-rn', name: 'NCLEX-RN', country: 'US', flag: '🇺🇸', category: 'Nursing', description: 'National Council Licensure Examination for RNs' },
  { id: 'nclex-pn', name: 'NCLEX-PN', country: 'US', flag: '🇺🇸', category: 'Nursing', description: 'National Council Licensure Examination for PNs' },
  
  // Medical - Saudi Arabia
  { id: 'smle', name: 'SMLE', country: 'SA', flag: '🇸🇦', category: 'Medical', description: 'Saudi Medical Licensing Examination' },
  { id: 'sdle', name: 'SDLE', country: 'SA', flag: '🇸🇦', category: 'Dental', description: 'Saudi Dental Licensing Examination' },
  { id: 'snle', name: 'SNLE', country: 'SA', flag: '🇸🇦', category: 'Nursing', description: 'Saudi Nursing Licensing Examination' },
  
  // Medical - UK
  { id: 'plab', name: 'PLAB', country: 'GB', flag: '🇬🇧', category: 'Medical', description: 'Professional and Linguistic Assessments Board' },
  { id: 'mrcp', name: 'MRCP', country: 'GB', flag: '🇬🇧', category: 'Medical', description: 'Membership of the Royal College of Physicians' },
  { id: 'mrcs', name: 'MRCS', country: 'GB', flag: '🇬🇧', category: 'Medical', description: 'Membership of the Royal College of Surgeons' },
  
  // Medical - Canada
  { id: 'mccqe1', name: 'MCCQE Part 1', country: 'CA', flag: '🇨🇦', category: 'Medical', description: 'Medical Council of Canada Qualifying Examination' },
  { id: 'mccqe2', name: 'MCCQE Part 2', country: 'CA', flag: '🇨🇦', category: 'Medical', description: 'Clinical examination component' },
  
  // Medical - Australia
  { id: 'amc', name: 'AMC CAT', country: 'AU', flag: '🇦🇺', category: 'Medical', description: 'Australian Medical Council examination' },
  
  // Medical - UAE
  { id: 'dha', name: 'DHA', country: 'AE', flag: '🇦🇪', category: 'Medical', description: 'Dubai Health Authority examination' },
  { id: 'haad', name: 'HAAD/DOH', country: 'AE', flag: '🇦🇪', category: 'Medical', description: 'Abu Dhabi Health Authority examination' },
  { id: 'moh-uae', name: 'MOH UAE', country: 'AE', flag: '🇦🇪', category: 'Medical', description: 'Ministry of Health UAE examination' },
  
  // Medical - India
  { id: 'neet-pg', name: 'NEET PG', country: 'IN', flag: '🇮🇳', category: 'Medical', description: 'National Eligibility cum Entrance Test for PG' },
  { id: 'neet-ug', name: 'NEET UG', country: 'IN', flag: '🇮🇳', category: 'Medical', description: 'National Eligibility cum Entrance Test for UG' },
  { id: 'fmge', name: 'FMGE', country: 'IN', flag: '🇮🇳', category: 'Medical', description: 'Foreign Medical Graduate Examination' },
  
  // Medical - Germany
  { id: 'fsp', name: 'FSP Medizin', country: 'DE', flag: '🇩🇪', category: 'Medical', description: 'Fachsprachprüfung for medical professionals' },
  { id: 'kenntnisprufung', name: 'Kenntnisprüfung', country: 'DE', flag: '🇩🇪', category: 'Medical', description: 'Knowledge examination for doctors' },
  
  // Other Medical
  { id: 'mcat', name: 'MCAT', country: 'US', flag: '🇺🇸', category: 'Medical', description: 'Medical College Admission Test' },
  { id: 'pance', name: 'PANCE', country: 'US', flag: '🇺🇸', category: 'Medical', description: 'Physician Assistant National Certifying Exam' },
  
  // IT & Tech
  { id: 'ccna', name: 'CCNA', country: 'US', flag: '🌐', category: 'IT', description: 'Cisco Certified Network Associate' },
  { id: 'ccnp', name: 'CCNP', country: 'US', flag: '🌐', category: 'IT', description: 'Cisco Certified Network Professional' },
  { id: 'aws-saa', name: 'AWS SAA', country: 'US', flag: '🌐', category: 'IT', description: 'AWS Solutions Architect Associate' },
  { id: 'aws-sap', name: 'AWS SAP', country: 'US', flag: '🌐', category: 'IT', description: 'AWS Solutions Architect Professional' },
  { id: 'az-900', name: 'AZ-900', country: 'US', flag: '🌐', category: 'IT', description: 'Microsoft Azure Fundamentals' },
  { id: 'comptia-a', name: 'CompTIA A+', country: 'US', flag: '🌐', category: 'IT', description: 'IT operational roles certification' },
  { id: 'comptia-n', name: 'CompTIA Network+', country: 'US', flag: '🌐', category: 'IT', description: 'Networking certification' },
  { id: 'comptia-s', name: 'CompTIA Security+', country: 'US', flag: '🌐', category: 'IT', description: 'Cybersecurity certification' },
  
  // Law
  { id: 'bar-exam', name: 'Bar Exam', country: 'US', flag: '🇺🇸', category: 'Law', description: 'US Bar Examination' },
  { id: 'lsat', name: 'LSAT', country: 'US', flag: '🇺🇸', category: 'Law', description: 'Law School Admission Test' },
  { id: 'sqe', name: 'SQE', country: 'GB', flag: '🇬🇧', category: 'Law', description: 'Solicitors Qualifying Examination' },
  
  // Finance
  { id: 'cfa-l1', name: 'CFA Level 1', country: 'US', flag: '🌐', category: 'Finance', description: 'Chartered Financial Analyst Level 1' },
  { id: 'cfa-l2', name: 'CFA Level 2', country: 'US', flag: '🌐', category: 'Finance', description: 'Chartered Financial Analyst Level 2' },
  { id: 'cfa-l3', name: 'CFA Level 3', country: 'US', flag: '🌐', category: 'Finance', description: 'Chartered Financial Analyst Level 3' },
  { id: 'cpa', name: 'CPA', country: 'US', flag: '🇺🇸', category: 'Finance', description: 'Certified Public Accountant' },
  { id: 'frm', name: 'FRM', country: 'US', flag: '🌐', category: 'Finance', description: 'Financial Risk Manager' },
  
  // Pharmacy
  { id: 'naplex', name: 'NAPLEX', country: 'US', flag: '🇺🇸', category: 'Pharmacy', description: 'North American Pharmacist Licensure Examination' },
  { id: 'fpgec', name: 'FPGEC', country: 'US', flag: '🇺🇸', category: 'Pharmacy', description: 'Foreign Pharmacy Graduate Equivalency' },
]

const categories = ['All', 'Medical', 'Nursing', 'Dental', 'IT', 'Law', 'Finance', 'Pharmacy']

export default function ExamsPage() {
  const { isSignedIn } = useUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [pinnedExams, setPinnedExams] = useState([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pinnedExams')
      if (saved) {
        setPinnedExams(JSON.parse(saved))
      }
    }
  }, [])

  const togglePin = (examId) => {
    setPinnedExams(prev => {
      const newPinned = prev.includes(examId)
        ? prev.filter(id => id !== examId)
        : [...prev, examId]
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('pinnedExams', JSON.stringify(newPinned))
      }
      return newPinned
    })
  }

  const filteredExams = useMemo(() => {
    return examsData.filter(exam => {
      const matchesSearch = exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           exam.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'All' || exam.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  const pinnedExamsList = useMemo(() => {
    return examsData.filter(exam => pinnedExams.includes(exam.id))
  }, [pinnedExams])

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Browse Exams</h1>
          <p className="text-gray-600">Find and save exams you&apos;re preparing for</p>
        </div>

        {/* My Exams (Pinned) */}
        {mounted && pinnedExamsList.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Pin className="h-4 w-4 fill-current" />
              My Exams
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pinnedExamsList.map(exam => (
                <div
                  key={exam.id}
                  className={`border-2 rounded-xl p-5 transition-all ${categoryColors[exam.category] || 'bg-gray-50 border-gray-200'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{exam.flag}</span>
                      <div>
                        <h3 className="font-bold text-lg">{exam.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${categoryBadgeColors[exam.category] || 'bg-gray-100 text-gray-600'}`}>
                          {exam.category}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => togglePin(exam.id)}
                      className="p-1.5 rounded-lg hover:bg-black/5 text-gray-900"
                      title="Unpin exam"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">{exam.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6 flex justify-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search exams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 justify-center">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-black text-white'
                  : 'bg-white border hover:bg-gray-50 text-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-500 mb-4 text-center">
          {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''} found
        </p>

        {/* Exams Grid - 2 per row on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredExams.map(exam => {
            const isPinned = pinnedExams.includes(exam.id)
            return (
              <div
                key={exam.id}
                className={`border-2 rounded-xl p-5 transition-all ${categoryColors[exam.category] || 'bg-gray-50 border-gray-200'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{exam.flag}</span>
                    <div>
                      <h3 className="font-bold text-lg">{exam.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${categoryBadgeColors[exam.category] || 'bg-gray-100 text-gray-600'}`}>
                        {exam.category}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePin(exam.id)}
                    className={`p-1.5 rounded-lg hover:bg-black/5 ${isPinned ? 'text-black' : 'text-gray-400'}`}
                    title={isPinned ? 'Unpin exam' : 'Pin to My Exams'}
                  >
                    <Pin className={`h-4 w-4 ${isPinned ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-3">{exam.description}</p>
              </div>
            )
          })}
        </div>

        {filteredExams.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No exams found matching your criteria</p>
          </div>
        )}
      </div>
    </main>
  )
}
