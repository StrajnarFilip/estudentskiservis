import { JobPost } from "./job-post";
import puppeteer from "puppeteer";
import { writeFile } from "fs/promises";

async function parsePage(url: string): Promise<JobPost[]> {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(url);
  await page.waitForSelector("article");

  const evalResult = await page.$$eval("article.job-item", (articles) => {
    function extractPayment(paymentElement: HTMLElement | null): {
      net: number;
      gross: number;
    } {
      const regex = /<strong>(\S+).*<\/strong> \((\S+).*\)/;
      if (!paymentElement)
        return {
          gross: 0,
          net: 0,
        };
      const result = regex.exec(paymentElement.innerHTML);
      if (!result)
        return {
          gross: 0,
          net: 0,
        };

      return {
        net: parseFloat(result[1]),
        gross: parseFloat(result[2]),
      };
    }

    function extractCode(element: Element | undefined): string {
      if (!element) return "unknown";

      const result = element.querySelector("strong");
      if (!result) return "unknown";

      return (result as HTMLElement).innerText;
    }
    return articles.map((article) => {
      const paymentRaw = article.querySelector(
        "li.job-payment a"
      ) as HTMLElement | null;

      const { net, gross } = extractPayment(paymentRaw);

      const jobAttributes = Array.from(
        article.querySelectorAll("ul.job-attributes > li")
      );
      const codeElement = jobAttributes.find((attribute) =>
        attribute.innerHTML.includes("Šifra")
      );

      const articleCode = extractCode(codeElement);

      return {
        titles: Array.from(article.querySelectorAll("h5.mb-0")).map(
          (h5) => (h5 as HTMLElement).innerText
        ),
        description: (article.querySelector("p.description") as HTMLElement)
          .innerText,
        netEurPerHour: net,
        grossEurPerHour: gross,
        location: Array.from(
          article.querySelectorAll(
            "div.col-12.row div.col-12 p.mb-0.text-break"
          )
        ).map((p) => (p as HTMLElement).innerText)[1],
        code: articleCode,
      };
    });
  });

  await browser.close();
  return evalResult;
}

const URL =
  "https://www.studentski-servis.com/studenti/prosta-dela?kljb=&page=1&isci=1&sort=3&dm1s=1&skD%5B%5D=004&skD%5B%5D=A832&skD%5B%5D=A210&skD%5B%5D=A055&skD%5B%5D=A078&skD%5B%5D=A090&skD%5B%5D=A095&hourlyratefrom=5.85&hourlyrateto=51&hourly_rate=5.85%3B51";

async function main() {
  const posts = await parsePage(URL);
  writeFile(
    "09_07_2023.json",
    JSON.stringify(posts, null, 4)
  );
  console.log(posts);
}

main();
