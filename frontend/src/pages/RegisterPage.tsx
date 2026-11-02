import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { Brain, Mail, Lock, User } from 'lucide-react'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { useState } from 'react'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be 72 characters or fewer'),
})
type Form = z.infer<typeof schema>

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) })
  const [loading, setLoading] = useState(false)
  const { token, setAuth } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToast()

  // Already logged in → skip the page entirely
  if (token) return <Navigate to="/chat" replace />

  const onSubmit = async (data: Form) => {
    setLoading(true)
    try {
      await authApi.register({ email: data.email, password: data.password, full_name: data.full_name })
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 409) {
        toast.error('That email is already registered. Try signing in instead.')
      } else {
        toast.error('Registration failed. Please try again.')
      }
      setLoading(false)
      return
    }

    // Registration succeeded — auto-login.
    try {
      const { access_token } = await authApi.login(data.email, data.password)
      const user = await authApi.me(access_token)
      setAuth(access_token, user)
      toast.success('Account created! Welcome to StudyMate AI.')
      navigate('/chat')
    } catch {
      // Registration worked but auto-login failed — send to login page so
      // the user doesn't see a confusing "Registration failed" message on retry.
      toast.success('Account created! Please sign in.')
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-4 glow">
            <Brain size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Create account</h1>
          <p className="text-text-muted text-sm mt-1">Start your AI study journey</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8 shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="relative">
              <label htmlFor="full_name" className="sr-only">Full name</label>
              <User size={16} className="absolute left-3 top-9 text-text-muted" />
              <Input id="full_name" label="Full name" placeholder="John Smith" className="pl-9"
                error={errors.full_name?.message} {...register('full_name')} />
            </div>
            <div className="relative">
              <label htmlFor="email" className="sr-only">Email</label>
              <Mail size={16} className="absolute left-3 top-9 text-text-muted" />
              <Input id="email" label="Email" type="email" placeholder="you@example.com" className="pl-9"
                error={errors.email?.message} {...register('email')} />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">Password</label>
              <Lock size={16} className="absolute left-3 top-9 text-text-muted" />
              <Input id="password" label="Password" type="password" placeholder="Min. 8 characters" className="pl-9"
                error={errors.password?.message} {...register('password')} />
            </div>
            <Button type="submit" loading={loading} className="w-full mt-1">Create account</Button>
          </form>
        </div>

        <p className="text-center text-sm text-text-muted mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:text-accent-hover font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
