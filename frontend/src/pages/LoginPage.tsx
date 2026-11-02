import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { Brain, Mail, Lock } from 'lucide-react'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type Form = z.infer<typeof schema>

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  })
  const [loading, setLoading] = useState(false)
  const { token, setAuth } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToast()

  // Already logged in → go straight to app
  if (token) return <Navigate to="/chat" replace />

  const onSubmit = async (data: Form) => {
    setLoading(true)
    try {
      const { access_token } = await authApi.login(data.email, data.password)
      const user = await authApi.me(access_token)
      setAuth(access_token, user)
      navigate('/chat')
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401) {
        toast.error('Incorrect email or password')
      } else if (!status) {
        toast.error('Cannot reach the server. Is the backend running?')
      } else {
        toast.error('Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-4 glow">
            <Brain size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
          <p className="text-text-muted text-sm mt-1">Sign in to your StudyMate AI account</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-9 text-text-muted" />
              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                className="pl-9"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-9 text-text-muted" />
              <Input
                id="password"
                label="Password"
                type="password"
                placeholder="••••••••"
                className="pl-9"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>
            <Button type="submit" loading={loading} className="w-full mt-1">
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-text-muted mt-5">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent hover:text-accent-hover font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
