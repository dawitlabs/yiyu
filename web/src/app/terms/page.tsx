import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - yiyu",
};

export default function TermsPage() {
  return (
    <article className="prose prose-neutral mx-auto max-w-2xl px-4 py-12">
      <h1>Terms of Service</h1>
      <p className="text-sm text-neutral-500">Last updated: July 2026</p>

      <h2>1. Acceptance</h2>
      <p>
        By accessing or using yiyu (&quot;the Platform&quot;), you agree to
        these Terms of Service. If you do not agree, do not use the Platform.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You must provide accurate information when creating an account. You are
        responsible for maintaining the security of your account and for all
        activity under it. You must be at least 13 years old to use yiyu.
      </p>

      <h2>3. Content</h2>
      <p>
        You retain ownership of content you upload. By uploading, you grant yiyu
        a worldwide, non-exclusive, royalty-free license to host, display,
        distribute, and transcode your content for the purpose of operating the
        Platform.
      </p>
      <p>You must not upload content that:</p>
      <ul>
        <li>Infringes on intellectual property rights</li>
        <li>Contains illegal material</li>
        <li>Promotes violence, harassment, or hate speech</li>
        <li>Contains sexually explicit material involving minors</li>
        <li>Violates any applicable law</li>
      </ul>

      <h2>4. Prohibited Conduct</h2>
      <ul>
        <li>Manipulating views, likes, or subscriber counts</li>
        <li>Automated access without prior written consent</li>
        <li>Circumventing security or access controls</li>
        <li>Impersonating other users or entities</li>
        <li>Spam, including repetitive or unsolicited content</li>
      </ul>

      <h2>5. Termination</h2>
      <p>
        We may suspend or terminate your account for violations of these terms.
        You may delete your account at any time. Upon termination, your content
        may be removed.
      </p>

      <h2>6. Disclaimers</h2>
      <p>
        The Platform is provided &quot;as is&quot; without warranties of any
        kind. We do not guarantee uninterrupted or error-free service.
      </p>

      <h2>7. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, yiyu shall not be liable for any
        indirect, incidental, or consequential damages arising from your use of
        the Platform.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these terms. Continued use after changes constitutes
        acceptance. We will notify users of material changes via the Platform.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about these terms? Contact us at{" "}
        <a href="mailto:legal@yiyu.app">legal@yiyu.app</a>.
      </p>
    </article>
  );
}
