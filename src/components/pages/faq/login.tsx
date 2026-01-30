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
  LayoutDashboard
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "what-is", label: "What is Login?", level: 2 },
  { id: "how-to-login", label: "How to Log In", level: 2 },
  { id: "after-login", label: "What Happens Next?", level: 2 },
  { id: "troubleshooting", label: "Troubleshooting", level: 2 },
];

export default function LoginPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
      <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Accessing Your Account</h1>
          <p className="text-lg text-muted-foreground">
            A step-by-step guide to logging into your workspace
          </p>
        </div>

        {/* WHAT IS LOGIN */}
        <section id="what-is" className="scroll-mt-24 mb-16">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            What is Login?
          </h2>
          <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
              Logging in is how you <strong className="text-foreground">securely access your personal workspace</strong>. After you've created an account, you use your registered email and password to sign in and resume your work.
            </p>
            <p>
              This ensures that all your uploaded data, analyses, and saved results remain private and are only accessible by you.
            </p>
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
              Logging into your account is straightforward.
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
                  <p className="text-sm text-muted-foreground">Type in the email address and password you used to create your account.</p>
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
            What Happens After Login?
          </h2>
          <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
              Upon successful login, you will be taken to your <strong className="text-foreground">main workspace dashboard</strong>.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Your Dashboard:</strong> This is your central hub where you can see recent projects, start new analyses, or manage your datasets.</li>
              <li><strong>Access Your Work:</strong> All your previous analyses and uploaded data will be available exactly as you left them.</li>
              <li><strong>Account Management:</strong> You can access your account settings by clicking on your user icon in the top-right corner.</li>
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
