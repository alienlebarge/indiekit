import test from "ava";
import supertest from "supertest";
import { JSDOM } from "jsdom";
import { testServer } from "@indiekit-test/server";
import { cookie } from "@indiekit-test/session";

test("Returns list of previously published posts", async (t) => {
  const server = await testServer();
  const request = supertest.agent(server);
  const response = await request.get("/posts").set("cookie", [cookie()]);
  const dom = new JSDOM(response.text);
  const result = dom.window.document.querySelector("title").textContent;

  t.is(result, "Published posts - Test configuration");

  server.close(t);
});
