'use client'

import { UserButton, useUser, SignUpButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Header() {
  const { isSignedIn, isLoaded } = useUser()

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          <span className="text-xl font-bold">Scoorly</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/exams" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Exams
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Pricing
          </Link>
        </nav>
        
        <div className="flex items-center gap-3">
          {isLoaded && isSignedIn ? (
            <>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  Dashboard
                </Button>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
              <Button size="sm">
                Get Started
              </Button>
            </SignUpButton>
          )}
        </div>
      </div>
    </header>
  )
}
