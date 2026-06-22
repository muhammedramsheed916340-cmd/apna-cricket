import { InfoPage } from "@/components/tg/info-page";

export const metadata = { title: "Contact Us - Apna Cricket" };

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
          href="mailto:Apna Cricket.official@gmail.com"
          style={{ color: "#0066ff", fontWeight: 600 }}
        >
          Apna Cricket.official@gmail.com
        </a>
      </p>

      <p>
        <b>Address &amp; Operations</b>
      </p>
      <p>Apna Cricket is an online service operating under Indian laws.</p>

      <p style={{ fontSize: 12, color: "#6c757d", marginTop: 12 }}>
        *We aim to respond to all inquiries within 24-48 hours.
      </p>
    </InfoPage>
  );
}
