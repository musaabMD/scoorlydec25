'use client'

import { UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Header() {
  return (
    <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative">
            <Sparkles className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Scoorly
            </span>
          </h1>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-gray-700 hover:text-blue-600 font-medium">
            Pricing
          </Link>
          <SignedOut>
            <SignInButton mode="modal">
              <Button size="lg">Get Started</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>
    </header>
  )
}
