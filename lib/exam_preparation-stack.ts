import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AttributeType, BillingMode, Table, StreamViewType } from 'aws-cdk-lib/aws-dynamodb';
import { RestApi, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime, StartingPosition, FilterCriteria, FilterRule } from 'aws-cdk-lib/aws-lambda';
import { Topic, Subscription, SubscriptionProtocol } from 'aws-cdk-lib/aws-sns';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

export class ExamPreparationStack extends cdk.Stack
{
    constructor( scope: Construct, id: string, props?: cdk.StackProps )
    {
        super( scope, id, props );
        
        const errorTable: cdk.aws_dynamodb.Table = new Table( this, 'ErrorTable', {
            partitionKey: {
                name: 'id',
                type: AttributeType.STRING
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
            timeToLiveAttribute: 'TTL',
            stream: StreamViewType.NEW_AND_OLD_IMAGES
        });
        
        const errorTopic = new Topic( this, 'ErrorTopic', {
            topicName: 'ErrorTopic'
        });
        
        const processFunction: cdk.aws_lambda_nodejs.NodejsFunction = new NodejsFunction( this, 'processFunction', {
            runtime: Runtime.NODEJS_20_X,
            handler: 'handler',
            entry: `${__dirname}/../src/processFunction.ts`,
            environment: {
                TABLE_NAME: errorTable.tableName,
                TOPIC_ARN: errorTopic.topicArn
            }
        });
        
        const cleanupFunction: cdk.aws_lambda_nodejs.NodejsFunction = new NodejsFunction( this, 'cleanupFunction', {
            runtime: Runtime.NODEJS_20_X,
            handler: 'handler',
            entry: `${__dirname}/../src/cleanupFunction.ts`,
            environment: {
                TABLE_NAME: errorTable.tableName,
                TOPIC_ARN: errorTopic.topicArn
            }
        });
        
        errorTopic.grantPublish( processFunction );
        errorTopic.grantPublish( cleanupFunction );
        errorTable.grantReadWriteData( processFunction );
        errorTable.grantReadWriteData( cleanupFunction );
        
        const api: cdk.aws_apigateway.RestApi = new RestApi( this, 'ProcessorApi' );
        const resource: cdk.aws_apigateway.Resource = api.root.addResource( 'processJSON' );
        resource.addMethod( 'POST', new LambdaIntegration( processFunction ) );
        
        new Subscription( this, 'ErrorSubscription', {
            topic: errorTopic,
            protocol: SubscriptionProtocol.EMAIL,
            endpoint: 'i.atanasov77@gmail.com'
        });
        
        cleanupFunction.addEventSource( new DynamoEventSource( errorTable, {
            startingPosition: StartingPosition.LATEST,
            batchSize: 5,
            filters: [
                FilterCriteria.filter({
                    eventName: FilterRule.isEqual( 'REMOVE' ),
                })
            ]
        }));
        
        new cdk.CfnOutput( this, 'RestApiEndpoint', {
            value: `https://${api.restApiId}.execute-api.eu-central-1.amazonaws.com/prod/processJSON`
        });
    }
}
