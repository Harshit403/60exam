'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText } from 'lucide-react'

interface Props {
  onNavigate: (view: string) => void
}

export default function TermsAndConditionsPage({ onNavigate }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Button variant="ghost" size="sm" onClick={() => onNavigate('landing')} className="mb-6 gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-amber-600 flex items-center justify-center shadow-sm">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Terms and Conditions</h1>
          </div>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p>
            Welcome to Study Focus. These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of our website, services, features, and content. By accessing or using Study Focus, you agree to comply with these Terms. If you do not agree with any part of these Terms, please do not use our services.
          </p>

          <h2 className="text-lg font-semibold text-foreground mt-8">1. Acceptance of Terms</h2>
          <p>By creating an account, accessing, or using Study Focus, you acknowledge that you have read, understood, and agree to be bound by these Terms and all applicable laws and regulations.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">2. Eligibility</h2>
          <p>You must be at least 13 years old, or the minimum age required by your local laws, to use our services. If you are under the required age, you must obtain permission from a parent or legal guardian.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">3. User Accounts</h2>
          <p>To access certain features, you may need to create an account. You agree to provide accurate and complete information, keep your login credentials secure, notify us immediately of any unauthorized account access, and accept responsibility for all activities conducted through your account.</p>
          <p>We reserve the right to suspend or terminate accounts that contain false information or violate these Terms.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the platform for illegal activities.</li>
            <li>Attempt to gain unauthorized access to our systems.</li>
            <li>Upload malicious software, viruses, or harmful code.</li>
            <li>Harass, abuse, or threaten other users.</li>
            <li>Interfere with the operation of the website.</li>
            <li>Copy, distribute, or exploit our content without permission.</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground mt-8">5. User Content</h2>
          <p>You retain ownership of any notes, tasks, study materials, files, or content you upload to the platform.</p>
          <p>By submitting content, you grant Study Focus a limited license to store, process, and display the content solely for providing and improving the service.</p>
          <p>You are responsible for ensuring that your content does not violate any laws or third-party rights.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">6. Intellectual Property</h2>
          <p>All website content, including logos, branding, design elements, software, features, text, graphics, and other materials, are the property of Study Focus or its licensors and are protected by applicable intellectual property laws.</p>
          <p>You may not reproduce, modify, distribute, or create derivative works without prior written permission.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">7. Subscription and Payments</h2>
          <p>If paid plans or premium features are offered:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Fees will be clearly displayed before purchase.</li>
            <li>Payments are processed through authorized payment providers.</li>
            <li>Subscription fees may be charged automatically according to your selected plan.</li>
            <li>You are responsible for any applicable taxes.</li>
          </ul>
          <p>Refund policies, if available, will be described separately.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">8. Service Availability</h2>
          <p>We strive to provide reliable services but do not guarantee uninterrupted access.</p>
          <p>We may modify features, update the platform, perform maintenance, temporarily suspend services, or discontinue features without prior notice.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">9. Data and Privacy</h2>
          <p>Your use of Study Focus is also governed by our Privacy Policy.</p>
          <p>By using the platform, you consent to the collection and processing of information as described in the Privacy Policy.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">10. Third-Party Services</h2>
          <p>Study Focus may contain links to third-party websites or integrate with third-party services.</p>
          <p>We are not responsible for third-party content, privacy practices, service availability, or products and services offered by third parties.</p>
          <p>Your interactions with third-party services are governed by their own terms and policies.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">11. Disclaimer of Warranties</h2>
          <p>Study Focus is provided on an &quot;as is&quot; and &quot;as available&quot; basis.</p>
          <p>We make no warranties regarding the accuracy of information, continuous availability, error-free operation, or suitability for any specific purpose.</p>
          <p>Your use of the platform is at your own risk.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">12. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, Study Focus shall not be liable for any indirect, incidental, consequential, special, or punitive damages, including loss of data, profits, or service interruptions arising from your use of the platform.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">13. Account Termination</h2>
          <p>We reserve the right to suspend or terminate your account if:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You violate these Terms.</li>
            <li>You engage in fraudulent activity.</li>
            <li>Your actions harm other users or the platform.</li>
          </ul>
          <p>Upon termination, your right to access the service will immediately cease.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">14. Changes to Terms</h2>
          <p>We may update these Terms from time to time.</p>
          <p>Updated versions will be posted on this page with a revised effective date. Continued use of the platform after changes become effective constitutes acceptance of the revised Terms.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">15. Governing Law</h2>
          <p>These Terms shall be governed and interpreted in accordance with the laws of India, without regard to conflict of law principles.</p>

          <h2 className="text-lg font-semibold text-foreground mt-8">16. Contact Information</h2>
          <p>If you have any questions regarding these Terms and Conditions, please contact us:</p>
          <p><strong>WhatsApp:</strong> +91 89295 92998</p>

          <p className="mt-6">By using Study Focus, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.</p>
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
