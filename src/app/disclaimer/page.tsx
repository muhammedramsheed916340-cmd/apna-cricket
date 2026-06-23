import { InfoPage } from "@/components/tg/info-page";

export const metadata = { title: "Disclaimer - Apna Cricket" };

export default function DisclaimerPage() {
  return (
    <InfoPage title="Fantasy Team & Financial Disclaimer">
      <p>
        <b>Last Updated: September 2025</b>
      </p>

      <p style={{ textAlign: "center", fontWeight: 700 }}>
        CRITICAL LEGAL &amp; FINANCIAL NOTICE (FREE SERVICE)
      </p>

      <p>
        <b>1. Compliance with Indian Law (Online Gaming Act, 2025)</b>
      </p>
      <p>
        Apna Cricket strictly adheres to the{" "}
        <b>Promotion and Regulation of Online Gaming Act, 2025</b>.{" "}
        <b>Our service is entirely FREE-TO-PLAY and does NOT involve any Real
        Money Gaming (RMG) or cash stakes</b>.
      </p>
      <ul style={{ paddingLeft: 20, fontSize: 14, marginBottom: 10 }}>
        <li>We <b>do NOT</b> accept deposits or process financial transactions for games.</li>
        <li>Our platform <b>does NOT</b> offer cash prizes or winnings.</li>
        <li>
          <b>Fantasy sports involving money are banned</b> in India under the
          Online Gaming Act, 2025.
        </li>
      </ul>

      <p>
        <b>2. No Guarantee of Success</b>
      </p>
      <p>
        The teams provided are{" "}
        <b>suggestions based on proprietary data analysis and projections ONLY</b>.
        They are intended purely for{" "}
        <b>informational, educational, and entertainment purposes</b>.
      </p>
      <p>
        Apna Cricket provides{" "}
        <b style={{ color: "#dc3545" }}>NO GUARANTEE</b> of winning any contest on
        any third-party fantasy platform. Your success depends on your own
        research and decisions.
      </p>

      <p>
        <b>3. Affiliation</b>
      </p>
      <p>
        Apna Cricket is an independent service. We are{" "}
        <b>NOT affiliated, associated, authorized, endorsed by, or in any way
        officially connected</b> with Dream11, MyTeam11, or any other third-party
        fantasy sports platform.
      </p>

      <p>
        <b>4. Limitation of Liability</b>
      </p>
      <p>
        Apna Cricket and its owners are{" "}
        <b style={{ color: "#dc3545" }}>not liable for any losses</b>, financial
        or otherwise, incurred by you as a result of using our suggested teams or
        any information provided on this website.
      </p>
    </InfoPage>
  );
}
