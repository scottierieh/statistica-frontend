'use client';

import React from 'react';
import {
  LogIn,
  Key,
  Mail,
  HelpCircle,
  BookOpen,
  ArrowRight,
  UserCircle,
  LayoutDashboard,
  UserPlus,
  ShieldCheck,
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "what-is-account", label: "What is an Account?", level: 2 },
  { id: "how-to-sign-up", label: "How to Sign Up", level: 2 },
  { id: "how-to-login", label: "How to Log In", level: 2 },
  { id: "after-login", label: "What Happens Next?", level: 2 },
  { id: "account-security", label: "Account Security", level: 2 },
  { id: "troubleshooting", label: "Troubleshooting", level: 2 },
];

export default function SignUpAndLoginPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
      <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Sign Up & Login</h1>
          <p className="text-lg text-muted-foreground">
            Creating and accessing your personal workspace
          </p>
        </div>

        {/* WHAT IS AN ACCOUNT */}
        <section id="what-is-account" className="scroll-mt-24 mb-16">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <UserCircle className="w-7 h-7 text-primary" />
            What is an Account?
          </h2>
          <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
              Your account is your <strong className="text-foreground">personal and secure entry point</strong> to the platform. It gives you access to your own workspace where all your uploaded data, analyses, and saved results are stored privately.
            </p>
            <p>
              Creating an account is the first step to using our tools. Once you have an account, you can log in anytime to resume your work.
            </p>
          </div>
        </section>

        {/* HOW TO SIGN UP */}
        <section id="how-to-sign-up" className="scroll-mt-24 mb-16 border-t pt-12">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <UserPlus className="w-7 h-7 text-primary" />
            How to Sign Up
          </h2>
          <div className="space-y-6">
            <p className="text-base text-muted-foreground leading-relaxed">
              Follow these simple steps to create your account:
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</div>
                <div>
                  <p className="font-medium">Navigate to the Sign Up page</p>
                  <p className="text-sm text-muted-foreground">Click the "Get Started" or "Sign Up" button on the homepage.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</div>
                <div>
                  <p className="font-medium">Enter your details</p>
                  <p className="text-sm text-muted-foreground">Provide your name, a valid email address, and create a strong password.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</div>
                <div>
                  <p className="font-medium">Agree to the terms</p>
                  <p className="text-sm text-muted-foreground">Review and agree to our Terms of Service and Privacy Policy.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">4</div>
                <div>
                  <p className="font-medium">Create your account</p>
                  <p className="text-sm text-muted-foreground">Click the "Create Account" button to finalize the process.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW TO LOGIN */}
        <section id="how-to-login" className="scroll-mt-24 mb-16 border-t pt-12">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <LogIn className="w-7 h-7 text-primary" />
            How to Log In
          </h2>
          <div className="space-y-6">
            <p className="text-base text-muted-foreground leading-relaxed">
              Once you have an account, logging in is straightforward.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</div>
                <div>
                  <p className="font-medium">Navigate to the Login page</p>
                  <p className="text-sm text-muted-foreground">Click the "Login" button on the homepage.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</div>
                <div>
                  <p className="font-medium">Enter your credentials</p>
                  <p className="text-sm text-muted-foreground">Type in your registered email and password.</p>
                  <div className="mt-2 flex flex-col space-y-2">
                      <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground"/><span>Your registered email</span></div>
                      <div className="flex items-center gap-2 text-sm"><Key className="w-4 h-4 text-muted-foreground"/><span>Your password</span></div>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</div>
                <div>
                  <p className="font-medium">Click "Login"</p>
                  <p className="text-sm text-muted-foreground">You will be securely logged in and redirected to your dashboard.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AFTER LOGIN */}
        <section id="after-login" className="scroll-mt-24 mb-16 border-t pt-12">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <ArrowRight className="w-7 h-7 text-primary" />
            What Happens Next?
          </h2>
          <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
              Upon successful sign-up or login, you will be taken to your <strong className="text-foreground">main workspace dashboard</strong>.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Your Dashboard:</strong> This is your central hub where you can see recent projects, start new analyses, or manage your datasets.</li>
              <li><strong>Access Your Work:</strong> All your previous analyses and uploaded data will be available exactly as you left them.</li>
              <li><strong>Account Management:</strong> You can access your account settings by clicking on your user icon in the top-right corner.</li>
            </ul>
          </div>
        </section>

        {/* ACCOUNT SECURITY */}
        <section id="account-security" className="scroll-mt-24 mb-16 border-t pt-12">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-primary" />
            Account Security
          </h2>
          <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
              We take the security of your account and data seriously. Here are some tips for keeping your account secure:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Use a strong, unique password:</strong> Combine uppercase and lowercase letters, numbers, and symbols.</li>
              <li><strong>Do not share your password:</strong> We will never ask you for your password.</li>
              <li><strong>Enable Two-Factor Authentication (2FA):</strong> For an extra layer of security, enable 2FA in your account settings.</li>
            </ul>
          </div>
        </section>

        {/* TROUBLESHOOTING */}
        <section id="troubleshooting" className="scroll-mt-24 mb-16 border-t pt-12">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <HelpCircle className="w-7 h-7 text-primary" />
            Troubleshooting
          </h2>
          <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-background">
                  <h4 className="font-semibold mb-2 text-sm">Forgot Password?</h4>
                  <p className="text-sm text-muted-foreground">
                    If you've forgotten your password, click the "Forgot Password?" link on the login page. You will receive an email with instructions on how to reset it.
                  </p>
              </div>
              <div className="p-4 rounded-lg border bg-background">
                  <h4 className="font-semibold mb-2 text-sm">Incorrect Email or Password</h4>
                  <p className="text-sm text-muted-foreground">
                    If you see an "Invalid credentials" error, double-check that your email and password are correct. Ensure your Caps Lock key is off.
                  </p>
              </div>
              <div className="p-4 rounded-lg border bg-background">
                  <h4 className="font-semibold mb-2 text-sm">Account Not Found</h4>
                  <p className="text-sm text-muted-foreground">
                    If the system doesn't recognize your email, you may have used a different email to sign up, or you may not have an account yet. Try signing up first.
                  </p>
              </div>
          </div>
        </section>
      </article>
    </FaqArticleLayout>
  );
}
