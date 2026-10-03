"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const fixturePath = path.join(projectRoot, "tests", "browser.html");
const userscriptPath = path.join(projectRoot, "OpenAIPlatformTranslate.user.js");
const defaultPort = 4173;
const fixtureRoutes = new Set(["/", "/prompts/pmpt_test"]);
const originSetting = 'origin: "https://platform.openai.com",';

function requestedPort() {
  const portArgument = process.argv.find((argument) => argument === "--port" || argument.startsWith("--port="));
  const argumentValue = portArgument === "--port"
    ? process.argv[process.argv.indexOf(portArgument) + 1]
    : portArgument?.slice("--port=".length);
  const value = argumentValue ?? process.env.TEST_SERVER_PORT ?? process.env.PORT ?? String(defaultPort);
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return port;
}

function send(response, statusCode, contentType, body, headOnly) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff"
  });
  response.end(headOnly ? undefined : body);
}

function createServer() {
  return http.createServer((request, response) => {
    const headOnly = request.method === "HEAD";
    if (request.method !== "GET" && !headOnly) {
      send(response, 405, "text/plain; charset=utf-8", "Method not allowed", headOnly);
      return;
    }

    let pathname;
    try {
      pathname = new URL(request.url, "http://127.0.0.1").pathname;
    } catch {
      send(response, 400, "text/plain; charset=utf-8", "Invalid request URL", headOnly);
      return;
    }

    if (fixtureRoutes.has(pathname)) {
      if (!fs.existsSync(fixturePath)) {
        send(response, 500, "text/plain; charset=utf-8", "Browser fixture is missing", headOnly);
        return;
      }
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff"
      });
      response.end(headOnly ? undefined : fs.readFileSync(fixturePath));
      return;
    }

    if (pathname === "/OpenAIPlatformTranslate.user.js") {
      let userscript;
      try {
        userscript = fs.readFileSync(userscriptPath, "utf8");
      } catch {
        send(response, 500, "text/plain; charset=utf-8", "Userscript bundle is missing", headOnly);
        return;
      }

      const settingCount = userscript.split(originSetting).length - 1;
      if (settingCount !== 1) {
        send(response, 500, "text/plain; charset=utf-8", "Expected one platform origin setting in the userscript bundle", headOnly);
        return;
      }
      const localOrigin = `http://127.0.0.1:${server.address().port}`;
      const fixtureUserscript = userscript.replace(originSetting, `origin: "${localOrigin}",`);
      send(response, 200, "text/javascript; charset=utf-8", fixtureUserscript, headOnly);
      return;
    }

    send(response, 404, "text/plain; charset=utf-8", "Not found", headOnly);
  });
}

const port = requestedPort();
const server = createServer();

server.on("error", (error) => {
  console.error(`Browser regression server failed: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  console.log(`Browser regression fixture: http://127.0.0.1:${address.port}/prompts/pmpt_test`);
  console.log(`Userscript bundle: http://127.0.0.1:${address.port}/OpenAIPlatformTranslate.user.js`);
});
