import { defineConfig } from "tinacms";

const clientId = process.env.TINA_PUBLIC_CLIENT_ID;
const token = process.env.TINA_TOKEN;

const socialIcons = [
  { value: "github", label: "GitHub" },
  { value: "x", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "email", label: "Email" },
  { value: "rss", label: "RSS" },
  { value: "youtube", label: "YouTube" },
  { value: "mastodon", label: "Mastodon" },
  { value: "link", label: "Generic link" },
];

export default defineConfig({
  branch: process.env.TINA_BRANCH || "main",
  ...(clientId ? { clientId } : {}),
  ...(token ? { token } : {}),
  build: {
    publicFolder: "./",
    outputFolder: "admin",
  },
  media: {
    tina: {
      publicFolder: "./",
      mediaRoot: "assets/images/uploads",
    },
  },
  schema: {
    collections: [
      {
        name: "posts",
        label: "Posts",
        path: "_posts",
        format: "md",
        defaultItem: () => ({ date: new Date().toISOString() }),
        ui: {
          filename: {
            // Jekyll only picks up posts named YYYY-MM-DD-slug.md
            slugify: (values) => {
              const date = values?.date ? new Date(values.date) : new Date();
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, "0");
              const day = String(date.getDate()).padStart(2, "0");
              const slug = String(values?.title || "untitled")
                .toLowerCase()
                .normalize("NFKD")
                .replace(/[^\w\s-]/g, "")
                .trim()
                .replace(/[\s_-]+/g, "-");
              return `${year}-${month}-${day}-${slug}`;
            },
          },
        },
        fields: [
          {
            type: "string",
            name: "title",
            label: "Title",
            isTitle: true,
            required: true,
          },
          {
            type: "string",
            name: "emoticon",
            label: "Emoticon",
            description: "Optional emoji shown before the title, e.g. 🚀",
          },
          {
            type: "boolean",
            name: "toc",
            label: "Show table of contents",
            description: "On by default; set off to hide the sidebar on this post.",
          },
          {
            type: "datetime",
            name: "date",
            label: "Date",
            required: true,
            ui: {
              dateFormat: "YYYY-MM-DD",
              timeFormat: "HH:mm:ss",
            },
          },
          {
            type: "string",
            name: "categories",
            label: "Categories",
            list: true,
            ui: {
              component: "tags",
            },
          },
          {
            type: "string",
            name: "tags",
            label: "Tags",
            list: true,
            ui: {
              component: "tags",
            },
          },
          {
            type: "rich-text",
            name: "body",
            label: "Body",
            isBody: true,
          },
        ],
      },
      {
        name: "profile",
        label: "Profile",
        path: "_data",
        format: "yml",
        match: { include: "profile" },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          { type: "string", name: "name", label: "Name", isTitle: true, required: true },
          { type: "string", name: "hero_title", label: "Home heading", description: "e.g. I'm Isfa — falls back to Name" },
          { type: "string", name: "greeting", label: "Greeting emoji" },
          { type: "string", name: "brand_emoji", label: "Brand emoji (navbar)" },
          { type: "string", name: "username", label: "X / Twitter username (without @)" },
          { type: "string", name: "tagline", label: "Tagline" },
          { type: "image", name: "avatar", label: "Avatar" },
          {
            type: "string",
            name: "bio",
            label: "Bio",
            description: "Short bio. Basic HTML links are allowed.",
            ui: { component: "textarea" },
          },
          {
            type: "object",
            name: "bio_links",
            label: "Bio links (inline after the bio)",
            list: true,
            ui: { itemProps: (item) => ({ label: item?.handle }) },
            fields: [
              { type: "string", name: "prefix", label: "Text before the link", description: "e.g. Find my repositories at" },
              { type: "string", name: "icon", label: "Icon", options: socialIcons },
              { type: "string", name: "handle", label: "Handle", required: true },
              { type: "string", name: "url", label: "URL", required: true },
            ],
          },
          {
            type: "object",
            name: "socials",
            label: "Social links",
            list: true,
            ui: { itemProps: (item) => ({ label: item?.label }) },
            fields: [
              { type: "string", name: "label", label: "Label", required: true },
              { type: "string", name: "url", label: "URL", required: true },
              {
                type: "string",
                name: "icon",
                label: "Icon",
                options: socialIcons,
              },
              {
                type: "image",
                name: "image",
                label: "Custom icon image",
                description: "Optional. Overrides the built-in icon.",
              },
            ],
          },
        ],
      },
      {
        name: "home",
        label: "Home page",
        path: "_data",
        format: "yml",
        match: { include: "home" },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          { type: "string", name: "intro", label: "Intro", ui: { component: "textarea" } },
          { type: "string", name: "experience_title", label: "Experience section title" },
          {
            type: "string",
            name: "experience_summary",
            label: "Experience paragraph",
            description: "Wrap company names as [[Company]] to show them with their logo and link.",
            ui: { component: "textarea" },
          },
          { type: "string", name: "experience_link_label", label: "Experience link label" },
          { type: "string", name: "experience_link_url", label: "Experience link URL (LinkedIn)" },
          {
            type: "object",
            name: "experience",
            label: "Companies (for [[Company]] logos)",
            list: true,
            ui: { itemProps: (item) => ({ label: item?.organization }) },
            fields: [
              { type: "string", name: "organization", label: "Company name", required: true },
              { type: "string", name: "url", label: "URL" },
              { type: "image", name: "logo", label: "Logo", description: "Square image; leave empty for a letter mark" },
            ],
          },
          { type: "string", name: "news_title", label: "News section title" },
          {
            type: "object",
            name: "news",
            label: "News",
            list: true,
            ui: { itemProps: (item) => ({ label: item?.title }) },
            fields: [
              { type: "string", name: "title", label: "Title", required: true },
              { type: "string", name: "subtitle", label: "Publisher / subtitle" },
              { type: "string", name: "url", label: "URL", required: true },
            ],
          },
          { type: "string", name: "slides_title", label: "Slides section title" },
          {
            type: "object",
            name: "slides",
            label: "Slides",
            list: true,
            ui: { itemProps: (item) => ({ label: item?.title }) },
            fields: [
              { type: "string", name: "title", label: "Title", required: true },
              { type: "string", name: "event", label: "Event" },
              { type: "string", name: "url", label: "URL", required: true },
              { type: "image", name: "icon", label: "Icon" },
              { type: "image", name: "thumbnail", label: "Thumbnail" },
            ],
          },
        ],
      },
      {
        name: "projects",
        label: "Projects",
        path: "_data",
        format: "yml",
        match: { include: "projects" },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            type: "object",
            name: "items",
            label: "Projects",
            list: true,
            ui: { itemProps: (item) => ({ label: item?.title }) },
            fields: [
              { type: "string", name: "title", label: "Title", required: true },
              {
                type: "string",
                name: "platforms",
                label: "Platforms",
                description: "Shown as the subtitle, e.g. Android / iOS / Web",
                list: true,
                options: ["Android", "iOS", "Web", "Desktop", "CLI", "Library"],
              },
              { type: "string", name: "url", label: "URL" },
              { type: "image", name: "thumbnail", label: "Thumbnail (16:9)" },
              { type: "image", name: "icon", label: "Icon" },
            ],
          },
        ],
      },
      {
        name: "navigation",
        label: "Navigation",
        path: "_data",
        format: "yml",
        match: { include: "menus" },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            type: "object",
            name: "items",
            label: "Menu items",
            list: true,
            ui: { itemProps: (item) => ({ label: item?.title }) },
            fields: [
              { type: "string", name: "title", label: "Title", required: true },
              { type: "string", name: "url", label: "URL", required: true },
              {
                type: "boolean",
                name: "external",
                label: "External link (opens in new tab)",
              },
            ],
          },
        ],
      },
      {
        name: "pages",
        label: "Pages",
        path: "",
        format: "md",
        match: { include: "about" },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          { type: "string", name: "title", label: "Title", isTitle: true, required: true },
          { type: "string", name: "permalink", label: "Permalink", required: true },
          { type: "string", name: "excerpt", label: "Excerpt", ui: { component: "textarea" } },
          { type: "boolean", name: "comments", label: "Enable comments" },
          { type: "boolean", name: "show_socials", label: "Show social links" },
          { type: "rich-text", name: "body", label: "Body", isBody: true },
        ],
      },
    ],
  },
});
