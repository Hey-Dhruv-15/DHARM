import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DharmLogo } from '../../components/common/DharmLogo';
import { Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('hey.dhruvs20@gmail.com');
  const [password, setPassword] = useState('Dharam@123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const res = await login(email, password);
    setIsLoading(false);

    if (res.success && res.user) {
      if (res.user.role === 'OWNER') navigate('/owner/dashboard');
      else if (res.user.role === 'VENDOR') navigate('/vendor/dashboard');
      else if (res.user.role === 'CUSTOMER') navigate('/customer/dashboard');
    } else {
      setErrorMessage(res.error || 'Invalid credentials. Password is Dharam@123');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row font-sans selection:bg-[#5c4cf6] selection:text-white">
      {/* LEFT COLUMN: Clean Soft Lilac/Lavender Background with Logo and Floating Card */}
      <div className="w-full lg:w-1/2 bg-[#f8f7fe] p-8 lg:p-14 flex flex-col justify-between relative overflow-hidden">
        {/* Top-Left Brand Logo & Tagline */}
        <div className="flex items-start">
          <DharmLogo size="md" />
        </div>

        {/* Center Floating Illustration Card */}
        <div className="my-auto py-10 flex justify-center items-center">
          <div className="w-full max-w-lg bg-white rounded-3xl p-3 shadow-[0_20px_50px_rgba(92,76,246,0.10)] border border-white">
            <div className="rounded-2xl overflow-hidden bg-slate-50">
              <img
                src="/dharm_logistics_hero.jpg"
                alt="Logistics Coordination"
                className="w-full h-auto object-cover max-h-[340px]"
              />
            </div>
          </div>
        </div>

        {/* Bottom Spacer / Clean Margin */}
        <div className="hidden lg:block h-6" />
      </div>

      {/* RIGHT COLUMN: Pure White Background with Focused Fields Only */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col justify-between p-8 sm:p-12 lg:p-16">
        <div className="hidden lg:block h-8" />

        {/* Centered Minimal Form */}
        <div className="w-full max-w-xs sm:max-w-sm mx-auto my-auto">
          {/* Welcome Heading */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-8">
            Welcome
          </h1>

          {/* Error Message if invalid credentials */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Form with ONLY the essential fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Address Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="name@company.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#5c4cf6] focus:ring-2 focus:ring-[#5c4cf6]/20 transition"
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => alert('Demo account password is: Dharam@123\n\nAccounts:\n• Owner: hey.dhruvs20@gmail.com\n• Vendor: Sinugunshetty@gmail.com\n• Customer: anusha.s2028@gmail.com')}
                  className="text-xs font-medium text-[#5c4cf6] hover:underline cursor-pointer"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#5c4cf6] focus:ring-2 focus:ring-[#5c4cf6]/20 transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Solid Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-[#5c4cf6] hover:bg-[#4d3de6] active:bg-[#4333dc] shadow-sm transition-all flex items-center justify-center cursor-pointer disabled:opacity-70"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Subtext below button matching screenshot */}
          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => alert('Demo Accounts:\n\n• Owner: hey.dhruvs20@gmail.com\n• Vendor: Sinugunshetty@gmail.com\n• Customer: anusha.s2028@gmail.com\nPassword: Dharam@123')}
              className="font-semibold text-[#5c4cf6] hover:underline cursor-pointer"
            >
              Join DHARM
            </button>
          </div>
        </div>

        {/* Clean Bottom Spacer */}
        <div className="hidden lg:block h-8" />
      </div>
    </div>
  );
};
