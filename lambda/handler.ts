import { APIGatewayEvent, Handler } from "aws-lambda";

export const handler: Handler<APIGatewayEvent> = async (event, context) => {
  const ip = await fetch("https://api.ipify.org?format=json").then((res) =>
    res.json()
  );

  console.log({ event });
  console.log({ context });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ip),
  };
};
