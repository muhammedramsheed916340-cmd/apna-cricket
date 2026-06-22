import { InfoPage } from "@/components/tg/info-page";

export const metadata = { title: "Terms and Conditions - Team Generation" };

export default function TermsPage() {
  return (
    <InfoPage title="Terms and Conditions">
      <p>
        <b>Last Updated: September 2025</b>
      </p>

      <p>
        <b>1. Acceptance of Terms</b>
      </p>
      <p>
        By accessing and using the Team Generation website (both
        teamgeneration.in and team-generation.netlify.app) and its free services,
        you agree to these Terms and Conditions.
      </p>

      <p>
        <b>2. Free-to-Play Service</b>
      </p>
      <p>
        Our service provides suggested fantasy sports teams for free.{" "}
        <b>No monetary transactions, deposits, or winnings are processed by Team
        Generation</b>.
      </p>
      <p>
        You agree to use the service only for personal, recreational purposes in
        full compliance with the <b>Promotion and Regulation of Online Gaming
        Act, 2025</b>.
      </p>

      <p>
        <b>3. User Account and Conduct</b>
      </p>
      <ul style={{ paddingLeft: 20, fontSize: 14, marginBottom: 10 }}>
        <li>
          You are solely responsible for all activity under your Google
          OAuth-linked account.
        </li>
        <li>You must be over 18 years of age to use this service.</li>
        <li>
          You agree not to use the service for illegal activities, including
          real-money gaming or betting, which is strictly prohibited in India
          under the Online Gaming Act, 2025.
        </li>
      </ul>

      <p>
        <b>4. Intellectual Property and Content</b>
      </p>
      <p>
        All content, including suggested teams and algorithms, is the property
        of Team Generation. You may not reproduce, copy, or redistribute our
        content for commercial gain.
      </p>
    </InfoPage>
  );
}
