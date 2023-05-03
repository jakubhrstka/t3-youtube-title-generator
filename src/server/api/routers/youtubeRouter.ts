import { z } from "zod";

import { Configuration, OpenAIApi } from "openai";

import puppeteer from "puppeteer";
import type { Browser } from "puppeteer";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

type VideoData = {
  title: string | null | undefined;
};

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export const youtubeRouter = createTRPCRouter({
  youtube: publicProcedure
    .input(z.object({ topic: z.string(), alias: z.string() }))
    .mutation(async ({ input }) => {
      // scrape the youtube channel for titles with puppeteer
      const browser: Browser = await puppeteer.launch({
        ignoreDefaultArgs: ["--disable-extensions"],
      });
      const page = await browser.newPage();
      await page.goto(`https://www.youtube.com/${input.alias}/videos`, {
        waitUntil: ["load", "domcontentloaded", "networkidle0", "networkidle2"],
      });

      const cookieButton = await page.$('[aria-label="Accept all"]');
      cookieButton && (await cookieButton.click());

      await new Promise((resolve) => {
        setTimeout(resolve, 4000);
      });

      const videoData: VideoData[] = await page.evaluate(() => {
        const youtubeTitleElements = Array.from(
          document.querySelectorAll("#video-title")
        );

        console.log(youtubeTitleElements);

        const data = youtubeTitleElements.map((el: Element) => ({
          title: el.textContent,
        }));

        return data;
      });

      await browser.close();

      const titles: VideoData[] = videoData.slice(0, 10);

      const prompt = `The following is a list of youtube video titles. After reading the titles, you are given a topic to then write a similar title for.\n\nTITLE: ${titles
        .map((t) => t.title)
        .join("\n")}\n\nSIMILAR TITLE FOR TOPIC "${input.topic.toUpperCase()}"`;

      try {
        const res = await openai.createCompletion({
          model: "text-davinci-003",
          prompt,
          temperature: 1,
          max_tokens: 256,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        });

        return res?.data?.choices[0]?.text;
      } catch (error) {
        console.log(error);
      }
    }),
});
