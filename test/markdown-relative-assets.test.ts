import test from "node:test";
import assert from "node:assert/strict";
import { markdownToHtml } from "../src/lib/markdown/to-html";

test("markdownToHtml rewrites parent-relative image assets through the asset API", async () => {
  const html = await markdownToHtml(
    "![流程图](../图片素材/daily-brief-to-ppt-knowledge-assets.png)",
    "会计事务所AI工作台/02-公众号文章/文章草稿/从日报到PPT：专业服务机构如何用AI沉淀知识资产"
  );

  assert.match(
    html,
    /src="\/api\/assets\/会计事务所AI工作台\/02-公众号文章\/图片素材\/daily-brief-to-ppt-knowledge-assets\.png"/
  );
});

test("markdownToHtml leaves external and data image URLs unchanged", async () => {
  const html = await markdownToHtml(
    [
      "![remote](https://example.com/image.png)",
      "![inline](data:image/png;base64,abc)",
    ].join("\n"),
    "docs/page"
  );

  assert.match(html, /src="https:\/\/example\.com\/image\.png"/);
  assert.match(html, /src="data:image\/png;base64,abc"/);
});
