import process from "node:process";
import test from "ava";
import supertest from "supertest";
import { mockAgent } from "@indiekit-test/mock-agent";
import { testServer } from "@indiekit-test/server";
import { cookie } from "@indiekit-test/session";

await mockAgent("store");

test("Posts content and redirects back to share page", async (t) => {
  const server = await testServer();
  const request = supertest.agent(server);
  const result = await request
    .post("/share")
    .set("cookie", [cookie])
    .send(`access_token=${process.env.TEST_TOKEN}`)
    .send("name=Foobar")
    .send("content=Test+of+sharing+a+bookmark")
    .send("bookmark-of=https://example.website");

  t.is(result.status, 302);

  server.close(t);
});
