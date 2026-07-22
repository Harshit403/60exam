'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft, RotateCcw } from 'lucide-react'

interface Props {
  onNavigate: (view: string) => void
}

export default function RefundPolicyPage({ onNavigate }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Button variant="ghost" size="sm" onClick={() => onNavigate('landing')} className="mb-6 gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-amber-600 flex items-center justify-center shadow-sm">
            <RotateCcw className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Refund Policy</h1>
            <p className="text-sm text-muted-foreground">Last Updated: July 23, 2026</p>
          </div>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p>
            This Refund Policy outlines the terms and conditions regarding refunds for purchases made on Mission CS Test Series. By purchasing any of our test series, courses, or services, you agree to this Refund Policy.
          </p>

          <h2 className="text-lg font-semibold text-foreground mt-8">1. Digital Products and Services</h2>
          <p>
            Our test series, study materials, and courses are digital products and services. Due to the nature of digital content, all sales are generally considered final once access has been granted.
          </p>

          <h2 className="text-lg font-semibold text-foreground mt-8">2. Refund Eligibility</h2>
          <p>Refunds may be considered under the following circumstances:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Duplicate Purchase:</strong> If you accidentally purchase the same test series or course twice within a short period.</li>
            <li><strong>Technical Issues:</strong> If a significant technical problem prevents you from accessing the purchased content and we are unable to resolve it within a reasonable time.</li>
            <li><strong>Service Cancellation:</strong> If we discontinue a test series or service you have purchased before its completion.</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground mt-8">3. Non-Refundable Situations</h2>
          <p>The following situations do not qualify for refunds:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Change of mind after purchasing</li>
            <li>Lack of usage or failure to utilize the service</li>
            <li>Unsatisfactory exam results or performance</li>
            <li>Incompatibility with your device or browser (unless severe and reproducible)</li>
            <li>Loss of account access due to forgotten credentials or security issues</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground mt-8">4. Refund Request Process</h2>
          <p>To request a refund:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Contact us at <strong>misssioncs@gmail.com</strong> within 7 days of purchase</li>
            <li>Include your registered email address, order details, and reason for the refund request</li>
            <li>Provide any supporting information or evidence (e.g., screenshots of technical issues)</li>
            <li>We will review your request and respond within 5-7 business days</li>
          </ol>

          <h2 className="text-lg font-semibold text-foreground mt-8">5. Approved Refunds</h2>
          <p>If your refund is approved:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The refund amount will be credited to the original payment method used during purchase</li>
            <li>Processing time depends on your payment provider and may take 5-10 business days</li>
            <li>Access to the purchased service will be revoked upon refund</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground mt-8">6. Chargebacks</h2>
          <p>
            If you initiate a chargeback with your bank or payment provider without first contacting us to resolve the issue, your account may be suspended or terminated. We encourage you to reach out to us directly before pursuing a chargeback.
          </p>

          <h2 className="text-lg font-semibold text-foreground mt-8">7. Changes to This Policy</h2>
          <p>
            We reserve the right to modify this Refund Policy at any time. Changes will be effective immediately upon posting. Your continued use of the platform after changes constitutes acceptance of the updated policy.
          </p>

          <h2 className="text-lg font-semibold text-foreground mt-8">8. Contact Us</h2>
          <p>If you have questions about this Refund Policy, please contact us:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Email:</strong> misssioncs@gmail.com</li>
            <li><strong>Phone:</strong> +918929592998</li>
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
