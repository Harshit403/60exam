'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft, Shield } from 'lucide-react'

interface Props {
  onNavigate: (view: string) => void
}

export default function PrivacyPolicyPage({ onNavigate }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Button variant="ghost" size="sm" onClick={() => onNavigate('landing')} className="mb-6 gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-amber-600 flex items-center justify-center shadow-sm">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last Updated: July 23, 2026</p>
          </div>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p>
            Mission CS Test Series (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, website, and services.
          </p>

          <h2 className="text-lg font-semibold text-foreground mt-8">1. Information We Collect</h2>
          <h3 className="text-base font-medium text-foreground mt-4">Personal Information</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Full name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Course enrollment details</li>
            <li>Account credentials (password stored in encrypted form)</li>
          </ul>

          <h3 className="text-base font-medium text-foreground mt-4">Usage Information</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Quiz attempts, scores, and performance data</li>
            <li>Study sessions and time spent on the platform</li>
            <li>Discussion forum posts and interactions</li>
            <li>Chapter completion progress</li>
            <li>Achievements and badges earned</li>
          </ul>

          <h3 className="text-base font-medium text-foreground mt-4">Technical Information</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>IP address and browser type</li>
            <li>Device information</li>
            <li>Pages visited and features used</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground mt-8">2. How We Use Your Information</h2>
          <p>We use the collected information for the following purposes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>To create and manage your account</li>
            <li>To provide and personalize our test series and study services</li>
            <li>To track your learning progress and generate performance insights</li>
            <li>To send exam updates, schedule notifications, and platform announcements</li>
            <li>To improve our platform based on usage patterns</li>
            <li>To detect and prevent fraudulent or unauthorized access</li>
            <li>To comply with legal obligations</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground mt-8">3. Data Sharing and Disclosure</h2>
          <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Service Providers:</strong> With third-party vendors who help us operate our platform (e.g., cloud hosting, payment processing, email delivery).</li>
            <li><strong>Legal Compliance:</strong> When required by law, court order, or governmental regulation.</li>
            <li><strong>Protection of Rights:</strong> To protect our rights, property, or safety, and that of our users.</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground mt-8">4. Data Storage and Security</h2>
          <p>We implement appropriate technical and organizational measures to protect your data:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Encryption of data in transit (HTTPS/TLS)</li>
            <li>Encrypted password storage using industry-standard hashing algorithms</li>
            <li>Regular security assessments and updates</li>
            <li>Access controls and authentication protocols</li>
            <li>Secure cloud infrastructure with data redundancy</li>
          </ul>
          <p>Your data is stored on secure servers located within India. We retain your information for as long as your account is active or as needed to provide services.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">5. Cookies and Tracking</h2>
          <p>We use cookies and similar technologies to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Maintain your login session</li>
            <li>Remember your preferences and settings</li>
            <li>Analyze platform usage and performance</li>
            <li>Improve user experience</li>
          </ul>
          <p>You can control cookie preferences through your browser settings. Disabling cookies may affect certain platform features.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">6. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate or incomplete data</li>
            <li>Delete your account and associated data</li>
            <li>Object to or restrict processing of your data</li>
            <li>Data portability</li>
            <li>Withdraw consent at any time</li>
          </ul>
          <p>To exercise these rights, please contact us at the email address provided below.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">7. Third-Party Services</h2>
          <p>Our platform may integrate with third-party services for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Payment processing (secure PCI-compliant gateways)</li>
            <li>Email communications</li>
            <li>Analytics and performance monitoring</li>
            <li>Hosting and infrastructure</li>
          </ul>
          <p>These third parties have their own privacy policies governing data handling.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">8. Children&apos;s Privacy</h2>
          <p>Our services are not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware of such data, we will take steps to delete it promptly.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">9. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with a revised effective date. We encourage you to review this policy periodically.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">10. Contact Us</h2>
          <p>If you have questions, concerns, or requests regarding this Privacy Policy, please contact us:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Email:</strong> misssioncs@gmail.com</li>
            <li><strong>Phone:</strong> +918929592998</li>
            <li><strong>Website:</strong> https://missioncstestseries.com</li>
          </ul>
        </div>

        <div className="mt-10 pt-6 border-t border-border">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('landing')} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
