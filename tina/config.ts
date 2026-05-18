import { defineConfig } from "tinacms";

const clientId = process.env.TINA_PUBLIC_CLIENT_ID;
const token = process.env.TINA_TOKEN;

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
        ui: {
          filename: ({ slug, values }) => {
            const date = values.date
              ? new Date(values.date as string)
              : new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}-${slug}`;
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
            type: "datetime",
            name: "date",
            label: "Date",
            required: true,
            ui: {
              dateFormat: "YYYY-MM-DD",
              timeFormat: "HH:mm:ss",
              defaultComponent: "date",
              defaultValue: () => new Date().toISOString(),
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
    ],
  },
});
