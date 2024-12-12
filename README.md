# CDK Template of Lambda with Static IP

This template demonstrates how to create an AWS Lambda function with a static IP address using AWS CDK. This project was inspired by the blog post [Deploy a Lambda with a static IP for FREE](https://dev.to/slsbytheodo/deploy-a-lambda-with-a-static-ip-for-free-4e0l).

## Project Structure

- `bin/cdk-static-lambda.ts`: Entry point for the CDK application.
- `lib/stack.ts`: Defines the CDK stack, including the VPC, security group, Lambda function, and API Gateway.
- `lambda/handler.ts`: Lambda function handler code.
- `cdk.json`: Configuration file for the CDK project.
- `jest.config.js`: Configuration file for Jest.
- `tsconfig.json`: TypeScript configuration file.
- `.gitignore`: Specifies files to be ignored by Git.
- `.npmignore`: Specifies files to be ignored by npm.

## Useful Commands

- `npm run build`: Compile TypeScript to JavaScript.
- `npm run watch`: Watch for changes and compile.
- `npm run test`: Run the Jest unit tests.
- `npx cdk deploy`: Deploy this stack to your default AWS account/region.
- `npx cdk diff`: Compare deployed stack with current state.
- `npx cdk synth`: Emit the synthesized CloudFormation template.

## Lambda Function

The Lambda function is defined in [`lambda/handler.ts`](lambda/handler.ts). It just fetches the public IP address using the `ipify` API and returns it in the response for test.

## CDK Stack

The CDK stack is defined in [`lib/stack.ts`](lib/stack.ts). It includes the following resources:

- **VPC**: A Virtual Private Cloud with a single public subnet.
- **Security Group**: A security group for the Lambda function.
- **Lambda Function**: A Node.js Lambda function with a static IP address.
- **API Gateway**: An API Gateway to expose the Lambda function.

## Deployment

```sh
npm run build

npx cdk synth

npx cdk deploy
```
