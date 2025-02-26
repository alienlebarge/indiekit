import test from "ava";
import nock from "nock";
import sinon from "sinon";
import supertest from "supertest";
import { mockAgent } from "@indiekit-test/mock-agent";
import { testServer } from "@indiekit-test/server";
import { testToken } from "@indiekit-test/token";

await mockAgent("store");

test("Returns 500 error syndicating URL", async (t) => {
  sinon.stub(console, "error");

  nock("https://api.twitter.com")
    .post("/1.1/statuses/update.json")
    .replyWithError("Not found");

  const server = await testServer({
    plugins: ["@indiekit/syndicator-twitter"],
  });
  const request = supertest.agent(server);
  await request
    .post("/micropub")
    .auth(testToken(), { type: "bearer" })
    .set("accept", "application/json")
    .send("h=entry")
    .send("name=foobar")
    .send("mp-syndicate-to=https://twitter.com/username");
  const result = await request
    .post("/syndicate")
    .set("accept", "application/json")
    .query({ url: "https://website.example/notes/foobar/" })
    .query({ token: testToken() });

  t.is(result.status, 200);
  t.is(
    result.body.success_description,
    "Post updated at https://website.example/notes/foobar/. The following target(s) did not return a URL: https://twitter.com/username"
  );

  server.close(t);
});
