import { InfoPage } from "@/components/tg/info-page";

export const metadata = { title: "Contact Us - Team Generation" };

export default function ContactUsPage() {
  return (
    <InfoPage title="Contact Us">
      <p>
        We are committed to providing reliable service. If you have any
        questions, feedback, or need support, please reach out to us using the
        contact details below.
      </p>

      <p>
        <b>Support &amp; General Inquiries</b>
      </p>
      <p>For the fastest response, please email us directly:</p>
      <p>
        Email:{" "}
        <a
          href="mailto:believer01.official@gmail.com"
          style={{ color: "#563d7c", fontWeight: 600 }}
        >
          believer01.official@gmail.com
        </a>
      </p>

      <p>
        <b>Address &amp; Operations</b>
      </p>
      <p>Team Generation is an online service operating under Indian laws.</p>

      <p style={{ fontSize: 12, color: "#6c757d", marginTop: 12 }}>
        *We aim to respond to all inquiries within 24-48 hours.
      </p>
    </InfoPage>
  );
}
