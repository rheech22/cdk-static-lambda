import {
  APIGatewayEvent,
  APIGatewayProxyEventHeaders,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";

type CustomHeaders = APIGatewayProxyEventHeaders & {
  "X-Destination-Host": string;
  "X-Destination-Path": string;
  "X-Destination-Query"?: string;
};

const parseCustomHeaders = (headers: CustomHeaders) => {
  const {
    "X-Destination-Host": host,
    "X-Destination-Path": path,
    "X-Destination-Query": querystring,
  } = headers;
  return { host, path, querystring };
};

const parseURL = ({
  host,
  path,
  querystring,
}: {
  host: string;
  path: string;
  querystring?: string;
}): string => {
  const formattedHost = host.replace(/^(?!https?:\/\/)/i, "https://");
  const formattedPath = path.replace(/^(?!\/)/, "/");
  const formattedQuery = querystring ? `?${querystring}` : "";
  return `${formattedHost}${formattedPath}${formattedQuery}`;
};

const toJson = <T>(data: T) => JSON.stringify(data);

const parseResponse = async (
  response: Response
): Promise<APIGatewayProxyResult> => {
  const contentType =
    response.headers.get("Content-Type") || "application/json";
  let body: string;
  if (contentType.includes("application/json")) {
    const data = await response.json();
    body = toJson(data);
  } else {
    body = await response.text();
  }
  return {
    statusCode: response.status,
    headers: { "Content-Type": contentType },
    body,
  };
};

const routers: Record<
  string,
  (event: APIGatewayEvent) => Promise<APIGatewayProxyResult>
> = {
  ["/coupang"]: async (event: APIGatewayEvent) => {
    const { httpMethod: method, headers, body } = event;
    const authorization = headers.Authorization;
    if (!authorization) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: toJson({ error: `Lambda//Authorization Header is Required` }),
      };
    }
    if (!(headers["X-Destination-Host"] && headers["X-Destination-Path"])) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: toJson({
          error: `Lambda//X-Destination-Host and X-Destination-Path are Required`,
        }),
      };
    }
    const url = parseURL(parseCustomHeaders(headers as CustomHeaders));
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: authorization,
        "Content-Type": headers["Content-Type"] ?? "application/json",
      },
      ...(body && { body }),
    });
    return parseResponse(response);
  },
};

export const handler: Handler<APIGatewayEvent, APIGatewayProxyResult> = async (
  event
) => {
  try {
    const { httpMethod: method, headers, body } = event;
    const authorization = headers.Authorization;
    if (!authorization) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: toJson({ error: `Lambda//Authorization Header is Required` }),
      };
    }
    if (!(headers["X-Destination-Host"] && headers["X-Destination-Path"])) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: toJson({
          error: `Lambda//X-Destination-Host and X-Destination-Path are Required`,
        }),
      };
    }
    const url = parseURL(parseCustomHeaders(headers as CustomHeaders));
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: authorization,
        "Content-Type": headers["Content-Type"] ?? "application/json",
      },
      ...(body && { body }),
    });
    return parseResponse(response);
  } catch (e) {
    console.error("Error processing request:", e);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: toJson({ error: "Lambda//Internal Server Error" }),
    };
  }
};
