import { createFileRoute } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pixel Chess — vs qwen3-4b" },
      { name: "description", content: "8-bit pixel art chess against a local qwen3-4b AI via LM Studio." },
      { property: "og:title", content: "Pixel Chess — vs qwen3-4b" },
      { property: "og:description", content: "8-bit pixel art chess against a local qwen3-4b AI via LM Studio." },
    ],
  }),
  component: App,
});
