import test from "ava";
import supertest from "supertest";
import { testServer } from "@indiekit-test/server";
import { testToken } from "@indiekit-test/token";

test("Returns list of previously uploaded files", async (t) => {
  const server = await testServer();
  const request = supertest.agent(server);
  const result = await request
    .get("/media")
    .auth(testToken(), { type: "bearer" })
    .set("accept", "application/json")
    .query({ q: "source" })
    .query({ url: "https://website.example/photo.jpg" });

  t.is(result.status, 404);
  t.is(result.body.error_description, "No file was found at this URL");

  server.close(t);
});
