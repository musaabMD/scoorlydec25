'use client'

import { PricingTable } from '@clerk/nextjs'
import Header from '@/components/Header'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600">Select the perfect plan for your exam preparation</p>
        </div>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <PricingTable />
        </div>
      </div>
    </div>
  )
}
