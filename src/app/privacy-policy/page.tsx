import { InfoPage } from "@/components/tg/info-page";

export const metadata = { title: "Privacy Policy - Team Generation" };

export default function PrivacyPolicyPage() {
  return (
    <InfoPage title="Privacy Policy">
      <p>
        <b>Last Updated: September 2025</b>
      </p>

      <p>
        <b>1. Data Collection (Google OAuth)</b>
      </p>
      <p>
        When you sign up or log in to Team Generation, we use Google OAuth to
        securely collect the following information{" "}
        <b>solely for user authentication and profile creation</b>:
      </p>
      <ul style={{ paddingLeft: 20, fontSize: 14, marginBottom: 10 }}>
        <li>Your Name</li>
        <li>Your Email Address</li>
        <li>Your Google Profile Picture</li>
      </ul>
      <p>
        We do not share your personal identification data (Name, Email) with any
        third-party marketing companies.
      </p>

      <p>
        <b>2. Third-Party Advertising (Google AdSense)</b>
      </p>
      <p>
        We use Google AdSense to serve advertisements on our website. This
        service requires the use of cookies and web beacons.
      </p>
      <ul style={{ paddingLeft: 20, fontSize: 14, marginBottom: 10 }}>
        <li>
          <b>Cookies:</b> Third parties, including Google, use cookies to serve
          ads based on a user&apos;s prior visits to this website or other
          websites.
        </li>
        <li>
          <b>Opt-out:</b> Users may opt out of personalized advertising by
          visiting the <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style={{ color: "#563d7c" }}>Google Ad Settings</a> page.
        </li>
        <li>
          <b>Data Use:</b> The information collected by AdSense (which may
          include IP address, browser type, and location data) is used by Google
          for the purpose of serving relevant ads and not for personal
          identification by us.
        </li>
      </ul>

      <p>
        <b>3. Legal Compliance</b>
      </p>
      <p>
        We will disclose your information where required to do so by law or
        subpoena or if we reasonably believe that such action is necessary to
        comply with the law and the reasonable requests of law enforcement.
      </p>

      <p>
        <b>4. Contact Us</b>
      </p>
      <p>
        If you have any questions about this Privacy Policy, please contact us
        at: <a href="mailto:believer01.official@gmail.com" style={{ color: "#563d7c" }}>believer01.official@gmail.com</a>
      </p>
    </InfoPage>
  );
}
