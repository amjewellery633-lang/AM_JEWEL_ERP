'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

interface LoginFormProps {
  onLogin: (username: string, role: 'admin' | 'staff') => void
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Authenticate with Supabase
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Store user data in sessionStorage for now (can be improved with proper session management)
      const userData = {
        id: data.user.id,
        username: data.user.username,
        role: data.user.role,
        staff_code: data.user.staff_code,
      }
      sessionStorage.setItem('user', JSON.stringify(userData))

      // Also store in Supabase session if needed
      const supabase = createClient()
      // Note: For custom auth, you might want to use a different approach
      // This is a simplified version

      onLogin(userData.username, userData.role as 'admin' | 'staff')
      router.push('/dashboard/sales-billing')
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#fdf8f4] via-white to-[#f3ede7] flex items-center justify-center px-4 py-12 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-24 -right-10 h-64 w-64 rounded-full bg-[#f4c27f]/40 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-[#c18e4a]/30 blur-3xl" />
      </div>
      <Card className="relative w-full max-w-xl border border-[#f0d7be] shadow-2xl shadow-[#b5803d]/20">
        <div className="grid gap-8 p-10">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-4 border-b border-[#f0d7be] pb-8">
            <div className="w-20 h-20 rounded-full bg-white shadow-inner shadow-[#e2b178]/40 flex items-center justify-center ring-1 ring-[#f0d7be]">
              <Image
                src="/Logo.png"
                alt="AM JEWELLERY Logo"
                width={70}
                height={70}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#b5803d]/80 font-semibold">
                AM JEWELLERY
              </p>
              <h1 className="text-3xl font-bold text-[#492a11] mt-1">Jewelry ERP</h1>
              <p className="text-base text-[#7a6756]">Management System Suite</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="text-sm font-semibold text-[#6b563f] mb-2 block">
                Username
              </label>
              <Input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-semibold text-[#6b563f] mb-2 block">
                Password
              </label>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50/80 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c37b27] hover:bg-[#a6661d] text-white font-semibold py-2 mt-6 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          {/* Info */}
          
        </div>
      </Card>
    </div>
  )
}
