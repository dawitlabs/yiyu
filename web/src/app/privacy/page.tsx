import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - yiyu",
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-neutral mx-auto max-w-2xl px-4 py-12">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-neutral-500">Last updated: July 2026</p>

      <h2>1. Information We Collect</h2>
      <p>We collect information you provide directly:</p>
      <ul>
        <li>
          <strong>Account information:</strong> username, email address, and
          password (stored as a one-way hash)
        </li>
        <li>
          <strong>Profile information:</strong> display name, bio, avatar
        </li>
        <li>
          <strong>Content:</strong> videos, comments, community posts, and
          associated metadata you upload or create
        </li>
      </ul>
      <p>We collect automatically:</p>
      <ul>
        <li>
          <strong>Usage data:</strong> watch history, search queries, and
          interactions (likes, subscriptions)
        </li>
        <li>
          <strong>Technical data:</strong> IP address, browser type, and device
          information for security and rate limiting
        </li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>Operating and improving the Platform</li>
        <li>Personalizing your experience (recommendations, feed)</li>
        <li>Sending transactional emails (verification, password reset)</li>
        <li>Preventing abuse and enforcing our Terms of Service</li>
        <li>Analytics to understand how the Platform is used</li>
      </ul>

      <h2>3. Information Sharing</h2>
      <p>
        We do not sell your personal information. We may share information with:
      </p>
      <ul>
        <li>
          Service providers who help operate the Platform (hosting,email, storage)
        </li>
        <li>Law enforcement when required by law</li>
      </ul>

      <h2>4. Data Retention</h2>
      <p>
        We retain your data for as long as your account is active. When you
        delete your account, we delete your personal data within 30 days.
        Uploaded content is removed promptly upon account deletion.
      </p>

      <h2>5. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you</li>
        <li>Correct inaccurate information</li>
        <li>Delete your account and associated data</li>
        <li>Export your data</li>
      </ul>

      <h2>6. Security</h2>
      <p>
        We use industry-standard measures to protect your data, including
        encrypted connections (HTTPS), hashed passwords (Argon2id), and secure
        session management.
      </p>

      <h2>7. Cookies</h2>
      <p>
        We use a single essential cookie for authentication (session management).
        We do not use tracking cookies or third-party advertising cookies.
      </p>

      <h2>8. Children</h2>
      <p>
        yiyu is not intended for children under 13. We do not knowingly collect
        information from children under 13.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this policy. We will notify users of material changes via
        the Platform.
      </p>

      <h2>10. Contact</h2>
      <p>
        Privacy questions? Contact us at{" "}
        <a href="mailto:privacy@yiyu.app">privacy@yiyu.app</a>.
      </p>
    </article>
  );
}
