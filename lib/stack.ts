import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import { join } from "path";

export class StaticLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC 생성, 단일 AZ로 구성
    const vpc = new cdk.aws_ec2.Vpc(this, "Vpc", {
      natGateways: 0,
      maxAzs: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Public",
          subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // Lambda 함수를 위한 보안 그룹 생성
    const securityGroup = new cdk.aws_ec2.SecurityGroup(this, "SecurityGroup", {
      vpc,
    });

    // Lambda 함수 생성
    const lambdaResource = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "MyProxy",
      {
        vpc,
        allowPublicSubnet: true,
        vpcSubnets: { subnets: vpc.publicSubnets },
        securityGroups: [securityGroup],
        entry: join(__dirname, "../lambda/handler.ts"),
        handler: "handler",
        runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
      }
    );

    // 퍼블릭 서브넷 선택
    const subnet = vpc.publicSubnets[0];

    // Lambda 함수가 사용하는 네트워크 인터페이스를 조회하는 AWS Custom Resource 생성
    const customResource = new cdk.custom_resources.AwsCustomResource(
      subnet,
      "customResource",
      {
        onUpdate: {
          physicalResourceId: cdk.custom_resources.PhysicalResourceId.of(
            `${securityGroup.securityGroupId}-${subnet.subnetId}-CustomResource`
          ),
          service: "EC2",
          action: "describeNetworkInterfaces",
          parameters: {
            Filters: [
              { Name: "interface-type", Values: ["lambda"] },
              { Name: "group-id", Values: [securityGroup.securityGroupId] },
              { Name: "subnet-id", Values: [subnet.subnetId] },
            ],
          },
        },
        policy: cdk.custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
          resources: cdk.custom_resources.AwsCustomResourcePolicy.ANY_RESOURCE,
        }),
      }
    );

    // Lambda 함수가 사용하는 네트워크 인터페이스에 의존성 추가
    customResource.node.addDependency(lambdaResource);

    // Elastic IP 생성
    const elasticIP = new cdk.aws_ec2.CfnEIP(subnet, "EIP", {
      domain: "vpc",
    });

    // Elastic IP를 Lambda 함수가 사용하는 네트워크 인터페이스에 연결
    new cdk.aws_ec2.CfnEIPAssociation(subnet, "EIPAssociation", {
      networkInterfaceId: customResource.getResponseField(
        "NetworkInterfaces.0.NetworkInterfaceId"
      ),
      allocationId: elasticIP.attrAllocationId,
    });

    // Elastic IP 출력
    new cdk.CfnOutput(subnet, "ElasticIP", {
      value: elasticIP.attrPublicIp,
    });

    // Lambda 함수를 주기적으로 실행하기 위한 CloudWatch Events Rule 생성
    new cdk.aws_events.Rule(this, "LambdaCronJobEventRule", {
      schedule: cdk.aws_events.Schedule.cron({
        minute: "0",
        hour: "10",
        weekDay: "SUN,WED",
      }),
      targets: [new cdk.aws_events_targets.LambdaFunction(lambdaResource)],
    });

    // API Gateway 생성
    const api = new apigateway.LambdaRestApi(this, "MyProxyApi", {
      handler: lambdaResource,
      // proxy: true일 경우 / 경로로 모든 요청을 Lambda로 전달함
      // 필요에 따라 proxy 옵션을 false로 두고 경로와 메서드를 명확히 정의할 수도 있다.
      proxy: true,
    });

    // API Gateway의 엔드포인트 URL 출력
    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: api.url,
    });
  }
}
