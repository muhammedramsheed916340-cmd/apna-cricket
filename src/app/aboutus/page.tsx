import { InfoPage } from "@/components/tg/info-page";

export const metadata = { title: "About Us - Apna Cricket" };

export default function AboutUsPage() {
  return (
    <InfoPage title="About Us">
      <p>
        <b>Apna Cricket</b> is the only tool you need to win Grand league and
        Small leagues and even H2H leagues in your fantasy application
      </p>
      <p>
        This software uses multiple techniques and algorithms to create accurate
        and winning teams and this software is owned by{" "}
        <b>Apna Cricket</b>
      </p>
      <p>
        <b>Apna Cricket</b> team consists of professional software engineers
        who develop interesting and powerful fantasy sports tools
      </p>
    </InfoPage>
  );
}
