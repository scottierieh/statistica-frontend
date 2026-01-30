'use client';
import React from 'react';
import {
  UserPlus,
  CheckCircle2,
  BookOpen,
  Info,
  Mail,
  Key,
  ShieldCheck,
  ArrowRight,
  UserCircle
} from 'lucide-react';
import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
  { id: "what-is", label: "What is Sign Up?", level: 2 },
  { id: "how-to-sign-up", label: "How to Sign Up", level: 2 },
  { id: "after-sign-up", label: "What Happens Next?", level: 2 },
  { id: "account-security", label: "Account Security", level: 2 },
];

export default function SignUpPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
      <article className="prose prose-slate max-w-none">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Creating Your Account</h1>
          <p className="text-lg text-muted-foreground">
            A step-by-step guide to signing up and getting started
          </p>
        </div>

        {/* WHAT IS SIGN UP */}
        <section id="what-is" className="scroll-mt-24 mb-16">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            What is Sign Up?
          </h2>
          <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
              Signing up is the process of <strong className="text-foreground">creating your personal account</strong> on our platform. Your account gives you access to your own secure workspace where you can upload data, run analyses, and save your results.
            </p>
            <p>
              Creating an account ensures your work is private and accessible only to you. It also allows you to manage your subscription, view your analysis history, and customize your settings.
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

        {/* WHAT HAPPENS NEXT */}
        <section id="after-sign-up" className="scroll-mt-24 mb-16 border-t pt-12">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <ArrowRight className="w-7 h-7 text-primary" />
            What Happens Next?
          </h2>
          <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
            <p>
              Once your account is created, you will be automatically logged in and redirected to your <strong className="text-foreground">personal dashboard</strong>. From there, you can start your first analysis immediately.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Email Verification:</strong> You may receive a verification email. Please click the link inside to confirm your email address.</li>
              <li><strong>Your Workspace:</strong> Your dashboard is where all your projects and datasets will live.</li>
              <li><strong>Start Analyzing:</strong> You can start by uploading data or loading one of our example datasets to explore the platform's features.</li>
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
      </article>
    </FaqArticleLayout>
  );
}
