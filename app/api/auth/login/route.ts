import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user from database
    const { data: user, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (dbError || !user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Verify password (plain text comparison for development)
    // For production, use bcrypt: await bcrypt.compare(password, user.password_hash)
    if (password !== user.password_hash) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Return user data (excluding sensitive information)
    const userData = {
      id: user.id,
      username: user.username,
      role: user.role,
      staff_code: user.staff_code,
      can_edit_bills: user.can_edit_bills,
      can_edit_stock: user.can_edit_stock,
      can_authorize_nongst: user.can_authorize_nongst,
    }

    return NextResponse.json({ user: userData }, { status: 200 })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

