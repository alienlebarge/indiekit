import { IndiekitError } from "@indiekit/error";
import cleanStack from "clean-stack";

export const notFound = (request, response, next) => {
  const error = IndiekitError.notFound(response.__("NotFoundError.page"));

  next(error);
};

// eslint-disable-next-line no-unused-vars
export const internalServer = (error, request, response, next) => {
  response.status(error.status || 500);

  if (request.accepts("html")) {
    response.render("error", {
      title: response.__(`${error.name}.title:${error.name}`),
      content: error.message,
      name: error.name,
      stack: error.stack,
      status: error.status,
      uri: error.uri,
    });
  } else if (request.accepts("json")) {
    response.json({
      error: error.code || error.name,
      error_description: error.message || error.cause.message,
      ...(error.uri && { error_uri: error.uri }),
      ...(error.scope && { scope: error.scope }),
      stack: cleanStack(error.stack),
      ...(error.cause && { cause: error.cause }),
    });
  } else {
    response.send(error.toString());
  }
};
